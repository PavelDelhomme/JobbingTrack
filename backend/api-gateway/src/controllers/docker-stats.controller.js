const axios = require('axios');

/**
 * Mapping des noms de conteneurs Docker vers les noms de services
 */
const CONTAINER_MAPPING = {
  'jobbingtrack-api-gateway': 'api-gateway',
  'jobbingtrack-auth-service': 'auth',
  'jobbingtrack-application-service': 'applications',
  'jobbingtrack-company-service': 'companies',
  'jobbingtrack-contact-service': 'contacts',
  'jobbingtrack-interview-service': 'interviews',
  'jobbingtrack-notification-service': 'notifications',
  'jobbingtrack-dashboard-service': 'dashboard',
  'jobbingtrack-call-service': 'calls',
  'jobbingtrack-profile-service': 'profile',
  'jobbingtrack-event-service': 'events',
  'jobbingtrack-followup-service': 'followups',
  'jobbingtrack-workflow-service': 'workflow',
  'jobbingtrack-frontend': 'frontend',
  'jobbingtrack-postgres': 'postgres',
  'jobbingtrack-redis': 'redis',
};

/**
 * Mapping des slugs de services vers les vrais noms de services pour les logs
 */
const SERVICE_SLUG_TO_NAME = {
  'api-gateway': 'api-gateway',
  'auth': 'auth-service',
  'applications': 'application-service',
  'companies': 'company-service',
  'contacts': 'contact-service',
  'interviews': 'interview-service',
  'notifications': 'notification-service',
  'dashboard': 'dashboard-service',
  'calls': 'call-service',
  'profile': 'profile-service',
  'events': 'event-service',
  'followups': 'followup-service',
  'frontend': 'frontend',
};

/**
 * Mapping inverse des services vers les noms de conteneurs
 */
const SERVICE_TO_CONTAINER = Object.fromEntries(
  Object.entries(CONTAINER_MAPPING).map(([container, service]) => [service, container])
);

/**
 * Récupère les statistiques Docker de tous les conteneurs
 */
async function getAllDockerStats(req, res) {
  try {
    // URL du service Docker stats
    const dockerStatsUrl = process.env.DOCKER_STATS_SERVICE_URL || 'http://docker-stats-service:3015';

    try {
      // Appeler le service Docker stats pour toutes les statistiques
      const response = await axios.get(`${dockerStatsUrl}/stats`, {
        timeout: 5000,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.data.success && response.data.stats) {
        res.json({
          success: true,
          stats: response.data.stats,
          count: response.data.count,
          realStats: true
        });
      } else {
        throw new Error('Réponse invalide du service Docker stats');
      }

    } catch (serviceError) {
      console.error('Erreur appel service Docker stats globales:', serviceError.message);

      // Fallback : retourner des stats simulées si le service n'est pas disponible
      const stats = {};
      for (const [serviceName, containerName] of Object.entries(SERVICE_TO_CONTAINER)) {
        stats[serviceName] = {
          containerId: 'mock123456789',
          containerName: containerName,
          serviceName,
          cpu: (Math.random() * 15).toFixed(2),
          cpuPercent: `${(Math.random() * 15).toFixed(1)}%`,
          memoryUsed: `${(Math.random() * 50 + 20).toFixed(1)}MiB`,
          memoryLimit: '512MiB',
          memoryPercent: `${(Math.random() * 20 + 5).toFixed(1)}`,
          memoryUsage: `${(Math.random() * 50 + 20).toFixed(1)}MiB / 512MiB`,
          networkIO: `${(Math.random() * 1000 + 100).toFixed(0)}kB / ${(Math.random() * 500 + 50).toFixed(0)}kB`,
          blockIO: `${(Math.random() * 100 + 10).toFixed(0)}kB / ${(Math.random() * 50 + 5).toFixed(0)}kB`,
          timestamp: new Date().toISOString(),
          simulated: true,
          fallback: true
        };
      }

      res.json({
        success: true,
        stats,
        count: Object.keys(stats).length,
        fallback: true,
        message: 'Service Docker stats non disponible, données simulées'
      });
    }

  } catch (error) {
    console.error('Erreur récupération stats Docker:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Impossible de récupérer les statistiques'
    });
  }
}

/**
 * Lit les statistiques CPU et mémoire depuis les cgroups
 */
async function readCgroupStats(containerId) {
  try {
    // Construire les chemins vers les fichiers cgroups
    const cpuPath = `/sys/fs/cgroup/cpu/docker/${containerId}/cpuacct.stat`;
    const memoryPath = `/sys/fs/cgroup/memory/docker/${containerId}/memory.stat`;

    // Lire les statistiques CPU
    const cpuStats = await fs.readFile(cpuPath, 'utf8');
    const cpuUser = cpuStats.match(/user (\d+)/)?.[1] || '0';
    const cpuSystem = cpuStats.match(/system (\d+)/)?.[1] || '0';

    // Lire les statistiques mémoire
    const memoryStats = await fs.readFile(memoryPath, 'utf8');
    const cache = memoryStats.match(/cache (\d+)/)?.[1] || '0';
    const rss = memoryStats.match(/rss (\d+)/)?.[1] || '0';
    const totalRss = (parseInt(rss) + parseInt(cache)).toString();

    // Obtenir les limites mémoire
    const memoryLimitPath = `/sys/fs/cgroup/memory/docker/${containerId}/memory.limit_in_bytes`;
    const memoryLimit = await fs.readFile(memoryLimitPath, 'utf8');

    const memUsedBytes = parseInt(totalRss);
    const memLimitBytes = parseInt(memoryLimit.trim());
    const memUsagePercent = ((memUsedBytes / memLimitBytes) * 100).toFixed(1);

    // Calculer l'utilisation CPU (approximation basée sur les ticks)
    const totalCpuTicks = parseInt(cpuUser) + parseInt(cpuSystem);
    // Note: Ceci est une approximation. Pour des stats CPU précises en temps réel,
    // il faudrait calculer la différence sur une période

    return {
      cpuTicks: totalCpuTicks,
      memoryUsedBytes: memUsedBytes,
      memoryLimitBytes: memLimitBytes,
      memoryUsagePercent: memUsagePercent
    };
  } catch (error) {
    throw new Error(`Impossible de lire les statistiques cgroup pour ${containerId}: ${error.message}`);
  }
}

