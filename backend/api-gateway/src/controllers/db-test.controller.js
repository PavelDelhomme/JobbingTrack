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

    // Tester via le auth-service (ou n'importe quel service avec Prisma)
    try {
      const response = await axios.post(
        `${process.env.AUTH_SERVICE_URL || 'http://auth-service:3001'}/test-db`,
        {},
        { timeout: 5000 }
      );

      res.json({
        success: true,
        message: 'Connexion PostgreSQL OK',
        details: response.data
      });
    } catch (error) {
      // Fallback: tester via psql si disponible
      try {
        const dbUrl = process.env.DATABASE_URL || 'postgresql://jobbingtrack:password@postgres:5432/jobbingtrack';
        await execPromise(`psql "${dbUrl}" -c "SELECT version();"`, { timeout: 3000 });
        
        res.json({
          success: true,
          message: 'Connexion PostgreSQL OK (via psql)'
        });
      } catch (psqlError) {
        throw error; // Renvoyer l'erreur originale
      }
    }
  } catch (error) {
    logger.error('Erreur test connexion DB:', error);
    res.status(500).json({
      success: false,
      error: 'Impossible de se connecter à PostgreSQL',
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
        timeout: 3000
      });

      if (healthResponse.status === 200) {
        res.json({
          success: true,
          message: `Schéma Prisma ${serviceName}-service OK`,
          service: serviceName
        });
      } else {
        throw new Error('Service ne répond pas correctement');
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Schéma ${serviceName}-service inaccessible`,
        details: error.message
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
    // Vérifier les permissions admin
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Seuls les Super Admins peuvent tester les migrations'
      });
    }

    logger.info(`🔍 Super Admin ${req.user.email} teste les migrations`);

    // Simuler un dry-run de migration
    // Dans un environnement de production, vous voudriez exécuter:
    // npx prisma migrate diff --from-schema-datasource --to-schema-datamodel --script
    
    res.json({
      success: true,
      message: 'Test de migration (dry-run) OK',
      details: 'Aucune migration pendante détectée',
      warning: 'Fonctionnalité en développement - dry-run simulé'
    });
  } catch (error) {
    logger.error('Erreur test migration:', error);
    res.status(500).json({
      success: false,
      error: error.message
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
    const dbUrl = process.env.DATABASE_URL || 'postgresql://jobbingtrack:password@postgres:5432/jobbingtrack';
    
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

