const axios = require('axios');
const logger = require('../utils/logger');

// Mapping des tables vers les services
const TABLE_SERVICE_MAP = {
  'User': { service: 'auth', endpoint: '/api/v1/auth/users', idField: 'id' },
  'Company': { service: 'company', endpoint: '/api/v1/companies', idField: 'id' },
  'Application': { service: 'application', endpoint: '/api/v1/applications', idField: 'id' },
  'Contact': { service: 'contact', endpoint: '/api/v1/contacts', idField: 'id' },
  'Interview': { service: 'interview', endpoint: '/api/v1/interviews', idField: 'id' },
  'Call': { service: 'call', endpoint: '/api/v1/calls', idField: 'id' },
  'FollowUp': { service: 'followup', endpoint: '/api/v1/followups', idField: 'id' },
  'Notification': { service: 'notification', endpoint: '/api/v1/notifications', idField: 'id' },
  'EmailLog': { service: 'notification', endpoint: '/api/v1/notifications/emails/logs', idField: 'id' },
  'Activity': { service: 'event', endpoint: '/api/v1/events', idField: 'id' },
};

const SERVICE_URLS = {
  'auth': process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
  'application': process.env.APPLICATION_SERVICE_URL || 'http://application-service:3002',
  'company': process.env.COMPANY_SERVICE_URL || 'http://company-service:3003',
  'contact': process.env.CONTACT_SERVICE_URL || 'http://contact-service:3004',
  'interview': process.env.INTERVIEW_SERVICE_URL || 'http://interview-service:3005',
  'notification': process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3006',
  'call': process.env.CALL_SERVICE_URL || 'http://call-service:3008',
  'event': process.env.EVENT_SERVICE_URL || 'http://event-service:3011',
  'followup': process.env.FOLLOWUP_SERVICE_URL || 'http://followup-service:3012',
};

/**
 * Récupérer les données d'une table
 */
const getTableData = async (req, res) => {
  try {
    const { tableName } = req.params;
    const { page = 1, limit = 50, search } = req.query;

    // Vérifier les permissions admin
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé'
      });
    }

    const tableConfig = TABLE_SERVICE_MAP[tableName];
    if (!tableConfig) {
      return res.status(404).json({
        success: false,
        error: `Table ${tableName} non trouvée`
      });
    }

    const serviceUrl = SERVICE_URLS[tableConfig.service];
    if (!serviceUrl) {
      return res.status(500).json({
        success: false,
        error: `Service ${tableConfig.service} non configuré`
      });
    }

    // Construire l'URL avec pagination
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search })
    });

    const url = `${serviceUrl}${tableConfig.endpoint}?${queryParams}`;

    logger.info(`🔍 Admin ${req.user.email} consulte la table ${tableName}`);

    // Faire la requête au service
    const response = await axios.get(url, {
      headers: {
        'Authorization': req.headers.authorization
      },
      timeout: 10000
    });

    // Extraire les données selon le format de réponse
    const dataKey = tableName.toLowerCase() + 's'; // users, companies, etc.
    const items = response.data[dataKey] || response.data.data || response.data.emailLogs || [];

    // Extraire les colonnes du premier élément
    const columns = items.length > 0 ? Object.keys(items[0]) : [];

    res.json({
      success: true,
      columns,
      rows: items,
      total: response.data.total || items.length,
      pagination: response.data.pagination
    });

  } catch (error) {
    logger.error('Erreur récupération données table:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la récupération des données'
    });
  }
};

/**
 * Créer un enregistrement
 */