/**
 * Récupère les statistiques d'un conteneur spécifique
 */
async function getDockerStatsByService(req, res) {
  try {
    const { serviceName } = req.params;

    // Vérifier que le service existe
    if (!SERVICE_TO_CONTAINER[serviceName]) {
      return res.status(404).json({
        success: false,
        error: 'Service non trouvé'
      });
    }

    // URL du service Docker stats
    const dockerStatsUrl = process.env.DOCKER_STATS_SERVICE_URL || 'http://docker-stats-service:3015';

    try {
      // Appeler le service Docker stats
      const response = await axios.get(`${dockerStatsUrl}/stats/${serviceName}`, {
        timeout: 5000,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.data.success && response.data.stats) {
        res.json({
          success: true,
          stats: response.data.stats,
          realStats: true
        });
      } else {
        throw new Error('Réponse invalide du service Docker stats');
      }

    } catch (serviceError) {
      console.error(`Erreur appel service Docker stats pour ${serviceName}:`, serviceError.message);

      // Fallback : retourner des données simulées si le service Docker stats n'est pas disponible
      const containerName = SERVICE_TO_CONTAINER[serviceName];

      const mockStats = {
        containerId: 'mock123456789',
        containerName: containerName,
        serviceName,
        cpu: (Math.random() * 15).toFixed(2),
        cpuPercent: `${(Math.random() * 15).toFixed(1)}%`,
        memoryUsed: `${(Math.random() * 50 + 20).toFixed(1)}MiB`,
        memoryLimit: '512MiB',
        memoryPercent: `${(Math.random() * 20 + 5).toFixed(1)}`,
        memoryUsage: `${(Math.random() * 50 + 20).toFixed(1)}MiB / 512MiB`,
        networkIO: `${(Math.random() * 1000 + 100).toFixed(0)}kB / ${(Math.random() * 500 + 50).toFixed(0)}kB`,
        blockIO: `${(Math.random() * 100 + 10).toFixed(0)}kB / ${(Math.random() * 50 + 5).toFixed(0)}kB`,
        timestamp: new Date().toISOString(),
        simulated: true,
        fallback: true,
        message: 'Service Docker stats non disponible, données simulées'
      };

      res.json({
        success: true,
        stats: mockStats,
        fallback: true
      });
    }

  } catch (error) {
    console.error('Erreur récupération stats Docker:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Impossible de récupérer les stats du conteneur'
    });
  }
}

/**
 * Récupère l'historique des stats (simulé pour l'instant)
 */
async function getDockerStatsHistory(req, res) {
  try {
    const { serviceName } = req.params;
    const { points = 20 } = req.query;

    // Pour l'instant, on génère un historique simulé
    // TODO: Implémenter un vrai système de stockage d'historique
    const history = [];
    const now = Date.now();

    for (let i = points - 1; i >= 0; i--) {
      history.push({
        timestamp: new Date(now - i * 10000).toISOString(),
        cpu: Math.random() * 30,
        memory: 40 + Math.random() * 20
      });
    }

    res.json({
      success: true,
      serviceName,
      history,
      points: history.length
    });

  } catch (error) {
    console.error('Erreur récupération historique:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Récupère les informations détaillées d'un conteneur
 */
async function getContainerInfo(req, res) {
  try {
    const { serviceName } = req.params;

    // Trouver le nom du conteneur
    const containerName = SERVICE_TO_CONTAINER[serviceName];

    if (!containerName) {
      return res.status(404).json({
        success: false,
        error: 'Service non trouvé'
      });
    }

    // Récupérer les infos du conteneur
    const { stdout } = await execPromise(
      `docker inspect ${containerName} --format '{{json .}}'`
    );

    const containerInfo = JSON.parse(stdout);

    // Extraire les infos importantes
    const info = {
      id: containerInfo.Id.substring(0, 12),
      name: containerInfo.Name.replace('/', ''),
      state: containerInfo.State.Status,
      running: containerInfo.State.Running,
      startedAt: containerInfo.State.StartedAt,
      image: containerInfo.Config.Image,
      platform: containerInfo.Platform,
      hostname: containerInfo.Config.Hostname,
      ports: containerInfo.NetworkSettings.Ports,
      networks: Object.keys(containerInfo.NetworkSettings.Networks),
      restartCount: containerInfo.RestartCount,
      labels: containerInfo.Config.Labels
    };

    res.json({
      success: true,
      info
    });

  } catch (error) {
    console.error('Erreur récupération infos conteneur:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  getAllDockerStats,
  getDockerStatsByService,
  getDockerStatsHistory,
  getContainerInfo
};

