const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

const app = express();
const PORT = process.env.PORT || 3015;

// Middleware de sécurité et CORS
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://api-gateway:3000'],
  credentials: true
}));
app.use(express.json());

// Mapping des noms de services vers les noms de conteneurs
const SERVICE_TO_CONTAINER = {
  'api-gateway': 'jobbingtrack-api-gateway',
  'auth': 'jobbingtrack-auth-service',
  'applications': 'jobbingtrack-application-service',
  'companies': 'jobbingtrack-company-service',
  'contacts': 'jobbingtrack-contact-service',
  'interviews': 'jobbingtrack-interview-service',
  'notifications': 'jobbingtrack-notification-service',
  'dashboard': 'jobbingtrack-dashboard-service',
  'calls': 'jobbingtrack-call-service',
  'profile': 'jobbingtrack-profile-service',
  'events': 'jobbingtrack-event-service',
  'followups': 'jobbingtrack-followup-service',
  'frontend': 'jobbingtrack-frontend',
  'postgres': 'jobbingtrack-postgres',
  'redis': 'jobbingtrack-redis'
};

/**
 * Récupère les statistiques d'un conteneur spécifique
 */
async function getDockerStatsByService(serviceName) {
  try {
    const containerName = SERVICE_TO_CONTAINER[serviceName];

    if (!containerName) {
      throw new Error(`Service ${serviceName} non trouvé`);
    }

    // Récupérer les stats du conteneur spécifique
    const { stdout } = await execPromise(
      `docker stats ${containerName} --no-stream --format "{{.Container}}|{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}|{{.NetIO}}|{{.BlockIO}}"`
    );

    const [containerId, name, cpuPerc, memUsage, memPerc, netIO, blockIO] = stdout.trim().split('|');

    // Parser la mémoire (ex: "45.5MiB / 512MiB")
    const memParts = memUsage.split(' / ');
    const memUsed = memParts[0] || 'N/A';
    const memLimit = memParts[1] || 'N/A';

    return {
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
      timestamp: new Date().toISOString(),
      realStats: true
    };

  } catch (error) {
    console.error(`Erreur récupération stats Docker pour ${serviceName}:`, error.message);
    throw error;
  }
}

/**
 * Récupère les statistiques de tous les conteneurs
 */
async function getAllDockerStats() {
  try {
    const { stdout } = await execPromise(
      'docker stats --no-stream --format "{{.Container}}|{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}|{{.NetIO}}|{{.BlockIO}}"'
    );

    const lines = stdout.trim().split('\n');
    const stats = {};

    for (const line of lines) {
      if (!line) continue;

      const [containerId, containerName, cpuPerc, memUsage, memPerc, netIO, blockIO] = line.split('|');

      // Trouver le nom du service correspondant
      const serviceName = Object.keys(SERVICE_TO_CONTAINER).find(
        key => SERVICE_TO_CONTAINER[key] === containerName
      ) || containerName;

      // Parser la mémoire
      const memParts = memUsage.split(' / ');
      const memUsed = memParts[0] || 'N/A';
      const memLimit = memParts[1] || 'N/A';

      stats[serviceName] = {
        containerId: containerId.substring(0, 12),
        containerName,
        serviceName,
        cpu: cpuPerc.replace('%', ''),
        cpuPercent: cpuPerc,
        memoryUsed: memUsed,
        memoryLimit: memLimit,
        memoryPercent: memPerc.replace('%', ''),
        memoryUsage: memUsage,
        networkIO: netIO,
        blockIO: blockIO,
        timestamp: new Date().toISOString(),
        realStats: true
      };
    }

    return stats;

  } catch (error) {
    console.error('Erreur récupération stats Docker:', error);
    throw error;
  }
}

// Route pour récupérer les stats d'un service spécifique
app.get('/stats/:serviceName', async (req, res) => {
  try {
    const { serviceName } = req.params;
    const stats = await getDockerStatsByService(serviceName);

    res.json({
      success: true,
      stats,
      realStats: true
    });

  } catch (error) {
    console.error('Erreur API stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Impossible de récupérer les statistiques'
    });
  }
});

// Route pour récupérer toutes les statistiques
app.get('/stats', async (req, res) => {
  try {
    const stats = await getAllDockerStats();

    res.json({
      success: true,
      stats,
      count: Object.keys(stats).length,
      realStats: true
    });

  } catch (error) {
    console.error('Erreur API stats globales:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Impossible de récupérer les statistiques'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'docker-stats-service',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Démarrage du serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Service Docker Stats démarré sur le port ${PORT}`);
  console.log(`📊 Endpoints disponibles:`);
  console.log(`   GET /health`);
  console.log(`   GET /stats`);
  console.log(`   GET /stats/:serviceName`);
});

module.exports = app;
