const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const advancedController = require('../controllers/admin-advanced.controller');
const dbTestController = require('../controllers/db-test.controller');
const dataManagementController = require('../controllers/data-management.controller');
const logsController = require('../controllers/logs.controller');
const trashController = require('../controllers/trash.controller');
const archiveController = require('../controllers/archive.controller');
const testDataController = require('../controllers/testdata.controller');
const dockerStatsController = require('../controllers/docker-stats.controller');

// Middleware d'authentification
const authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token manquant'
      });
    }

    // ✅ En mode développement, accepter les tokens mock
    if (process.env.NODE_ENV === 'development' && token.startsWith('mock-jwt-token-')) {
      // Token de développement valide - créer un utilisateur mock
      req.user = {
        id: 'dev_user_1',
        email: 'admin@jobbingtrack.com',
        role: 'SUPER_ADMIN'
      };
      return next();
    }

    // Pour les vrais tokens JWT, décoder normalement
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production-2025');

    // ✅ Créer l'objet user avec toutes les infos du JWT
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role // ✅ Extraire le rôle
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Token invalide'
    });
  }
};

// Routes de gestion des services (admin uniquement)
router.post('/services/restart', authenticate, adminController.restartService);
router.post('/services/stop', authenticate, adminController.stopService);
router.post('/services/start', authenticate, adminController.startService);

// Routes des statistiques Docker (admin uniquement)
router.get('/docker/stats', authenticate, dockerStatsController.getAllDockerStats);
router.get('/docker/stats/:serviceName', authenticate, dockerStatsController.getDockerStatsByService);
router.get('/docker/stats/:serviceName/history', authenticate, dockerStatsController.getDockerStatsHistory);
router.get('/docker/info/:serviceName', authenticate, dockerStatsController.getContainerInfo);


// Routes des logs (admin uniquement)
router.get('/logs/services', authenticate, logsController.getAvailableServices);
router.get('/logs/all', authenticate, logsController.getAllLogs);
router.get('/logs/:serviceName', authenticate, logsController.getServiceLogs);
router.get('/logs/:serviceName/stream', authenticate, logsController.streamServiceLogs); // ✅ NOUVEAU - Stream temps réel

// Routes de la corbeille (admin uniquement)
router.get('/trash', authenticate, trashController.getAllDeletedItems);
router.post('/trash/:type/:id/restore', authenticate, trashController.restoreItem);
router.delete('/trash/:type/:id/permanent', authenticate, trashController.permanentDelete);
router.post('/trash/empty', authenticate, trashController.emptyTrash);

// Routes des archives (admin uniquement)
router.get('/archive', authenticate, archiveController.getAllArchivedItems);
router.post('/archive/:type/:id', authenticate, archiveController.archiveItem);
router.post('/archive/:type/:id/unarchive', authenticate, archiveController.unarchiveItem);

// Routes de génération de données de test (admin uniquement)
router.post('/test-data/generate', authenticate, testDataController.generateTestData);
router.post('/test-data/clear', authenticate, testDataController.clearTestData);
router.get('/test-data/status', authenticate, testDataController.getTestDataStatus);

// Routes fonctionnalités avancées (admin uniquement)
router.get('/duplicates/:entityType', authenticate, advancedController.findDuplicates);
router.post('/duplicates/merge', authenticate, advancedController.mergeDuplicates);
router.get('/stats/global', authenticate, advancedController.getGlobalStats);
router.get('/logs/admin', authenticate, advancedController.getAdminLogs);
router.post('/users/:userId/anonymize', authenticate, advancedController.anonymizeUser);

// Routes de monitoring avancées (admin uniquement)
router.get('/monitoring/performance', authenticate, advancedController.getPerformanceMetrics);
router.get('/monitoring/system', authenticate, advancedController.getSystemMetrics);
router.get('/monitoring/endpoints', authenticate, advancedController.getEndpointMetrics);
router.get('/monitoring/system/detailed', authenticate, advancedController.getDetailedSystemMetrics);
router.get('/monitoring/users', authenticate, advancedController.getUserMetrics);
router.get('/monitoring/security', authenticate, advancedController.getSecurityMetrics);
router.get('/monitoring/devops', authenticate, advancedController.getDevOpsMetrics);
router.get('/monitoring/recommendations', authenticate, advancedController.getRecommendations);
router.get('/monitoring/alerts', authenticate, advancedController.getPerformanceAlerts);

// Routes sécurité avancées (admin uniquement)
router.get('/security/vulnerabilities', authenticate, advancedController.getVulnerabilities);
router.get('/security/logs', authenticate, advancedController.getSecurityLogs);
router.get('/security/metrics', authenticate, advancedController.getSecurityMetrics);

// Routes tests DB (admin uniquement)
router.get('/test-db/connection', authenticate, dbTestController.testConnection);
router.get('/test-db/schema/:serviceName', authenticate, dbTestController.testSchema);
router.post('/test-db/migration-test', authenticate, dbTestController.testMigration);
router.get('/test-db/tables', authenticate, dbTestController.listTables);

// Routes gestion de données (admin uniquement)
router.get('/data/tables', authenticate, dataManagementController.listTables);
router.get('/data/:tableName', authenticate, dataManagementController.getTableData);
router.post('/data/:tableName', authenticate, dataManagementController.createRecord);
router.put('/data/:tableName/:id', authenticate, dataManagementController.updateRecord);
router.delete('/data/:tableName/:id', authenticate, dataManagementController.deleteRecord);
router.get('/export/:tableName', authenticate, dataManagementController.exportTable);
router.post('/data/:tableName/bulk', authenticate, dataManagementController.bulkOperation);

// Routes pour la gestion des utilisateurs de test
router.post('/test-users', authenticate, advancedController.createTestUser);
router.get('/test-users', authenticate, advancedController.listTestUsers);
router.delete('/test-users/:email', authenticate, advancedController.deleteTestUser);

module.exports = router;

