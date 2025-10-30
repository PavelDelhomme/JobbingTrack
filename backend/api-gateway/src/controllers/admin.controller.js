const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const logger = require('../utils/logger');
const axios = require('axios');

// Map des noms de services frontend vers Docker (avec toutes les variantes possibles)
const SERVICE_MAP = {
  'api-gateway': 'api-gateway',
  'auth': 'auth-service',
  'application': 'application-service',
  'applications': 'application-service', // ✅ Ajout du pluriel
  'company': 'company-service',
  'companies': 'company-service', // ✅ Ajout du pluriel
  'contact': 'contact-service',
  'contacts': 'contact-service', // ✅ Ajout du pluriel
  'interview': 'interview-service',
  'interviews': 'interview-service', // ✅ Ajout du pluriel
  'notification': 'notification-service',
  'notifications': 'notification-service', // ✅ Ajout du pluriel
  'dashboard': 'dashboard-service',
  'call': 'call-service',
  'calls': 'call-service', // ✅ Ajout du pluriel
  'profile': 'profile-service',
  'profiles': 'profile-service', // ✅ Ajout du pluriel
  'event': 'event-service',
  'events': 'event-service', // ✅ Ajout du pluriel
  'followup': 'followup-service',
  'followups': 'followup-service', // ✅ Ajout du pluriel
  'frontend': 'frontend' // ✅ Ajout du frontend
};

/**
 * Redémarrer un service Docker
 */
const restartService = async (req, res) => {
  try {
    console.log('🔄 restartService appelé avec:');
    console.log('  - req.body:', JSON.stringify(req.body));
    console.log('  - req.params:', JSON.stringify(req.params));
    console.log('  - req.user:', JSON.stringify(req.user));

    // Extraire le nom du service du body ou des params
    let serviceName = req.body?.serviceName || req.params?.serviceName;
    console.log('  - serviceName extrait:', serviceName);
    
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
    // Extraire le nom du service du body ou des params
    let serviceName = req.body?.serviceName || req.params?.serviceName;
    
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
    // Extraire le nom du service du body ou des params
    let serviceName = req.body?.serviceName || req.params?.serviceName;
    
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

/**
 * Récupérer la liste de tous les services avec leur statut
 */
const getServicesList = async (req, res) => {
  try {
    logger.info('📋 Récupération de l\'état de tous les services');

    // Essayer de récupérer les vraies informations depuis le service de métriques
    try {
      const metricsServiceUrl = process.env.METRICS_SERVICE_URL || 'http://jobbingtrack-metrics-aggregator:3014';
      const response = await axios.get(`${metricsServiceUrl}/api/v1/services`, {
        timeout: 5000
      });

      if (response.data && response.data.containers) {
        // Convertir les conteneurs du format du service metrics-aggregator vers notre format
        const servicesStatus = response.data.containers.map((container) => {
          // Extraire le nom du service à partir du nom du conteneur
          const serviceName = container.name.replace('jobbingtrack-', '').replace('-service', '');
          
          // Déterminer le statut réel : si CPU > 0 ou PIDs > 0, c'est vraiment running
          const isActuallyRunning = (container.cpu?.percent > 0 || container.pids > 0);
          const status = isActuallyRunning ? 'running' : 'stopped';

          return {
            name: serviceName,
            status: status,
            port: 'N/A', // Port non exposé par cAdvisor, nécessiterait inspection Docker
            url: `http://localhost:N/A`,
            health: status,
            version: 'N/A', // Version non disponible via métriques conteneur
            environment: process.env.NODE_ENV || 'development',
            type: 'service',
            dataSource: 'metrics-aggregator',
            lastCheck: new Date().toISOString(),
            responseTime: 'N/A',
            error: undefined,
            metrics: {
              cpu: container.cpu?.percent !== undefined ? container.cpu.percent : 'N/A',
              memory: {
                usage: container.memory?.usage || 'N/A',
                limit: container.memory?.limit || 'N/A',
                percent: container.memory?.percent !== undefined ? container.memory.percent : 'N/A'
              },
              network: container.network || { rx_bytes: 'N/A', tx_bytes: 'N/A' },
              pids: container.pids !== undefined ? container.pids : 'N/A'
            }
          };
        });

        logger.info(`✅ Services récupérés depuis le service de métriques (${servicesStatus.length} services) - données temps réel`);

        return res.status(200).json({
          success: true,
          services: servicesStatus,
          total: servicesStatus.length,
          running: servicesStatus.filter(s => s.status === 'running' || s.status === 'online').length,
          dataSource: 'metrics-aggregator',
          message: 'Liste des services (données temps réel du système de monitoring)',
          timestamp: new Date().toISOString()
        });
      } else {
        throw new Error('Format de réponse invalide du service de métriques');
      }
    } catch (metricsError) {
      logger.error('Service de métriques non disponible:', {
        error: metricsError.message,
        url: process.env.METRICS_SERVICE_URL || 'http://jobbingtrack-metrics-aggregator:3014',
        timestamp: new Date().toISOString()
      });

      // Fallback : retourner des données mockées si le service de métriques n'est pas disponible
      const fallbackServices = [
        {
          name: 'api-gateway',
          status: 'running',
          port: 3000,
          url: 'http://localhost:3000',
          health: 'healthy',
          version: '1.0.0',
          environment: 'development',
          type: 'api-gateway',
          dataSource: 'fallback',
          lastCheck: new Date().toISOString(),
          responseTime: '45ms'
        },
        {
          name: 'auth-service',
          status: 'running',
          port: 3001,
          url: 'http://localhost:3001',
          health: 'healthy',
          version: '1.0.0',
          environment: 'development',
          type: 'auth',
          dataSource: 'fallback',
          lastCheck: new Date().toISOString(),
          responseTime: '25ms'
        },
        {
          name: 'frontend',
          status: 'running',
          port: 8080,
          url: 'http://localhost:8080',
          health: 'healthy',
          version: '1.0.0',
          environment: 'development',
          type: 'frontend',
          dataSource: 'fallback',
          lastCheck: new Date().toISOString(),
          responseTime: '120ms'
        }
      ];

      return res.status(200).json({
        success: true,
        services: fallbackServices,
        total: fallbackServices.length,
        running: fallbackServices.filter(s => s.status === 'running').length,
        dataSource: 'fallback',
        fallback: true,
        message: 'Liste des services (données de fallback - service de métriques indisponible)',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    logger.error('Error in services list:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur lors de la récupération des services',
      message: error.message
    });
  }
};

module.exports = {
  restartService,
  stopService,
  startService,
  getServicesList
};