const createRecord = async (req, res) => {
  try {
    const { tableName } = req.params;
    const data = req.body;

    // Vérifier les permissions admin
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé'
      });
    }

    const tableConfig = TABLE_SERVICE_MAP[tableName];
    if (!tableConfig) {
      return res.status(404).json({
        success: false,
        error: `Table ${tableName} non trouvée`
      });
    }

    const serviceUrl = SERVICE_URLS[tableConfig.service];
    const url = `${serviceUrl}${tableConfig.endpoint}`;

    logger.info(`➕ Admin ${req.user.email} crée un enregistrement dans ${tableName}`);

    const response = await axios.post(url, data, {
      headers: {
        'Authorization': req.headers.authorization,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    res.json({
      success: true,
      data: response.data
    });

  } catch (error) {
    logger.error('Erreur création enregistrement:', error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error || error.message
    });
  }
};

/**
 * Mettre à jour un enregistrement
 */
const updateRecord = async (req, res) => {
  try {
    const { tableName, id } = req.params;
    const data = req.body;

    // Vérifier les permissions admin
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé'
      });
    }

    const tableConfig = TABLE_SERVICE_MAP[tableName];
    if (!tableConfig) {
      return res.status(404).json({
        success: false,
        error: `Table ${tableName} non trouvée`
      });
    }

    const serviceUrl = SERVICE_URLS[tableConfig.service];
    const url = `${serviceUrl}${tableConfig.endpoint}/${id}`;

    logger.info(`✏️ Admin ${req.user.email} modifie ${tableName}/${id}`);

    const response = await axios.put(url, data, {
      headers: {
        'Authorization': req.headers.authorization,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    res.json({
      success: true,
      data: response.data
    });

  } catch (error) {
    logger.error('Erreur mise à jour enregistrement:', error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error || error.message
    });
  }
};

/**
 * Supprimer un enregistrement
 */
const deleteRecord = async (req, res) => {
  try {
    const { tableName, id } = req.params;

    // Vérifier les permissions admin
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé'
      });
    }

    const tableConfig = TABLE_SERVICE_MAP[tableName];
    if (!tableConfig) {
      return res.status(404).json({
        success: false,
        error: `Table ${tableName} non trouvée`
      });
    }

    const serviceUrl = SERVICE_URLS[tableConfig.service];
    const url = `${serviceUrl}${tableConfig.endpoint}/${id}`;

    logger.info(`🗑️ Admin ${req.user.email} supprime ${tableName}/${id}`);

    const response = await axios.delete(url, {
      headers: {
        'Authorization': req.headers.authorization
      },
      timeout: 10000
    });

    res.json({
      success: true,
      message: `Enregistrement ${id} supprimé`
    });

  } catch (error) {
    logger.error('Erreur suppression enregistrement:', error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error || error.message
    });
  }
};

/**
 * Exporter une table
 */
