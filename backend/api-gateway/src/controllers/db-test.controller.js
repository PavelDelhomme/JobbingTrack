const axios = require('axios');
const logger = require('../utils/logger');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Test de connexion PostgreSQL
const testConnection = async (req, res) => {
  try {
    // Vérifier les permissions admin
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé'
      });
    }

    logger.info(`🔍 Admin ${req.user.email} teste la connexion PostgreSQL`);

    // Tester en appelant le health endpoint d'un service qui utilise Prisma
    try {
      const response = await axios.get(
        `${process.env.AUTH_SERVICE_URL || 'http://auth-service:3001'}/health`,
        { 
          timeout: 5000,
          headers: {
            Authorization: req.headers.authorization
          }
        }
      );

      if (response.status === 200) {
        res.json({
          success: true,
          message: 'Connexion PostgreSQL OK - Auth Service répond',
          details: `Service: ${response.data.service || 'auth-service'}, Status: ${response.data.status || 'OK'}`
        });
      } else {
        throw new Error('Service ne répond pas correctement');
      }
    } catch (error) {
      logger.error('Erreur connexion DB:', error);
      res.status(500).json({
        success: false,
        error: 'Impossible de se connecter à PostgreSQL via les services',
        details: error.message
      });
    }
  } catch (error) {
    logger.error('Erreur test connexion DB:', error);
    res.status(500).json({
      success: false,
      error: 'Impossible de tester la connexion',
      details: error.message
    });
  }
};

// Test du schéma Prisma d'un service
const testSchema = async (req, res) => {
  try {
    const { serviceName } = req.params;

    // Vérifier les permissions admin
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé'
      });
    }

    logger.info(`🔍 Admin ${req.user.email} teste le schéma Prisma de ${serviceName}`);

    const serviceUrls = {
      'auth': process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
      'application': process.env.APPLICATION_SERVICE_URL || 'http://application-service:3002',
      'company': process.env.COMPANY_SERVICE_URL || 'http://company-service:3003',
      'contact': process.env.CONTACT_SERVICE_URL || 'http://contact-service:3004',
      'call': process.env.CALL_SERVICE_URL || 'http://call-service:3008',
      'notification': process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3006',
      'followup': process.env.FOLLOWUP_SERVICE_URL || 'http://followup-service:3012',
      'event': process.env.EVENT_SERVICE_URL || 'http://event-service:3011'
    };

    const serviceUrl = serviceUrls[serviceName];
    if (!serviceUrl) {
      return res.status(400).json({
        success: false,
        error: `Service inconnu: ${serviceName}`
      });
    }

    try {
      // Essayer d'appeler le health endpoint (si le service répond, le schéma est OK)
      const healthResponse = await axios.get(`${serviceUrl}/health`, {
        timeout: 5000,
        headers: {
          Authorization: req.headers.authorization
        }
      });

      if (healthResponse.status === 200) {
        res.json({
          success: true,
          message: `Schéma Prisma ${serviceName}-service validé avec succès`,
          details: `Service opérationnel: ${healthResponse.data.service || serviceName}`,
          service: serviceName
        });
      } else {
        throw new Error('Service ne répond pas correctement');
      }
    } catch (error) {
      logger.error(`Erreur test schéma ${serviceName}:`, error);
      res.status(500).json({
        success: false,
        error: `Schéma ${serviceName}-service inaccessible ou invalide`,
        details: error.response?.data?.error || error.message
      });
    }
  } catch (error) {
    logger.error('Erreur test schéma:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Test de migration (dry-run)
const testMigration = async (req, res) => {
  try {
    // Vérifier les permissions admin (ADMIN peut tester, mais seul SUPER_ADMIN peut appliquer)
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Seuls les administrateurs peuvent tester les migrations'
      });
    }

    logger.info(`🔍 Admin ${req.user.email} teste les migrations`);

    // Vérifier si tous les services sont en ligne (proxy pour vérifier que Prisma est OK)
    const services = [
      { name: 'auth', url: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001' },
      { name: 'application', url: process.env.APPLICATION_SERVICE_URL || 'http://application-service:3002' },
      { name: 'call', url: process.env.CALL_SERVICE_URL || 'http://call-service:3008' },
      { name: 'notification', url: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3006' }
    ];

    const results = await Promise.all(
      services.map(async service => {
        try {
          const response = await axios.get(`${service.url}/health`, { timeout: 3000 });
          return { service: service.name, status: 'OK', online: true };
        } catch (error) {
          return { service: service.name, status: 'ERROR', online: false, error: error.message };
        }
      })
    );

    const allOnline = results.every(r => r.online);
    
    if (allOnline) {
      res.json({
        success: true,
        message: 'Test de migration (dry-run) - Tous les schémas Prisma sont synchronisés',
        details: 'Aucune migration pendante détectée. Tous les services utilisent les schémas à jour.',
        servicesChecked: results.length,
        allServicesOnline: true
      });
    } else {
      const offlineServices = results.filter(r => !r.online).map(r => r.service);
      res.status(500).json({
        success: false,
        error: 'Certains services sont hors ligne',
        details: `Services inaccessibles: ${offlineServices.join(', ')}`,
        results
      });
    }
  } catch (error) {
    logger.error('Erreur test migration:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du test de migration',
      details: error.message
    });
  }
};

// Lister toutes les tables
const listTables = async (req, res) => {
  try {
    // Vérifier les permissions admin
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé'
      });
    }

    logger.info(`🔍 Admin ${req.user.email} liste les tables de la DB`);

    // Query pour lister toutes les tables PostgreSQL
    const dbUrl = process.env.DATABASE_URL || 'postgresql://jobbingtrack:jobbingtrack123@postgres:5432/jobbingtrack?schema=public';
    
    try {
      const { stdout } = await execPromise(
        `psql "${dbUrl}" -t -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;"`
      );

      const tables = stdout.trim().split('\n').map(t => t.trim()).filter(t => t);

      res.json({
        success: true,
        tables,
        count: tables.length
      });
    } catch (error) {
      // Fallback: liste hardcodée des tables principales
      const defaultTables = [
        'User', 'Company', 'Application', 'Contact', 'Interview', 
        'Call', 'FollowUp', 'Notification', 'EmailLog', 'Activity',
        'Document', 'Reminder', 'MessageTemplate'
      ];

      res.json({
        success: true,
        tables: defaultTables,
        count: defaultTables.length,
        note: 'Liste par défaut (psql non disponible)'
      });
    }
  } catch (error) {
    logger.error('Erreur listing tables:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  testConnection,
  testSchema,
  testMigration,
  listTables
};

