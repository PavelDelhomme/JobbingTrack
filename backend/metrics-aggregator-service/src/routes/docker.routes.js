const express = require('express');
const axios = require('axios');
const router = express.Router();
const dockerService = require('../services/docker.service');
const metricsHistory = require('../services/metricsHistory.service');
const lokiService = require('../services/loki.service');

const SERVICE_HEALTH_CONFIG = {
  'jobbingtrack-auth-service': { port: 8001, path: '/api/v1/auth/health' },
  'jobbingtrack-application-service': { port: 8002, path: '/api/v1/applications/health' },
  'jobbingtrack-company-service': { port: 8003, path: '/api/v1/companies/health' },
  'jobbingtrack-contact-service': { port: 8004, path: '/api/v1/contacts/health' },
  'jobbingtrack-interview-service': { port: 8005, path: '/api/v1/interviews/health' },
  'jobbingtrack-call-service': { port: 8006, path: '/api/v1/calls/health' },
  'jobbingtrack-event-service': { port: 8007, path: '/api/v1/events/health' },
  'jobbingtrack-followup-service': { port: 8008, path: '/api/v1/followups/health' },
  'jobbingtrack-profile-service': { port: 8009, path: '/api/v1/profile/health' },
  'jobbingtrack-notification-service': { port: 8010, path: '/api/v1/notifications/health' },
  'jobbingtrack-workflow-service': { port: 8011, path: '/api/v1/workflow/health' },
  'jobbingtrack-dashboard-service': { port: 8012, path: '/api/v1/dashboard/health' },
  'jobbingtrack-frontend': { port: 8080, path: '/' },
  'jobbingtrack-api-gateway': { port: 3000, path: '/api/v1/health' }
};

const FIVE_MINUTES_IN_MINUTES = 5;

function normaliseServiceKey(containerName = '') {
  if (!containerName) return null;
  const variants = new Set([
    containerName,
    containerName.replace(/-prod$/, ''),
    containerName.replace(/-preview$/, ''),
    containerName.replace(/-staging$/, ''),
    containerName.replace(/(-prod|-preview|-staging)?-[0-9]+$/, ''),
    containerName.replace(/_[0-9]+$/, '')
  ]);

  for (const variant of variants) {
    if (SERVICE_HEALTH_CONFIG[variant]) {
      return variant;
    }
  }

  return null;
}

/**
 * Détermine le statut de santé d'un service avec plusieurs indicateurs
 * @param {string} containerName - Nom du conteneur
 * @param {object} containerStats - Statistiques du conteneur (optionnel)
 * @returns {Promise<{status: string, responseTime: number|null, error: string}>}
 */
