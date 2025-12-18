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
  'jobbingtrack-deployment-service': { port: 8016, path: '/health' },
  'jobbingtrack-security-service': { port: 8017, path: '/health' },
  'jobbingtrack-metrics-aggregator': { port: 8014, path: '/api/v1/health' },
  'jobbingtrack-frontend': { port: 8080, path: '/' },
  'jobbingtrack-api-gateway': { port: 3000, path: '/api/v1/health' }
  // Note: PostgreSQL et Redis n'ont pas d'endpoint HTTP /health
  // Leurs statuts sont récupérés via Docker health checks natifs
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
    
    // ✅ OPTIMISATION : Récupérer uniquement l'espace disque utilisé par Docker (conteneurs)
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    let diskStats = [];
    try {
      // ✅ Récupérer uniquement l'espace disque Docker (conteneurs, images, volumes)
      const { stdout: dockerDf } = await execAsync('docker system df --format "{{.Type}}|{{.Size}}" 2>/dev/null');
      const dockerLines = dockerDf.trim().split('\n');
      
      let totalDockerSize = 0; // en bytes
      let totalDockerSizeGB = 0;
      
      // Parser la sortie de docker system df
      dockerLines.forEach(line => {
        const [type, size] = line.split('|');
        if (size) {
          // Convertir la taille (ex: "1.2GB", "500MB") en bytes
          const sizeMatch = size.match(/([\d.]+)([KMGT]?B)/);
          if (sizeMatch) {
            const value = parseFloat(sizeMatch[1]);
            const unit = sizeMatch[2];
            let bytes = 0;
            
            switch(unit) {
              case 'TB': bytes = value * 1024 * 1024 * 1024 * 1024; break;
              case 'GB': bytes = value * 1024 * 1024 * 1024; break;
              case 'MB': bytes = value * 1024 * 1024; break;
              case 'KB': bytes = value * 1024; break;
              case 'B': bytes = value; break;
            }
            
            totalDockerSize += bytes;
          }
        }
      });
      
      totalDockerSizeGB = totalDockerSize / (1024 * 1024 * 1024);
      
      // ✅ Récupérer aussi l'espace total disponible pour Docker
      const { stdout: dockerInfo } = await execAsync('df -h /var/lib/docker 2>/dev/null | tail -n +2');
      const dockerInfoParts = dockerInfo.trim().split(/\s+/);
      
      if (dockerInfoParts.length >= 5) {
        const dockerTotal = dockerInfoParts[1]; // ex: "100G"
        const dockerUsed = dockerInfoParts[2];  // ex: "50G"
        const dockerAvailable = dockerInfoParts[3]; // ex: "45G"
        const dockerPercent = parseFloat(dockerInfoParts[4]?.replace('%', '') || '0');
        
        diskStats = [{
          mount: '/var/lib/docker',
          type: 'docker',
          total: dockerTotal,
          used: dockerUsed,
          available: dockerAvailable,
          usage_percent: dockerPercent,
          // Format pour affichage
          total_gb: parseFloat(dockerTotal.replace(/[^0-9.]/g, '')) || 0,
          used_gb: parseFloat(dockerUsed.replace(/[^0-9.]/g, '')) || 0,
          available_gb: parseFloat(dockerAvailable.replace(/[^0-9.]/g, '')) || 0,
          // Taille totale des conteneurs/images/volumes Docker
          containers_size_gb: totalDockerSizeGB
        }];
      } else {
        // Fallback : utiliser docker system df pour avoir au moins la taille des conteneurs
        diskStats = [{
          mount: '/var/lib/docker',
          type: 'docker',
          total: 'N/A',
          used: `${totalDockerSizeGB.toFixed(2)} GB`,
          available: 'N/A',
          usage_percent: 0,
          containers_size_gb: totalDockerSizeGB
        }];
      }
    } catch (err) {
      console.error('[DOCKER ROUTES] Erreur récupération disque Docker:', err.message);
      // Fallback : tableau vide
      diskStats = [];
    }
    
    // ✅ Ajouter les métriques de disque Docker dans la réponse
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      containers_count: jobbingtrackContainers.length,
      cpu_percent: Math.round(totalCpuPercent * 10) / 10,
      cpu_percent_per_core: Math.round(cpuPerCore * 10) / 10,
      cpu_average_percent: jobbingtrackContainers.length > 0 ? Math.round((totalCpuPercent / jobbingtrackContainers.length) * 10) / 10 : 0,
      memory_percent: Math.round(memoryPercentOfSystem * 10) / 10,
      memory_usage_mb: Math.round(totalMemoryUsage / (1024 * 1024)),
      memory_limit_mb: Math.round(systemMemoryTotal / (1024 * 1024)),
      total_cpus: totalCpus,
      load_average: parseFloat(loadAverage),
      disk: diskStats
    };
    
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
    
    // Lister TOUS les conteneurs (même arrêtés), mais exclure MailHog et les services optionnels
    const { stdout } = await execAsync('docker ps -a --filter "name=jobbingtrack" --format "{{json .}}"');
    const allContainers = stdout.trim().split('\n')
      .filter(line => line.length > 0)
      .map(line => JSON.parse(line))
      // Exclure MailHog et les services optionnels
      .filter(container => {
        const name = container.Names;
        // Exclure MailHog (insensible à la casse)
        if (name.toLowerCase().includes('mailhog')) {
          return false;
        }
        // Exclure les services optionnels (chercher avec ou sans préfixe jobbingtrack-)
        const optionalServices = [
          'workflow-service',
          'notification-service',
          'deployment-service',
          'profile-service',
          'event-service',
          'security-service'
        ];
        // Vérifier si le nom du conteneur contient un des services optionnels
        return !optionalServices.some(service => {
          return name === `jobbingtrack-${service}` || name === service || name.includes(service);
        });
      });
    
    // Récupérer les stats uniquement pour les conteneurs en cours d'exécution
    const runningStats = await dockerService.getAllContainersStats();
    const statsMap = {};
    runningStats.forEach(stat => {
      statsMap[stat.name] = stat;
    });
    
    // Récupérer le health status et l'état réel pour tous les conteneurs
    const healthStatusMap = {};
    const containerStateMap = {}; // Map pour stocker l'état réel des conteneurs
    for (const container of allContainers) {
      try {
        const containerName = container.Names;
        const { stdout: inspectOut } = await execAsync(`docker inspect --format='{{json .State}}' ${containerName}`);
        const state = JSON.parse(inspectOut);
        
        // Déterminer le health status
        let healthStatus = 'none'; // Pas de healthcheck configuré
        if (state.Health) {
          healthStatus = state.Health.Status; // healthy, unhealthy, starting
        }
        
        // Utiliser state.Running qui est plus fiable que container.State
        const isActuallyRunning = state.Running === true;
        
        healthStatusMap[containerName] = {
          health: healthStatus,
          running: isActuallyRunning,
          status: state.Status
        };
        
        // Stocker l'état réel du conteneur
        containerStateMap[containerName] = {
          isRunning: isActuallyRunning,
          status: state.Status,
          state: state
        };
      } catch (err) {
        console.error(`[DOCKER ROUTES] Erreur inspection ${container.Names}:`, err.message);
        // Fallback : utiliser container.State mais c'est moins fiable
        const isRunning = container.State === 'running';
        healthStatusMap[container.Names] = {
          health: 'unknown',
          running: isRunning,
          status: container.State
        };
        containerStateMap[container.Names] = {
          isRunning: isRunning,
          status: container.State,
          state: null
        };
      }
    }
    
    // ✅ Effectuer les HTTP health checks en PARALLÈLE pour tous les services
    const healthChecks = await Promise.allSettled(
      allContainers.map(async (container) => {
        const name = container.Names;
        // Utiliser l'état réel du conteneur depuis containerStateMap
        const containerState = containerStateMap[name] || { isRunning: container.State === 'running' };
        const isRunning = containerState.isRunning;
        const stats = statsMap[name];
        
        // Faire le health check HTTP uniquement si le service est vraiment en cours d'exécution
        if (isRunning) {
          try {
            const healthInfo = await probeServiceHealth(name, stats);
            return { name, healthInfo };
          } catch (error) {
            return { name, healthInfo: { status: 'unknown', responseTime: null, error: error.message } };
          }
        }
        return { name, healthInfo: { status: 'offline', responseTime: null, error: 'Service arrêté' } };
      })
    );
    
    // Créer un map des résultats de health checks
    const httpHealthMap = {};
    healthChecks.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        httpHealthMap[result.value.name] = result.value.healthInfo;
      }
    });
    
    // Mapper tous les conteneurs avec leurs stats, health status Docker ET HTTP
    const services = allContainers.map(container => {
      const name = container.Names;
      // Utiliser l'état réel du conteneur depuis containerStateMap
      const containerState = containerStateMap[name] || { isRunning: container.State === 'running', status: container.State };
      const isRunning = containerState.isRunning;
      const actualStatus = containerState.status || container.State;
      const stats = statsMap[name];
      const dockerHealthInfo = healthStatusMap[name] || { health: 'unknown', running: isRunning, status: actualStatus };
      const httpHealthInfo = httpHealthMap[name] || { status: 'unknown', responseTime: null, error: null };
      
      // Déterminer le statut global
      let finalHealthStatus = httpHealthInfo.status;
      if (dockerHealthInfo.health === 'unhealthy') {
        finalHealthStatus = 'unhealthy';
      } else if (dockerHealthInfo.health === 'healthy') {
        // Si Docker healthcheck est healthy, utiliser le statut HTTP si disponible
        finalHealthStatus = httpHealthInfo.status !== 'unknown' ? httpHealthInfo.status : 'healthy';
      } else if (dockerHealthInfo.health === 'starting') {
        finalHealthStatus = 'starting';
      } else if (!isRunning) {
        // Si le conteneur n'est pas en cours d'exécution, le statut est 'stopped'
        finalHealthStatus = 'stopped';
      } else if (dockerHealthInfo.health === 'none') {
        // Si pas de healthcheck Docker, utiliser le statut HTTP ou considérer comme sain
        finalHealthStatus = httpHealthInfo.status !== 'unknown' ? httpHealthInfo.status : 'none';
      }
      
      // Un service est considéré comme sain s'il est running ET :
      // - health_status === 'healthy' OU
      // - health_status === 'none' (pas de healthcheck configuré) OU
      // - health_status === 'starting' (en cours de démarrage) OU
      // - httpHealthInfo.status === 'ok' (endpoint HTTP répond correctement)
      const isHealthy = isRunning && (
        dockerHealthInfo.health === 'healthy' ||
        dockerHealthInfo.health === 'none' ||
        dockerHealthInfo.health === 'starting' ||
        httpHealthInfo.status === 'ok'
      ) && dockerHealthInfo.health !== 'unhealthy';
      
      return {
        name: name,
        status: actualStatus, // Utiliser le statut réel du conteneur
        health_status: dockerHealthInfo.health, // Statut Docker natif (none, healthy, unhealthy, starting)
        is_running: isRunning, // Utiliser l'état réel (state.Running)
        is_healthy: isHealthy,
        created: container.CreatedAt,
        ports: container.Ports,
        image: container.Image,
        metrics: isRunning && stats ? {
          cpu_percent: stats.cpu_percent,
          memory_percent: stats.memory_percent,
          memory_usage_mb: parseFloat((stats.memory_usage / (1024 * 1024)).toFixed(2)),
          pids: stats.pids
        } : null,
        // ✅ Ajout des informations de health HTTP
        health: {
          status: finalHealthStatus,
          health_status_docker: dockerHealthInfo.health,
          health_status_http: httpHealthInfo.status,
          responseTime: typeof httpHealthInfo.responseTime === 'number' ? parseFloat(httpHealthInfo.responseTime.toFixed(2)) : null,
          error: httpHealthInfo.error || null
        }
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
 * Endpoint pour récupérer les logs Docker d'un service
 * ⚠️ IMPORTANT: Cette route DOIT être déclarée AVANT /service/:name pour éviter les conflits
 */
router.get('/service/:name/logs', async (req, res) => {
  try {
    const serviceName = req.params.name;
    const lines = parseInt(req.query.lines) || 100;
    
    console.log('[DOCKER ROUTES] 📜 Récupération logs pour:', serviceName, '- Lignes:', lines);
    
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    // Récupérer les logs du conteneur Docker avec timestamps
    const { stdout } = await execAsync(`docker logs ${serviceName} --tail ${lines} --timestamps 2>&1`);
    
    // Traiter les logs (les timestamps sont au format: 2025-12-02T17:21:30.123456789Z message)
    const logLines = stdout.split('\n').filter(line => line.trim().length > 0);
    
    // Identifier les lignes d'erreur
    const errorLines = logLines.filter(line => 
      line.toLowerCase().includes('error') || 
      line.toLowerCase().includes('exception') ||
      line.toLowerCase().includes('fatal')
    );
    
    // Identifier les warnings
    const warningLines = logLines.filter(line => 
      line.toLowerCase().includes('warn') || 
      line.toLowerCase().includes('warning')
    );
    
    res.json({
      success: true,
      service: serviceName,
      total: logLines.length,
      errors: errorLines.length,
      warnings: warningLines.length,
      lines: logLines,
      errorLines: errorLines.slice(0, 10), // Limiter les erreurs affichées
      warningLines: warningLines.slice(0, 10), // Limiter les warnings affichés
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[DOCKER ROUTES] ❌ Erreur récupération logs:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Endpoint pour récupérer l'historique d'un service spécifique
 * ⚠️ IMPORTANT: Cette route DOIT être déclarée AVANT /service/:name pour éviter les conflits
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
 * Endpoint pour démarrer un service
 * ⚠️ IMPORTANT: Cette route DOIT être déclarée AVANT /service/:name pour éviter les conflits
 */
router.post('/service/:name/start', async (req, res) => {
  try {
    const serviceName = req.params.name;
    const containerName = serviceName.startsWith('jobbingtrack-') ? serviceName : `jobbingtrack-${serviceName}`;
    
    console.log(`[DOCKER ROUTES] 🚀 Démarrage du service: ${containerName}`);
    
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    // Vérifier si le conteneur existe
    try {
      await execAsync(`docker inspect ${containerName} 2>&1`);
    } catch (err) {
      return res.status(404).json({
        success: false,
        error: `Le conteneur ${containerName} n'existe pas`
      });
    }
    
    // Démarrer le conteneur
    try {
      await execAsync(`docker start ${containerName}`);
      console.log(`[DOCKER ROUTES] ✅ Service ${containerName} démarré avec succès`);
      
      res.json({
        success: true,
        message: `Service ${serviceName} démarré avec succès`,
        service: serviceName,
        container: containerName,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error(`[DOCKER ROUTES] ❌ Erreur démarrage ${containerName}:`, err.message);
      res.status(500).json({
        success: false,
        error: `Erreur lors du démarrage: ${err.message}`,
        service: serviceName,
        container: containerName
      });
    }
  } catch (error) {
    console.error('[DOCKER ROUTES] ❌ Erreur:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Endpoint pour arrêter un service
 * ⚠️ IMPORTANT: Cette route DOIT être déclarée AVANT /service/:name pour éviter les conflits
 */
router.post('/service/:name/stop', async (req, res) => {
  try {
    const serviceName = req.params.name;
    const containerName = serviceName.startsWith('jobbingtrack-') ? serviceName : `jobbingtrack-${serviceName}`;
    
    console.log(`[DOCKER ROUTES] 🛑 Arrêt du service: ${containerName}`);
    
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    // Vérifier si le conteneur existe
    try {
      await execAsync(`docker inspect ${containerName} 2>&1`);
    } catch (err) {
      return res.status(404).json({
        success: false,
        error: `Le conteneur ${containerName} n'existe pas`
      });
    }
    
    // Arrêter le conteneur
    try {
      await execAsync(`docker stop ${containerName}`);
      console.log(`[DOCKER ROUTES] ✅ Service ${containerName} arrêté avec succès`);
      
      res.json({
        success: true,
        message: `Service ${serviceName} arrêté avec succès`,
        service: serviceName,
        container: containerName,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error(`[DOCKER ROUTES] ❌ Erreur arrêt ${containerName}:`, err.message);
      res.status(500).json({
        success: false,
        error: `Erreur lors de l'arrêt: ${err.message}`,
        service: serviceName,
        container: containerName
      });
    }
  } catch (error) {
    console.error('[DOCKER ROUTES] ❌ Erreur:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Endpoint pour redémarrer un service
 * ⚠️ IMPORTANT: Cette route DOIT être déclarée AVANT /service/:name pour éviter les conflits
 */
router.post('/service/:name/restart', async (req, res) => {
  try {
    const serviceName = req.params.name;
    const containerName = serviceName.startsWith('jobbingtrack-') ? serviceName : `jobbingtrack-${serviceName}`;
    
    console.log(`[DOCKER ROUTES] 🔄 Redémarrage du service: ${containerName}`);
    
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    // Vérifier si le conteneur existe
    try {
      await execAsync(`docker inspect ${containerName} 2>&1`);
    } catch (err) {
      return res.status(404).json({
        success: false,
        error: `Le conteneur ${containerName} n'existe pas`
      });
    }
    
    // Redémarrer le conteneur
    try {
      await execAsync(`docker restart ${containerName}`);
      console.log(`[DOCKER ROUTES] ✅ Service ${containerName} redémarré avec succès`);
      
      res.json({
        success: true,
        message: `Service ${serviceName} redémarré avec succès`,
        service: serviceName,
        container: containerName,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error(`[DOCKER ROUTES] ❌ Erreur redémarrage ${containerName}:`, err.message);
      res.status(500).json({
        success: false,
        error: `Erreur lors du redémarrage: ${err.message}`,
        service: serviceName,
        container: containerName
      });
    }
  } catch (error) {
    console.error('[DOCKER ROUTES] ❌ Erreur:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Endpoint pour récupérer les métriques d'un service spécifique
 * ⚠️ IMPORTANT: Cette route DOIT être déclarée APRÈS les routes spécifiques (/logs, /history, /start, /stop, /restart)
 */
router.get('/service/:name', async (req, res) => {
  try {
    const serviceName = req.params.name;
    console.log('[DOCKER ROUTES] 📊 Métriques pour:', serviceName);
    
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const stats = await dockerService.getContainerStats(serviceName);
    
    // Récupérer le health status Docker réel
    let dockerHealthStatus = 'none';
    try {
      const { stdout: inspectOut } = await execAsync(`docker inspect --format='{{json .State}}' ${serviceName}`);
      const state = JSON.parse(inspectOut);
      
      if (state.Health) {
        dockerHealthStatus = state.Health.Status; // healthy, unhealthy, starting
      }
    } catch (err) {
      console.error(`[DOCKER ROUTES] Erreur inspection ${serviceName}:`, err.message);
      dockerHealthStatus = 'unknown';
    }
    
    // Passer les stats du conteneur pour une détermination plus intelligente du statut HTTP
    const healthInfo = await probeServiceHealth(serviceName, stats);
    const errorMetrics = await collectErrorMetrics(serviceName);
    
    // Déterminer le status global: priorité au health status Docker
    let finalHealthStatus = healthInfo.status;
    if (dockerHealthStatus === 'unhealthy') {
      finalHealthStatus = 'unhealthy';
    } else if (dockerHealthStatus === 'healthy') {
      // Si Docker dit healthy, utiliser le résultat du probe HTTP
      finalHealthStatus = healthInfo.status;
    } else if (dockerHealthStatus === 'starting') {
      finalHealthStatus = 'starting';
    }
    
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
        health: finalHealthStatus,
        health_status_docker: dockerHealthStatus,
        health_status_http: healthInfo.status,
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