const exportTable = async (req, res) => {
  try {
    const { tableName } = req.params;
    const { format = 'json' } = req.query;

    // Vérifier les permissions admin
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé'
      });
    }

    const tableConfig = TABLE_SERVICE_MAP[tableName];
    if (!tableConfig) {
      return res.status(404).json({
        success: false,
        error: `Table ${tableName} non trouvée`
      });
    }

    const serviceUrl = SERVICE_URLS[tableConfig.service];
    const url = `${serviceUrl}${tableConfig.endpoint}?limit=10000`;

    logger.info(`📤 Admin ${req.user.email} exporte la table ${tableName} en ${format}`);

    const response = await axios.get(url, {
      headers: {
        'Authorization': req.headers.authorization
      },
      timeout: 30000
    });

    const dataKey = tableName.toLowerCase() + 's';
    const items = response.data[dataKey] || response.data.data || [];

    if (format === 'csv') {
      // Convertir en CSV
      if (items.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Aucune donnée à exporter'
        });
      }

      const headers = Object.keys(items[0]);
      const csv = [
        headers.join(','),
        ...items.map(item => 
          headers.map(header => {
            const value = item[header];
            if (value === null || value === undefined) return '';
            if (typeof value === 'object') return JSON.stringify(value).replace(/,/g, ';');
            return String(value).replace(/,/g, ';');
          }).join(',')
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${tableName}_export_${new Date().toISOString()}.csv"`);
      return res.send(csv);
    }

    // Format JSON par défaut
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${tableName}_export_${new Date().toISOString()}.json"`);
    res.json({
      table: tableName,
      exportedAt: new Date().toISOString(),
      count: items.length,
      data: items
    });

  } catch (error) {
    logger.error('Erreur export table:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Exporter toutes les tables (type = 'all')
 */
const exportAllTables = async (req, res) => {
  try {
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, error: 'Accès refusé' });
    }
    const result = { exportedAt: new Date().toISOString(), tables: {} };
    for (const tableName of Object.keys(TABLE_SERVICE_MAP)) {
      const tableConfig = TABLE_SERVICE_MAP[tableName];
      const serviceUrl = SERVICE_URLS[tableConfig.service];
      if (!serviceUrl) continue;
      try {
        const url = `${serviceUrl}${tableConfig.endpoint}?limit=10000`;
        const response = await axios.get(url, {
          headers: { 'Authorization': req.headers.authorization },
          timeout: 15000
        });
        const dataKey = tableName.toLowerCase() + 's';
        const items = response.data[dataKey] || response.data.data || [];
        result.tables[tableName] = items;
      } catch (err) {
        result.tables[tableName] = { _error: err.message || 'Erreur' };
      }
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="export-all_${new Date().toISOString().slice(0, 10)}.json"`);
    res.json(result);
  } catch (error) {
    logger.error('Erreur export global:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Lister toutes les tables disponibles
 */
const listTables = async (req, res) => {
  try {
    // Vérifier les permissions admin
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé'
      });
    }

    const tables = Object.keys(TABLE_SERVICE_MAP).map(tableName => ({
      name: tableName,
      service: TABLE_SERVICE_MAP[tableName].service,
      endpoint: TABLE_SERVICE_MAP[tableName].endpoint
    }));

    res.json({
      success: true,
      tables,
      count: tables.length
    });

  } catch (error) {
    logger.error('Erreur listing tables:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Opérations en masse
 */
const bulkOperation = async (req, res) => {
  try {
    const { tableName } = req.params;
    const { operation, ids, data } = req.body;

    // Vérifier les permissions SUPER_ADMIN uniquement pour les opérations en masse
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Seuls les Super Admins peuvent effectuer des opérations en masse'
      });
    }

    const tableConfig = TABLE_SERVICE_MAP[tableName];
    if (!tableConfig) {
      return res.status(404).json({
        success: false,
        error: `Table ${tableName} non trouvée`
      });
    }

    logger.info(`⚙️ Super Admin ${req.user.email} effectue une opération en masse sur ${tableName}: ${operation}`);

    const serviceUrl = SERVICE_URLS[tableConfig.service];
    const results = [];

    if (operation === 'DELETE') {
      // Supprimer plusieurs enregistrements
      for (const id of ids) {
        try {
          await axios.delete(`${serviceUrl}${tableConfig.endpoint}/${id}`, {
            headers: { 'Authorization': req.headers.authorization }
          });
          results.push({ id, success: true });
        } catch (error) {
          results.push({ id, success: false, error: error.message });
        }
      }
    } else if (operation === 'UPDATE') {
      // Mettre à jour plusieurs enregistrements
      for (const id of ids) {
        try {
          await axios.put(`${serviceUrl}${tableConfig.endpoint}/${id}`, data, {
            headers: { 
              'Authorization': req.headers.authorization,
              'Content-Type': 'application/json'
            }
          });
          results.push({ id, success: true });
        } catch (error) {
          results.push({ id, success: false, error: error.message });
        }
      }
    }

    const successCount = results.filter(r => r.success).length;

    res.json({
      success: true,
      operation,
      totalProcessed: results.length,
      successCount,
      failedCount: results.length - successCount,
      results
    });

  } catch (error) {
    logger.error('Erreur opération en masse:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getTableData,
  createRecord,
  updateRecord,
  deleteRecord,
  exportTable,
  exportAllTables,
  listTables,
  bulkOperation
};