async function probeServiceHealth(containerName, containerStats = null) {
  const key = normaliseServiceKey(containerName);
  
  // Si le conteneur a des stats valides, il est au moins "running"
  const containerIsRunning = containerStats && 
    typeof containerStats.cpu_percent === 'number' && 
    containerStats.pids > 0;

  // Essayer le probe HTTP si la config existe
  if (key && SERVICE_HEALTH_CONFIG[key]) {
  const config = SERVICE_HEALTH_CONFIG[key];
  const url = `http://localhost:${config.port}${config.path}`;

  const startTime = Date.now();
  try {
      const response = await axios.get(url, { 
        timeout: config.timeout || 3000,
        validateStatus: (status) => status < 500
      });
      
      const responseTime = Date.now() - startTime;
      
      // Statut basé sur le code HTTP et les métriques
      if (response.status >= 200 && response.status < 300) {
        return { status: 'healthy', responseTime };
      } else if (response.status >= 400 && response.status < 500) {
        // Service répond mais avec des erreurs client
        return { 
          status: 'degraded', 
          responseTime,
          error: `HTTP ${response.status}`
        };
      } else {
    return {
          status: 'degraded', 
          responseTime,
          error: `HTTP ${response.status}`
    };
      }
  } catch (error) {
    const duration = Date.now() - startTime;
      
      // Si le conteneur tourne mais le probe HTTP échoue
      if (containerIsRunning) {
        // Timeout ou erreur réseau = degraded (le service tourne mais ne répond pas bien)
        if (error?.code === 'ETIMEDOUT' || error?.code === 'ENOTFOUND') {
          return {
            status: 'degraded',
            responseTime: duration,
            error: 'Service timeout ou inaccessible'
          };
        }
        // Connection refusée = le conteneur tourne mais le service n'écoute pas sur ce port
        if (error?.code === 'ECONNREFUSED') {
          return {
            status: 'degraded',
            responseTime: duration,
            error: 'Port inaccessible mais conteneur actif'
          };
        }
        // Autre erreur mais le conteneur tourne = degraded
        return {
          status: 'degraded',
          responseTime: duration,
          error: error?.message || 'Erreur inconnue'
        };
      }
      
      // Si le conteneur ne tourne pas ou pas de stats
    const status = error?.code === 'ECONNREFUSED' ? 'offline' : 'degraded';
    return {
      status,
      responseTime: duration,
        error: error?.message || 'Service inaccessible'
      };
    }
  }

  // Pas de config HTTP, utiliser les stats du conteneur comme indicateur
  if (containerIsRunning) {
    // Le conteneur tourne avec des métriques valides
    // Considérer comme "healthy" si CPU < 95% et pas de surcharge évidente
    const cpuPercent = containerStats.cpu_percent || 0;
    const memoryPercent = containerStats.memory_percent || 0;
    
    if (cpuPercent > 95 || memoryPercent > 95) {
      return {
        status: 'degraded',
        responseTime: null,
        error: 'Utilisation ressources très élevée'
    };
  }
    
    // Conteneur actif avec des métriques normales
    return {
      status: 'healthy',
      responseTime: null,
      error: null
    };
  }

  // Aucune info disponible
  return {
    status: 'unknown',
    responseTime: null,
    error: 'Aucune métrique disponible pour ce service'
  };
}

function parseLokiCount(result) {
  if (!result) return 0;
  if (Array.isArray(result) && result.length > 0) {
    const entry = result[0];
    if (entry?.value && Array.isArray(entry.value) && entry.value.length >= 2) {
      const value = parseFloat(entry.value[1]);
      return Number.isFinite(value) ? value : 0;
    }
  }
  if (typeof result === 'number') return result;
  return 0;
}

// ✅ Cache pour les métriques d'erreur Loki (éviter rate limiting 429)
const errorMetricsCache = new Map();
const ERROR_METRICS_CACHE_TTL = 30000; // 30 secondes

async function collectErrorMetrics(containerName) {
  // Vérifier le cache
  const cached = errorMetricsCache.get(containerName);
  if (cached && (Date.now() - cached.timestamp) < ERROR_METRICS_CACHE_TTL) {
    return cached.data;
  }

  try {
    const countResponse = await lokiService.countPattern(containerName, 'error|ERROR|Error', '5m');
    const count = parseLokiCount(countResponse?.count);
    const result = {
      count5m: count,
      ratePerMinute: count / FIVE_MINUTES_IN_MINUTES
    };
    
    // Mettre en cache
    errorMetricsCache.set(containerName, {
      data: result,
      timestamp: Date.now()
    });
    
    return result;
  } catch (error) {
    // En cas d'erreur, retourner les données en cache si disponibles
    if (cached) {
      console.log(`[DOCKER ROUTES] Utilisation cache pour ${containerName} suite à erreur Loki`);
      return cached.data;
    }
    
    console.error(`[DOCKER ROUTES] Erreur récupération erreurs pour ${containerName}:`, error.message);
    return {
      count5m: 0,
      ratePerMinute: 0
    };
  }
}

/**
 * Endpoint pour récupérer les métriques agrégées de l'ensemble de la stack JobbingTrack
 * Retourne CPU et mémoire totaux/moyens directement depuis Docker
 */
