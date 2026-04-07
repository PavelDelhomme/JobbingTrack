const express = require('express');
const router = express.Router();
const advancedController = require('../controllers/admin-advanced.controller');
const adminController = require('../controllers/admin.controller');
const archiveController = require('../controllers/archive.controller');
const trashController = require('../controllers/trash.controller');
const dataManagementController = require('../controllers/data-management.controller');
const testdataController = require('../controllers/testdata.controller');
const logsController = require('../controllers/logs.controller');

// Middleware d'authentification basique pour le développement
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // En mode développement, accepter tous les tokens qui contiennent 'mock-'
  if (authHeader?.includes('mock-')) {
    req.user = {
      role: 'SUPER_ADMIN',
      email: 'admin@jobbingtrack.com',
      id: 'mock-admin-123'
    };
    return next();
  }

  // Si pas de token ou token invalide, retourner une erreur
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Token d\'authentification requis'
    });
  }

  // En mode développement, accepter aussi les tokens Bearer normaux
  req.user = {
    role: 'ADMIN',
    email: 'user@jobbingtrack.com',
    id: 'user-123'
  };
  next();
};

// Routes de base qui fonctionnent
router.get('/monitoring/performance', authenticate, advancedController.getPerformanceMetrics);
router.get('/monitoring/system', authenticate, advancedController.getSystemMetrics);
router.get('/monitoring/system/detailed', authenticate, advancedController.getDetailedSystemMetrics);
router.get('/monitoring/users', authenticate, advancedController.getUserMetrics);
router.get('/monitoring/security', authenticate, advancedController.getSecurityMetrics);
router.get('/monitoring/devops', authenticate, advancedController.getDevOpsMetrics);
router.get('/monitoring/recommendations', authenticate, advancedController.getRecommendations);
router.get('/monitoring/alerts', authenticate, advancedController.getPerformanceAlerts);

// Routes Playwright
router.post('/playwright/run', authenticate, advancedController.runPlaywrightTests);
router.get('/playwright/result/:executionId', authenticate, advancedController.getTestResults);
router.get('/playwright/events/:executionId', authenticate, advancedController.getTestEvents);
router.get('/playwright/report/:executionId', authenticate, advancedController.getTestReport);

// ✅ Logs Docker (tous services) — chemins statiques avant /services/:id
router.get('/logs/all', authenticate, logsController.getAllLogs);
router.get('/logs/services', authenticate, logsController.getAvailableServices);
router.get('/logs/:serviceName/stream', authenticate, logsController.streamServiceLogs);
router.get('/logs/:serviceName', authenticate, logsController.getServiceLogs);

// ✅ Routes de gestion des services (restart, start, stop)
router.post('/services/restart', authenticate, adminController.restartService);
router.post('/services/start', authenticate, adminController.startService);
router.post('/services/stop', authenticate, adminController.stopService);

// ✅ Route pour récupérer la liste des services avec leur statut
router.get('/services', authenticate, adminController.getServicesList);

// ✅ Routes Archive
router.get('/archive', authenticate, archiveController.getAllArchivedItems);
router.post('/archive/:type/:id', authenticate, archiveController.archiveItem);
router.post('/archive/:type/:id/unarchive', authenticate, archiveController.unarchiveItem);

// ✅ Routes Corbeille (Trash)
router.get('/trash', authenticate, trashController.getAllDeletedItems);
router.post('/trash/:type/:id/restore', authenticate, trashController.restoreItem);
router.delete('/trash/:type/:id/permanent', authenticate, trashController.permanentDelete);
router.post('/trash/empty', authenticate, trashController.emptyTrash);

// ✅ Génération / nettoyage données de test
router.post('/generate-test-data', authenticate, testdataController.generateTestData);
router.post('/test-data/clear', authenticate, testdataController.clearTestData);
router.post('/clear-test-data', authenticate, testdataController.clearTestData); // Alias pour backoffice Actions « Revenir à la base propre »
router.get('/test-data/status', authenticate, testdataController.getTestDataStatus);

// ✅ Export / Import / Cleanup (gestion des données)
// Type frontend : applications, companies, contacts, all -> tableName backend (Application, Company, Contact)
router.get('/export/:type', authenticate, (req, res, next) => {
  const typeMap = { applications: 'Application', companies: 'Company', contacts: 'Contact' };
  const type = req.params.type;
  if (type === 'all') {
    return dataManagementController.exportAllTables(req, res).catch(next);
  }
  const tableName = typeMap[type];
  if (!tableName) {
    return res.status(400).json({ success: false, error: 'Type d\'export inconnu. Utilisez: applications, companies, contacts, all' });
  }
  req.params.tableName = tableName;
  return dataManagementController.exportTable(req, res).catch(next);
});
router.post('/import', authenticate, (req, res) => {
  res.status(501).json({ success: false, error: 'Import non implémenté côté gateway. À brancher sur les services métier.' });
});
router.post('/cleanup', authenticate, (req, res) => {
  res.status(501).json({ success: false, error: 'Nettoyage (cleanup) non implémenté. À définir (quel service, quelles tables, rétention).' });
});

// Tables (data-management) : liste et export par tableName
router.get('/tables', authenticate, dataManagementController.listTables);
router.get('/tables/:tableName/data', authenticate, dataManagementController.getTableData);
router.get('/tables/:tableName/export', authenticate, dataManagementController.exportTable);

// Debug: ajouter une route de test
router.get('/test', authenticate, (req, res) => {
  res.json({ success: true, message: 'Route admin test fonctionne!' });
});

module.exports = router;
