const express = require('express');
const router = express.Router();
const dockerService = require('../services/docker.service');
const metricsHistory = require('../services/metricsHistory.service');

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
    
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      containers_count: jobbingtrackContainers.length,
      
      // Métriques CPU
      cpu_percent: parseFloat(totalCpuPercent.toFixed(2)), // CPU total utilisé
      cpu_percent_per_core: parseFloat(cpuPerCore.toFixed(2)), // CPU par core
      cpu_containers_only: parseFloat(totalCpuPercent.toFixed(2)), // CPU des conteneurs uniquement
      
      // Métriques mémoire (CORRIGÉES)
      memory_percent: parseFloat(memoryPercentOfSystem.toFixed(2)), // % par rapport à la mémoire système
      memory_usage_mb: parseFloat((totalMemoryUsage / (1024 * 1024)).toFixed(2)),
      memory_usage_gb: parseFloat((totalMemoryUsage / (1024 * 1024 * 1024)).toFixed(2)),
      memory_system_total_mb: parseFloat((systemMemoryTotal / (1024 * 1024)).toFixed(2)),
      memory_system_total_gb: parseFloat((systemMemoryTotal / (1024 * 1024 * 1024)).toFixed(2)),
      
      // Charge système
      load_average: parseFloat(loadAverage),
      
      // Disque
      disk: diskStats,
      
      // Informations système
      total_cpus: totalCpus,
      system_memory_total_gb: systemInfo.memory_total ? parseFloat((systemInfo.memory_total / (1024 * 1024 * 1024)).toFixed(2)) : 0,
      
      // Détails par conteneur
      containers: jobbingtrackContainers.map(stat => ({
        name: stat.name,
        cpu_percent: stat.cpu_percent,
        memory_percent: stat.memory_percent,
        memory_usage_mb: parseFloat((stat.memory_usage / (1024 * 1024)).toFixed(2)),
        pids: stat.pids
      }))
    };
    
    console.log('[DOCKER ROUTES] ✅ Métriques récupérées:', {
      containers: response.containers_count,
      cpu_total: response.cpu_percent + '%',
      cpu_per_core: response.cpu_percent_per_core + '%',
      memory: response.memory_percent + '%',
      load: response.load_average
    });
    
    // Sauvegarder dans l'historique
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
    
    // Tester le temps de réponse du service
    let responseTime = null;
    let serviceHealth = 'unknown';
    
    const serviceConfigs = {
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
    
    if (serviceConfigs[serviceName]) {
      const axios = require('axios');
      const startTime = Date.now();
      try {
        const config = serviceConfigs[serviceName];
        await axios.get(`http://localhost:${config.port}${config.path}`, { timeout: 5000 });
        responseTime = Date.now() - startTime;
        serviceHealth = 'healthy';
      } catch (err) {
        responseTime = Date.now() - startTime;
        serviceHealth = err.code === 'ECONNREFUSED' ? 'offline' : 'unhealthy';
      }
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
        health: serviceHealth,
        response_time_ms: responseTime
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


