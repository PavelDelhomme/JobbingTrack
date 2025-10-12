const axios = require('axios');
const logger = require('../utils/logger');

// Map des services vers leurs URLs
const SERVICE_URLS = {
  application: process.env.APPLICATION_SERVICE_URL || 'http://application-service:3002',
  contact: process.env.CONTACT_SERVICE_URL || 'http://contact-service:3004',
  company: process.env.COMPANY_SERVICE_URL || 'http://company-service:3003',
  interview: process.env.INTERVIEW_SERVICE_URL || 'http://interview-service:3005',
  followup: process.env.FOLLOWUP_SERVICE_URL || 'http://followup-service:3012',
  call: process.env.CALL_SERVICE_URL || 'http://call-service:3008',
  event: process.env.EVENT_SERVICE_URL || 'http://event-service:3011',
  user: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
};

/**
 * Récupère tous les éléments archivés de tous les services
 */
const getAllArchivedItems = async (req, res) => {
  try {
    // Vérifier les permissions admin
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé. Seuls les administrateurs peuvent accéder aux archives.'
      });
    }

    const { type } = req.query;
    const authHeader = req.headers.authorization;

    logger.info(`📦 Admin ${req.user.email} consulte les archives ${type ? `(${type})` : '(tout)'}`);

    const items = [];

    // Si un type spécifique est demandé
    if (type && type !== 'all') {
      const serviceUrl = SERVICE_URLS[type.toLowerCase()];
      if (serviceUrl) {
        try {
          const response = await axios.get(
            `${serviceUrl}/api/v1/${type.toLowerCase()}s/archived`,
            {
              headers: { Authorization: authHeader },
              timeout: 5000
            }
          );
          
          if (response.data.success && response.data.items) {
            items.push(...response.data.items.map(item => ({
              ...item,
              type: type
            })));
          }
        } catch (error) {
          logger.error(`Erreur récupération archives ${type}:`, error.message);
        }
      }
    } else {
      // Récupérer de tous les services
      const promises = Object.entries(SERVICE_URLS).map(async ([serviceName, serviceUrl]) => {
        try {
          const entityName = serviceName === 'user' ? 'auth' : serviceName;
          const response = await axios.get(
            `${serviceUrl}/api/v1/${entityName}${serviceName !== 'auth' ? 's' : ''}/archived`,
            {
              headers: { Authorization: authHeader },
              timeout: 5000
            }
          );
          
          if (response.data.success && response.data.items) {
            return response.data.items.map(item => ({
              ...item,
              type: serviceName.charAt(0).toUpperCase() + serviceName.slice(1)
            }));
          }
        } catch (error) {
          logger.warn(`Service ${serviceName} ne supporte pas les archives:`, error.message);
          return [];
        }
      });

      const results = await Promise.all(promises);
      results.forEach(serviceItems => {
        if (serviceItems) items.push(...serviceItems);
      });
    }

    // Trier par date d'archivage (plus récent en premier)
    items.sort((a, b) => 
      new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime()
    );

    res.json({
      success: true,
      items,
      total: items.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Erreur récupération archives:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Archive un élément
 */
const archiveItem = async (req, res) => {
  try {
    const { type, id } = req.params;
    
    // Vérifier les permissions admin
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé'
      });
    }

    const serviceUrl = SERVICE_URLS[type.toLowerCase()];
    if (!serviceUrl) {
      return res.status(400).json({
        success: false,
        error: 'Type d\'entité invalide'
      });
    }

    logger.info(`📦 Admin ${req.user.email} archive ${type} ${id}`);

    const authHeader = req.headers.authorization;
    const response = await axios.post(
      `${serviceUrl}/api/v1/${type.toLowerCase()}s/${id}/archive`,
      {},
      {
        headers: { Authorization: authHeader },
        timeout: 5000
      }
    );

    res.json(response.data);

  } catch (error) {
    logger.error('Erreur archivage:', error);
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.error || error.message
    });
  }
};

/**
 * Désarchive un élément
 */
const unarchiveItem = async (req, res) => {
  try {
    const { type, id } = req.params;
    
    // Vérifier les permissions admin
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé'
      });
    }

    const serviceUrl = SERVICE_URLS[type.toLowerCase()];
    if (!serviceUrl) {
      return res.status(400).json({
        success: false,
        error: 'Type d\'entité invalide'
      });
    }

    logger.info(`📤 Admin ${req.user.email} désarchive ${type} ${id}`);

    const authHeader = req.headers.authorization;
    const response = await axios.post(
      `${serviceUrl}/api/v1/${type.toLowerCase()}s/${id}/unarchive`,
      {},
      {
        headers: { Authorization: authHeader },
        timeout: 5000
      }
    );

    res.json(response.data);

  } catch (error) {
    logger.error('Erreur désarchivage:', error);
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.error || error.message
    });
  }
};

module.exports = {
  getAllArchivedItems,
  archiveItem,
  unarchiveItem
};