router.get('/jobbingtrack/aggregated', async (req, res) => {
  try {
    console.log('[DOCKER ROUTES] 📊 Récupération des métriques agrégées...');
    
    // Récupérer les stats de tous les conteneurs
    const allStats = await dockerService.getAllContainersStats();
    
    // Filtrer uniquement les conteneurs JobbingTrack (exclure monitoring: grafana, prometheus, loki, etc.)
    const jobbingtrackContainers = allStats.filter(stat => 
      stat.name.startsWith('jobbingtrack-') && 
      !stat.name.includes('grafana') && 
      !stat.name.includes('prometheus') && 
      !stat.name.includes('loki') && 
      !stat.name.includes('promtail') &&
      !stat.name.includes('cadvisor') &&
      !stat.name.includes('node-exporter')
    );
    
    if (jobbingtrackContainers.length === 0) {
      return res.json({
        success: true,
        timestamp: new Date().toISOString(),
        containers_count: 0,
        cpu_percent: 0,
        cpu_percent_per_core: 0,
        memory_percent: 0,
        memory_usage_mb: 0,
        memory_limit_mb: 0,
        total_cpus: 0,
        load_average: 0,
        disk: [],
        message: 'Aucun conteneur JobbingTrack trouvé'
      });
    }
    
    // Récupérer les informations système
    const systemInfo = await dockerService.getSystemInfo().catch(err => {
      console.error('[DOCKER ROUTES] Erreur getSystemInfo:', err);
      return { cpus: 1, memory_total: 8117313536 }; // Valeur par défaut si erreur
    });
    
    const totalCpus = systemInfo.cpus || 1;
    const systemMemoryTotal = systemInfo.memory_total || 8117313536; // en bytes (défaut: 7.56 GB)
    
    console.log('[DOCKER ROUTES] System Info:', {
      cpus: totalCpus,
      memory_total_bytes: systemMemoryTotal,
      memory_total_gb: (systemMemoryTotal / (1024 * 1024 * 1024)).toFixed(2)
    });
    
    // Calculer les totaux et moyennes
    const totalCpuPercent = jobbingtrackContainers.reduce((sum, stat) => sum + stat.cpu_percent, 0);
    const totalMemoryUsage = jobbingtrackContainers.reduce((sum, stat) => sum + stat.memory_usage, 0);
    
    // Calculer le pourcentage de mémoire par rapport à la mémoire SYSTÈME (pas les limites des conteneurs)
    const memoryPercentOfSystem = systemMemoryTotal > 0 ? 
      (totalMemoryUsage / systemMemoryTotal) * 100 : 0;
    
    // Calculer le CPU par core (charge réelle)
    const cpuPerCore = totalCpuPercent / totalCpus;
    
    // Calculer la charge (load average approximée)
    const loadAverage = (totalCpuPercent / 100).toFixed(2);
    
    // Récupérer les stats disque (via Docker)
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    let diskStats = [];
    try {
      const { stdout } = await execAsync('df -h / /var/lib/docker 2>/dev/null | tail -n +2');
      const lines = stdout.trim().split('\n');
      diskStats = lines.map(line => {
        const parts = line.split(/\s+/);
        return {
          mount: parts[5] || '/',
          total: parts[1] || 'N/A',
          used: parts[2] || 'N/A',
          available: parts[3] || 'N/A',
          usage_percent: parseFloat(parts[4]?.replace('%', '') || '0')
        };
      });
    } catch (err) {
      console.error('[DOCKER ROUTES] Erreur récupération disque:', err.message);
    }
    
    const serviceInsights = await Promise.all(jobbingtrackContainers.map(async stat => {
      const serviceType = stat.name.replace(/^jobbingtrack-/, '');
      // Passer les stats du conteneur pour une détermination plus intelligente du statut
      const healthInfo = await probeServiceHealth(stat.name, stat);
      const errorMetrics = await collectErrorMetrics(stat.name);

      const memoryUsageMb = parseFloat((stat.memory_usage / (1024 * 1024)).toFixed(2));
      const memoryLimitMb = parseFloat((stat.memory_limit / (1024 * 1024)).toFixed(2));
      const networkRxMb = parseFloat((stat.network_rx / (1024 * 1024)).toFixed(2));
      const networkTxMb = parseFloat((stat.network_tx / (1024 * 1024)).toFixed(2));

      return {
        name: stat.name,
        service_type: serviceType,
        cpu_percent: parseFloat(stat.cpu_percent.toFixed(2)),
        memory_percent: parseFloat(stat.memory_percent.toFixed(2)),
        memory_usage_mb: memoryUsageMb,
        memory_limit_mb: memoryLimitMb,
        network_rx_mb: networkRxMb,
        network_tx_mb: networkTxMb,
        pids: stat.pids,
        health_status: healthInfo.status,
        response_time_ms: typeof healthInfo.responseTime === 'number' ? parseFloat(healthInfo.responseTime.toFixed(2)) : null,
        health_error: healthInfo.error || null,
        error_count_5m: parseFloat(errorMetrics.count5m.toFixed(2)),
        error_rate_per_min: parseFloat(errorMetrics.ratePerMinute.toFixed(2))
      };
    }));

    const totalNetworkRxMb = serviceInsights.reduce((sum, svc) => sum + (Number.isFinite(svc.network_rx_mb) ? svc.network_rx_mb : 0), 0);
    const totalNetworkTxMb = serviceInsights.reduce((sum, svc) => sum + (Number.isFinite(svc.network_tx_mb) ? svc.network_tx_mb : 0), 0);

    const responseTimes = serviceInsights
      .filter(svc => Number.isFinite(svc.response_time_ms))
      .map(svc => svc.response_time_ms);

    const averageResponseTime = responseTimes.length > 0
      ? parseFloat((responseTimes.reduce((acc, value) => acc + value, 0) / responseTimes.length).toFixed(2))
      : null;

    const fastestResponseTime = responseTimes.length > 0 ? Math.min(...responseTimes) : null;
    const slowestResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : null;

    const totalErrorCount5m = parseFloat(serviceInsights
      .reduce((sum, svc) => sum + (Number.isFinite(svc.error_count_5m) ? svc.error_count_5m : 0), 0)
      .toFixed(2));

    const totalErrorRatePerMin = parseFloat(serviceInsights
      .reduce((sum, svc) => sum + (Number.isFinite(svc.error_rate_per_min) ? svc.error_rate_per_min : 0), 0)
      .toFixed(2));

    const healthyServices = serviceInsights.filter(svc => svc.health_status === 'healthy').length;
    const degradedServices = serviceInsights.filter(svc => svc.health_status === 'degraded').length;
    const offlineServices = serviceInsights.filter(svc => svc.health_status === 'offline').length;

    const projectAvailabilityPercent = jobbingtrackContainers.length > 0
      ? parseFloat(((healthyServices / jobbingtrackContainers.length) * 100).toFixed(2))
      : 0;

    const systemAvailabilityPercent = systemInfo?.containers > 0
      ? parseFloat(((systemInfo.containers_running / systemInfo.containers) * 100).toFixed(2))
      : null;

    const overallLoadScore = parseFloat((((cpuPerCore / 100) + (memoryPercentOfSystem / 100)) / 2).toFixed(3));

    const servicesSummary = serviceInsights.map(service => ({
      name: service.name,
      status: service.health_status,
      metrics: {
        cpu_percent: service.cpu_percent,
        memory_percent: service.memory_percent,
        memory_usage_mb: service.memory_usage_mb,
        memory_limit_mb: service.memory_limit_mb,
        network_rx_mb: service.network_rx_mb,
        network_tx_mb: service.network_tx_mb
      },
      response_time_ms: service.response_time_ms,
      error_rate_per_min: service.error_rate_per_min,
      error_count_5m: service.error_count_5m
    }));

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      containers_count: jobbingtrackContainers.length,

      // Métriques CPU
      cpu_percent: parseFloat(totalCpuPercent.toFixed(2)),
      cpu_percent_per_core: parseFloat(cpuPerCore.toFixed(2)),
      cpu_containers_only: parseFloat(totalCpuPercent.toFixed(2)),

      // Métriques mémoire
      memory_percent: parseFloat(memoryPercentOfSystem.toFixed(2)),
      memory_usage_mb: parseFloat((totalMemoryUsage / (1024 * 1024)).toFixed(2)),
      memory_usage_gb: parseFloat((totalMemoryUsage / (1024 * 1024 * 1024)).toFixed(2)),
      memory_system_total_mb: parseFloat((systemMemoryTotal / (1024 * 1024)).toFixed(2)),
      memory_system_total_gb: parseFloat((systemMemoryTotal / (1024 * 1024 * 1024)).toFixed(2)),

      // Charge système
      load_average: parseFloat(loadAverage),
      overall_load_score: overallLoadScore,

      // Disque
      disk: diskStats,

      // Informations système
      total_cpus: totalCpus,
      system_memory_total_gb: systemInfo.memory_total ? parseFloat((systemInfo.memory_total / (1024 * 1024 * 1024)).toFixed(2)) : 0,

      // ✅ Informations système Docker complètes
      system: {
        server_version: systemInfo.server_version || 'N/A',
        operating_system: systemInfo.operating_system || 'N/A',
        os_type: systemInfo.os_type || 'linux',
        architecture: systemInfo.architecture || 'N/A',
        kernel_version: systemInfo.kernel_version || 'N/A',
        cpus: totalCpus,
        memory_total: parseFloat((systemMemoryTotal / (1024 * 1024 * 1024)).toFixed(2)) + ' GB',
        docker_root_dir: systemInfo.docker_root_dir || '/var/lib/docker',
        driver: systemInfo.driver || 'overlay2',
        containers_total: systemInfo.containers || jobbingtrackContainers.length,
        containers_running: systemInfo.containers_running || healthyServices,
        containers_paused: systemInfo.containers_paused || 0,
        containers_stopped: systemInfo.containers_stopped || 0,
        images: systemInfo.images || 0
      },

      // Détails enrichis
      containers: serviceInsights,
      services: servicesSummary,

      // Réseau
      network: {
        total_rx_mb: parseFloat(totalNetworkRxMb.toFixed(2)),
        total_tx_mb: parseFloat(totalNetworkTxMb.toFixed(2)),
        per_service: serviceInsights.map(service => ({
          name: service.name,
          rx_mb: service.network_rx_mb,
          tx_mb: service.network_tx_mb
        }))
      },

      // Temps de réponse
      response_time: {
        average_ms: averageResponseTime,
        fastest_ms: fastestResponseTime,
        slowest_ms: slowestResponseTime,
        per_service: serviceInsights.map(service => ({
          name: service.name,
          status: service.health_status,
          response_time_ms: service.response_time_ms
        }))
      },

      // Erreurs
      errors: {
        total_last_5m: totalErrorCount5m,
        rate_per_min: totalErrorRatePerMin,
        per_service: serviceInsights.map(service => ({
          name: service.name,
          count_last_5m: service.error_count_5m,
          rate_per_min: service.error_rate_per_min
        }))
      },

      // Santé
      health: {
        availability_percent: projectAvailabilityPercent,
        system_availability_percent: systemAvailabilityPercent,
        healthy: healthyServices,
        degraded: degradedServices,
        offline: offlineServices,
        containers_running: systemInfo.containers_running || healthyServices,
        containers_total: systemInfo.containers || jobbingtrackContainers.length
      }
    };

    console.log('[DOCKER ROUTES] ✅ Métriques récupérées:', {
      containers: response.containers_count,
      cpu_total: response.cpu_percent + '%',
      cpu_per_core: response.cpu_percent_per_core + '%',
      memory: response.memory_percent + '%',
      load: response.load_average,
      availability: response.health.availability_percent + '%',
      network_rx_mb: response.network.total_rx_mb,
      network_tx_mb: response.network.total_tx_mb,
      errors_last_5m: response.errors.total_last_5m
    });

    metricsHistory.saveSnapshot(response).catch(err => {
      console.error('[DOCKER ROUTES] Erreur sauvegarde historique:', err.message);
    });

    res.json(response);
    
  } catch (error) {
    console.error('[DOCKER ROUTES] ❌ Erreur:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Endpoint pour lister tous les services (démarrés + arrêtés)
 */
router.get('/services/all', async (req, res) => {
  try {
    console.log('[DOCKER ROUTES] 📋 Récupération de tous les services...');
    
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    // Lister TOUS les conteneurs (même arrêtés)
    const { stdout } = await execAsync('docker ps -a --filter "name=jobbingtrack" --format "{{json .}}"');
    const allContainers = stdout.trim().split('\n')
      .filter(line => line.length > 0)
      .map(line => JSON.parse(line));
    
    // Récupérer les stats uniquement pour les conteneurs en cours d'exécution
    const runningStats = await dockerService.getAllContainersStats();
    const statsMap = {};
    runningStats.forEach(stat => {
      statsMap[stat.name] = stat;
    });
    
    // Mapper tous les conteneurs avec leurs stats
    const services = allContainers.map(container => {
      const name = container.Names;
      const isRunning = container.State === 'running';
      const stats = statsMap[name];
      
      return {
        name: name,
        status: container.State,
        is_running: isRunning,
        created: container.CreatedAt,
        ports: container.Ports,
        image: container.Image,
        metrics: isRunning && stats ? {
          cpu_percent: stats.cpu_percent,
          memory_percent: stats.memory_percent,
          memory_usage_mb: parseFloat((stats.memory_usage / (1024 * 1024)).toFixed(2)),
          pids: stats.pids
        } : null
      };
    });
    
    // Séparer les services en catégories
    const running = services.filter(s => s.is_running);
    const stopped = services.filter(s => !s.is_running);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      total: services.length,
      running: running.length,
      stopped: stopped.length,
      services: services
    });
    
  } catch (error) {
    console.error('[DOCKER ROUTES] ❌ Erreur:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Endpoint pour récupérer les métriques d'un service spécifique
 */
router.get('/service/:name', async (req, res) => {
  try {
    const serviceName = req.params.name;
    console.log('[DOCKER ROUTES] 📊 Métriques pour:', serviceName);
    
    const stats = await dockerService.getContainerStats(serviceName);
    
    // Passer les stats du conteneur pour une détermination plus intelligente du statut
    const healthInfo = await probeServiceHealth(serviceName, stats);
    const errorMetrics = await collectErrorMetrics(serviceName);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      service: {
        name: serviceName,
        cpu_percent: stats.cpu_percent,
        memory_percent: stats.memory_percent,
        memory_usage_mb: parseFloat((stats.memory_usage / (1024 * 1024)).toFixed(2)),
        memory_limit_mb: parseFloat((stats.memory_limit / (1024 * 1024)).toFixed(2)),
        network_rx_mb: parseFloat((stats.network_rx / (1024 * 1024)).toFixed(2)),
        network_tx_mb: parseFloat((stats.network_tx / (1024 * 1024)).toFixed(2)),
        pids: stats.pids,
        health: healthInfo.status,
        response_time_ms: typeof healthInfo.responseTime === 'number' ? parseFloat(healthInfo.responseTime.toFixed(2)) : null,
        health_error: healthInfo.error || null,
        errors: {
          count_last_5m: parseFloat(errorMetrics.count5m.toFixed(2)),
          rate_per_min: parseFloat(errorMetrics.ratePerMinute.toFixed(2))
        }
      }
    });
    
  } catch (error) {
    console.error('[DOCKER ROUTES] ❌ Erreur:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Endpoint pour récupérer l'historique d'un service spécifique
 */
router.get('/service/:name/history', async (req, res) => {
  try {
    const serviceName = req.params.name.replace('jobbingtrack-', '');
    const { 
      startTime = Date.now() - 3600000,
      endTime = Date.now(),
      limit = 100
    } = req.query;
    
    const history = await metricsHistory.getServiceHistory(serviceName, {
      startTime: parseInt(startTime),
      endTime: parseInt(endTime),
      limit: parseInt(limit)
    });
    
    res.json({
      success: true,
      service: serviceName,
      count: history.length,
      data: history,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[DOCKER ROUTES] ❌ Erreur:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Endpoint pour récupérer l'historique des métriques globales
 */
router.get('/history', async (req, res) => {
  try {
    const { 
      startTime = Date.now() - 3600000, // 1 heure par défaut
      endTime = Date.now(),
      limit = 100
    } = req.query;
    
    const history = await metricsHistory.getHistory({
      startTime: parseInt(startTime),
      endTime: parseInt(endTime),
      limit: parseInt(limit)
    });
    
    res.json({
      success: true,
      count: history.length,
      data: history,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[DOCKER ROUTES] ❌ Erreur:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Endpoint pour récupérer les statistiques sur une période
 */
router.get('/stats', async (req, res) => {
  try {
    const { 
      startTime = Date.now() - 3600000,
      endTime = Date.now()
    } = req.query;
    
    const stats = await metricsHistory.getStats({
      startTime: parseInt(startTime),
      endTime: parseInt(endTime)
    });
    
    res.json({
      success: true,
      stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[DOCKER ROUTES] ❌ Erreur:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Endpoint simple pour tester la connectivité
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Docker routes OK',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;


