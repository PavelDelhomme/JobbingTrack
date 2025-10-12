const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const logger = require('../utils/logger');

// Map des noms de services frontend vers Docker
const SERVICE_MAP = {
  'api-gateway': 'api-gateway',
  'auth': 'auth-service',
  'application': 'application-service',
  'company': 'company-service',
  'contact': 'contact-service',
  'interview': 'interview-service',
  'notification': 'notification-service',
  'dashboard': 'dashboard-service',
  'call': 'call-service',
  'profile': 'profile-service',
  'event': 'event-service',
  'followup': 'followup-service'
};

/**
 * Redémarrer un service Docker
 */
const restartService = async (req, res) => {
  try {
    const { serviceName } = req.body;
    
    // Vérifier les permissions admin
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé. Seuls les administrateurs peuvent redémarrer des services.'
      });
    }

    if (!serviceName) {
      return res.status(400).json({
        success: false,
        error: 'Le nom du service est requis'
      });
    }

    // Mapper le nom du service
    const dockerServiceName = SERVICE_MAP[serviceName] || serviceName;
    const containerName = `jobbingtrack-${dockerServiceName}`;

    logger.info(`🔄 Admin ${req.user.email} redémarre le service: ${dockerServiceName}`);

    // Redémarrer le conteneur Docker directement
    const { stdout, stderr } = await execPromise(
      `docker restart ${containerName}`
    );

    if (stderr && !stderr.includes('Restarting') && !stderr.includes('Started')) {
      logger.error(`Erreur redémarrage ${dockerServiceName}:`, stderr);
      return res.status(500).json({
        success: false,
        error: `Erreur lors du redémarrage: ${stderr}`
      });
    }

    logger.info(`✅ Service ${dockerServiceName} redémarré avec succès`);

    res.json({
      success: true,
      message: `Service ${dockerServiceName} redémarré avec succès`,
      serviceName: dockerServiceName,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Erreur redémarrage service:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors du redémarrage du service'
    });
  }
};

/**
 * Arrêter un service Docker
 */
const stopService = async (req, res) => {
  try {
    const { serviceName } = req.body;
    
    // Vérifier les permissions admin
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé. Seuls les administrateurs peuvent arrêter des services.'
      });
    }

    if (!serviceName) {
      return res.status(400).json({
        success: false,
        error: 'Le nom du service est requis'
      });
    }

    // Empêcher l'arrêt de services critiques
    if (serviceName === 'api-gateway' || serviceName === 'postgres') {
      return res.status(403).json({
        success: false,
        error: 'Impossible d\'arrêter un service critique (API Gateway ou PostgreSQL)'
      });
    }

    // Mapper le nom du service
    const dockerServiceName = SERVICE_MAP[serviceName] || serviceName;
    const containerName = `jobbingtrack-${dockerServiceName}`;

    logger.warn(`🛑 Admin ${req.user.email} arrête le service: ${dockerServiceName}`);

    // Arrêter le conteneur Docker directement
    const { stdout, stderr } = await execPromise(
      `docker stop ${containerName}`
    );

    if (stderr && !stderr.includes('Stopping') && !stderr.includes('Stopped')) {
      logger.error(`Erreur arrêt ${dockerServiceName}:`, stderr);
      return res.status(500).json({
        success: false,
        error: `Erreur lors de l'arrêt: ${stderr}`
      });
    }

    logger.info(`🛑 Service ${dockerServiceName} arrêté`);

    res.json({
      success: true,
      message: `Service ${dockerServiceName} arrêté`,
      serviceName: dockerServiceName,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Erreur arrêt service:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de l\'arrêt du service'
    });
  }
};

/**
 * Démarrer un service Docker
 */
const startService = async (req, res) => {
  try {
    const { serviceName } = req.body;
    
    // Vérifier les permissions admin
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé. Seuls les administrateurs peuvent démarrer des services.'
      });
    }

    if (!serviceName) {
      return res.status(400).json({
        success: false,
        error: 'Le nom du service est requis'
      });
    }

    // Mapper le nom du service
    const dockerServiceName = SERVICE_MAP[serviceName] || serviceName;

    // Mapper le nom du service
    const containerName = `jobbingtrack-${dockerServiceName}`;

    logger.info(`▶️ Admin ${req.user.email} démarre le service: ${dockerServiceName}`);

    // Démarrer le conteneur Docker directement
    const { stdout, stderr } = await execPromise(
      `docker start ${containerName}`
    );

    if (stderr && stderr.includes('Error')) {
      logger.error(`Erreur démarrage ${dockerServiceName}:`, stderr);
      return res.status(500).json({
        success: false,
        error: `Erreur lors du démarrage: ${stderr}`
      });
    }

    logger.info(`✅ Service ${dockerServiceName} démarré`);

    res.json({
      success: true,
      message: `Service ${dockerServiceName} démarré avec succès`,
      serviceName: dockerServiceName,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Erreur démarrage service:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors du démarrage du service'
    });
  }
};

module.exports = {
  restartService,
  stopService,
  startService
};

