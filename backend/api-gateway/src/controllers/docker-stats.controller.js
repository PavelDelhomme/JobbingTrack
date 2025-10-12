const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

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
 * Récupère les statistiques Docker de tous les conteneurs
 */
async function getAllDockerStats(req, res) {
  try {
    // Récupérer les stats de tous les conteneurs
    const { stdout } = await execPromise(
      'docker stats --no-stream --format "{{.Container}}|{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}|{{.NetIO}}|{{.BlockIO}}"'
    );

    const lines = stdout.trim().split('\n');
    const stats = {};

    for (const line of lines) {
      if (!line) continue;

      const [containerId, containerName, cpuPerc, memUsage, memPerc, netIO, blockIO] = line.split('|');
      
      // Trouver le nom du service correspondant
      const serviceName = CONTAINER_MAPPING[containerName] || containerName;

      // Parser la mémoire (ex: "45.5MiB / 512MiB")
      const memParts = memUsage.split(' / ');
      const memUsed = memParts[0] || 'N/A';
      const memLimit = memParts[1] || 'N/A';

      stats[serviceName] = {
        containerId: containerId.substring(0, 12),
        containerName,
        cpu: cpuPerc.replace('%', ''),
        cpuPercent: cpuPerc,
        memoryUsed: memUsed,
        memoryLimit: memLimit,
        memoryPercent: memPerc.replace('%', ''),
        memoryUsage: memUsage,
        networkIO: netIO,
        blockIO: blockIO,
        timestamp: new Date().toISOString()
      };
    }

    res.json({
      success: true,
      stats,
      count: Object.keys(stats).length
    });

  } catch (error) {
    console.error('Erreur récupération stats Docker:', error);
    
    // Si Docker n'est pas accessible, retourner des stats simulées
    res.json({
      success: false,
      error: error.message,
      stats: {},
      fallback: true,
      message: 'Docker stats non disponibles - utilisez docker avec les permissions appropriées'
    });
  }
}

/**
 * Récupère les statistiques d'un conteneur spécifique
 */
async function getDockerStatsByService(req, res) {
  try {
    const { serviceName } = req.params;

    // Trouver le nom du conteneur correspondant
    const containerName = Object.keys(CONTAINER_MAPPING).find(
      key => CONTAINER_MAPPING[key] === serviceName
    );

    if (!containerName) {
      return res.status(404).json({
        success: false,
        error: 'Service non trouvé'
      });
    }

    // Récupérer les stats du conteneur spécifique
    const { stdout } = await execPromise(
      `docker stats ${containerName} --no-stream --format "{{.Container}}|{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}|{{.NetIO}}|{{.BlockIO}}"`
    );

    const [containerId, name, cpuPerc, memUsage, memPerc, netIO, blockIO] = stdout.trim().split('|');

    // Parser la mémoire
    const memParts = memUsage.split(' / ');
    const memUsed = memParts[0] || 'N/A';
    const memLimit = memParts[1] || 'N/A';

    res.json({
      success: true,
      stats: {
        containerId: containerId.substring(0, 12),
        containerName: name,
        serviceName,
        cpu: cpuPerc.replace('%', ''),
        cpuPercent: cpuPerc,
        memoryUsed: memUsed,
        memoryLimit: memLimit,
        memoryPercent: memPerc.replace('%', ''),
        memoryUsage: memUsage,
        networkIO: netIO,
        blockIO: blockIO,
        timestamp: new Date().toISOString()
      }
    });

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
    const containerName = Object.keys(CONTAINER_MAPPING).find(
      key => CONTAINER_MAPPING[key] === serviceName
    );

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

