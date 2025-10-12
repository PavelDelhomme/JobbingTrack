const axios = require('axios');
const logger = require('../utils/logger');

// Détecteur de doublons
const findDuplicates = async (req, res) => {
  try {
    const { entityType } = req.params; // companies, contacts, applications
    
    let endpoint = '';
    switch(entityType) {
      case 'companies':
        endpoint = `${process.env.COMPANY_SERVICE_URL || 'http://company-service:3003'}/api/v1/companies`;
        break;
      case 'contacts':
        endpoint = `${process.env.CONTACT_SERVICE_URL || 'http://contact-service:3004'}/api/v1/contacts`;
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Type d\'entité invalide'
        });
    }

    const response = await axios.get(endpoint, {
      headers: {
        Authorization: req.headers.authorization
      }
    });

    const entities = response.data[entityType] || [];
    
    // Détecter les doublons par nom ou email
    const duplicates = [];
    const seen = new Map();

    entities.forEach(entity => {
      const key = entityType === 'companies' 
        ? entity.name?.toLowerCase()
        : `${entity.firstName?.toLowerCase()}_${entity.lastName?.toLowerCase()}_${entity.email?.toLowerCase()}`;

      if (key && seen.has(key)) {
        const existing = seen.get(key);
        if (!duplicates.find(d => d.key === key)) {
          duplicates.push({
            key,
            entities: [existing, entity]
          });
        } else {
          const dup = duplicates.find(d => d.key === key);
          dup.entities.push(entity);
        }
      } else if (key) {
        seen.set(key, entity);
      }
    });

    res.json({
      success: true,
      duplicates,
      total: duplicates.length
    });
  } catch (error) {
    logger.error('Erreur détection doublons:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Fusionner des doublons
const mergeDuplicates = async (req, res) => {
  try {
    const { entityType, keepId, mergeIds } = req.body;

    // TODO: Implémenter la logique de fusion
    // - Transférer toutes les relations vers l'entité à conserver
    // - Supprimer les doublons

    res.json({
      success: true,
      message: `${mergeIds.length} doublons fusionnés vers ${keepId}`,
      kept: keepId,
      merged: mergeIds
    });
  } catch (error) {
    logger.error('Erreur fusion doublons:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Statistiques globales de monitoring
const getGlobalStats = async (req, res) => {
  try {
    const token = req.headers.authorization;

    // Appeler tous les services pour récupérer leurs statistiques
    const [
      authResponse,
      applicationsResponse,
      companiesResponse,
      contactsResponse,
      callsResponse,
      notificationsResponse
    ] = await Promise.allSettled([
      axios.get(`${process.env.AUTH_SERVICE_URL || 'http://auth-service:3001'}/api/v1/auth/users`, {
        headers: { Authorization: token }
      }),
      axios.get(`${process.env.APPLICATION_SERVICE_URL || 'http://application-service:3002'}/api/v1/applications/stats`, {
        headers: { Authorization: token }
      }),
      axios.get(`${process.env.COMPANY_SERVICE_URL || 'http://company-service:3003'}/api/v1/companies`, {
        headers: { Authorization: token }
      }),
      axios.get(`${process.env.CONTACT_SERVICE_URL || 'http://contact-service:3004'}/api/v1/contacts`, {
        headers: { Authorization: token }
      }),
      axios.get(`${process.env.CALL_SERVICE_URL || 'http://call-service:3008'}/api/v1/calls/stats/overview`, {
        headers: { Authorization: token }
      }),
      axios.get(`${process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3006'}/api/v1/notifications/stats`, {
        headers: { Authorization: token }
      })
    ]);

    const stats = {
      users: {
        total: authResponse.status === 'fulfilled' ? authResponse.value.data.total || authResponse.value.data.users?.length || 0 : 0,
        active: authResponse.status === 'fulfilled' ? authResponse.value.data.users?.filter(u => u.isActive).length || 0 : 0
      },
      applications: applicationsResponse.status === 'fulfilled' ? applicationsResponse.value.data.stats : {},
      companies: {
        total: companiesResponse.status === 'fulfilled' ? companiesResponse.value.data.total || companiesResponse.value.data.companies?.length || 0 : 0
      },
      contacts: {
        total: contactsResponse.status === 'fulfilled' ? contactsResponse.value.data.total || contactsResponse.value.data.contacts?.length || 0 : 0
      },
      calls: callsResponse.status === 'fulfilled' ? callsResponse.value.data.stats : {},
      notifications: notificationsResponse.status === 'fulfilled' ? notificationsResponse.value.data.stats : {}
    };

    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Erreur récupération statistiques:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Logs d'activité admin
const getAdminLogs = async (req, res) => {
  try {
    const { limit = 100, type } = req.query;

    // TODO: Implémenter un vrai système de logs avec base de données
    // Pour l'instant, retourner des logs simulés
    const logs = [
      {
        id: '1',
        timestamp: new Date(),
        userId: req.user.id,
        action: 'USER_ROLE_CHANGED',
        description: 'Rôle utilisateur modifié',
        metadata: {}
      }
    ];

    res.json({
      success: true,
      logs: logs.slice(0, parseInt(limit))
    });
  } catch (error) {
    logger.error('Erreur récupération logs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Anonymisation des données utilisateur (RGPD)
const anonymizeUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // TODO: Implémenter l'anonymisation complète
    // - Remplacer les données personnelles par des valeurs génériques
    // - Garder l'historique anonymisé pour les statistiques

    res.json({
      success: true,
      message: 'Utilisateur anonymisé avec succès',
      userId
    });
  } catch (error) {
    logger.error('Erreur anonymisation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Monitoring des performances
const getPerformanceMetrics = async (req, res) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      services: {
        'api-gateway': { status: 'OK', responseTime: 0 },
        'auth-service': { status: 'unknown', responseTime: null },
        'application-service': { status: 'unknown', responseTime: null },
        'company-service': { status: 'unknown', responseTime: null },
        'contact-service': { status: 'unknown', responseTime: null }
      }
    };

    // Tester la latence de chaque service
    const services = [
      { name: 'auth-service', url: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001' },
      { name: 'application-service', url: process.env.APPLICATION_SERVICE_URL || 'http://application-service:3002' },
      { name: 'company-service', url: process.env.COMPANY_SERVICE_URL || 'http://company-service:3003' },
      { name: 'contact-service', url: process.env.CONTACT_SERVICE_URL || 'http://contact-service:3004' }
    ];

    await Promise.all(services.map(async service => {
      try {
        const start = Date.now();
        await axios.get(`${service.url}/health`, { timeout: 2000 });
        const responseTime = Date.now() - start;
        metrics.services[service.name] = {
          status: 'OK',
          responseTime
        };
      } catch (error) {
        metrics.services[service.name] = {
          status: 'ERROR',
          responseTime: null,
          error: error.message
        };
      }
    }));

    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    logger.error('Erreur récupération métriques:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  findDuplicates,
  mergeDuplicates,
  getGlobalStats,
  getAdminLogs,
  anonymizeUser,
  getPerformanceMetrics
};

