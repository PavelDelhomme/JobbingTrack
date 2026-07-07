const express = require('express');
const router = express.Router();
const advancedController = require('../controllers/admin-advanced.controller');
const adminController = require('../controllers/admin.controller');
const archiveController = require('../controllers/archive.controller');
const trashController = require('../controllers/trash.controller');
const dataManagementController = require('../controllers/data-management.controller');
const testdataController = require('../controllers/testdata.controller');
const logsController = require('../controllers/logs.controller');
const mobileReleasesController = require('../controllers/mobile-releases.controller');
const { authenticateAdmin } = require('../middleware/adminAuth');

// Routes de base qui fonctionnent
router.get('/monitoring/performance', authenticateAdmin, advancedController.getPerformanceMetrics);
router.get('/monitoring/system', authenticateAdmin, advancedController.getSystemMetrics);
router.get('/monitoring/system/detailed', authenticateAdmin, advancedController.getDetailedSystemMetrics);
router.get('/monitoring/users', authenticateAdmin, advancedController.getUserMetrics);
router.get('/monitoring/security', authenticateAdmin, advancedController.getSecurityMetrics);
router.get('/monitoring/devops', authenticateAdmin, advancedController.getDevOpsMetrics);
router.get('/monitoring/recommendations', authenticateAdmin, advancedController.getRecommendations);
router.get('/monitoring/alerts', authenticateAdmin, advancedController.getPerformanceAlerts);

// Routes Playwright
router.post('/playwright/run', authenticateAdmin, advancedController.runPlaywrightTests);
router.get('/playwright/result/:executionId', authenticateAdmin, advancedController.getTestResults);
router.get('/playwright/events/:executionId', authenticateAdmin, advancedController.getTestEvents);
router.get('/playwright/report/:executionId', authenticateAdmin, advancedController.getTestReport);

// ✅ Logs Docker (tous services) — chemins statiques avant /services/:id
router.get('/logs/all', authenticateAdmin, logsController.getAllLogs);
router.get('/logs/services', authenticateAdmin, logsController.getAvailableServices);
router.get('/logs/:serviceName/stream', authenticateAdmin, logsController.streamServiceLogs);
router.get('/logs/:serviceName', authenticateAdmin, logsController.getServiceLogs);

// ✅ Routes de gestion des services (restart, start, stop)
router.post('/services/restart', authenticateAdmin, adminController.restartService);
router.post('/services/start', authenticateAdmin, adminController.startService);
router.post('/services/stop', authenticateAdmin, adminController.stopService);

// ✅ Route pour récupérer la liste des services avec leur statut
router.get('/services', authenticateAdmin, adminController.getServicesList);

// ✅ Routes Archive
router.get('/archive', authenticateAdmin, archiveController.getAllArchivedItems);
router.post('/archive/:type/:id', authenticateAdmin, archiveController.archiveItem);
router.post('/archive/:type/:id/unarchive', authenticateAdmin, archiveController.unarchiveItem);

// ✅ Routes Corbeille (Trash)
router.get('/trash', authenticateAdmin, trashController.getAllDeletedItems);
router.post('/trash/:type/:id/restore', authenticateAdmin, trashController.restoreItem);
router.delete('/trash/:type/:id/permanent', authenticateAdmin, trashController.permanentDelete);
router.post('/trash/empty', authenticateAdmin, trashController.emptyTrash);

// ✅ Génération / nettoyage données de test
router.post('/generate-test-data', authenticateAdmin, testdataController.generateTestData);
router.post('/test-data/clear', authenticateAdmin, testdataController.clearTestData);
router.post('/clear-test-data', authenticateAdmin, testdataController.clearTestData); // Alias pour backoffice Actions « Revenir à la base propre »
router.get('/test-data/status', authenticateAdmin, testdataController.getTestDataStatus);
router.get('/test-data/summary', authenticateAdmin, testdataController.getTestDataSummary);
router.post('/test-data/tag-likely', authenticateAdmin, testdataController.tagLikelyTestData);

// ✅ Export / Import / Cleanup (gestion des données)
// Type frontend : applications, companies, contacts, all -> tableName backend (Application, Company, Contact)
router.get('/export/:type', authenticateAdmin, (req, res, next) => {
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
router.post('/import', authenticateAdmin, (req, res) => {
  res.status(501).json({ success: false, error: 'Import non implémenté côté gateway. À brancher sur les services métier.' });
});
router.post('/cleanup', authenticateAdmin, (req, res) => {
  res.status(501).json({ success: false, error: 'Nettoyage (cleanup) non implémenté. À définir (quel service, quelles tables, rétention).' });
});

// Tables (data-management) : liste et export par tableName
router.get('/tables', authenticateAdmin, dataManagementController.listTables);
router.get('/tables/:tableName/data', authenticateAdmin, dataManagementController.getTableData);
router.get('/tables/:tableName/export', authenticateAdmin, dataManagementController.exportTable);

// Debug: ajouter une route de test
router.get('/test', authenticateAdmin, (req, res) => {
  res.json({ success: true, message: 'Route admin test fonctionne!' });
});

// Mobile releases (OTA) — pilotage dev / production depuis backoffice
router.get('/mobile/releases', authenticateAdmin, mobileReleasesController.listReleases);
router.post('/mobile/releases/publish-built', authenticateAdmin, mobileReleasesController.publishBuiltRelease);
router.post('/mobile/releases/upload', authenticateAdmin, (req, res, next) => {
  let mobileApkUpload;
  try {
    ({ mobileApkUpload } = require('../middleware/mobileApkUpload'));
  } catch (error) {
    return res.status(503).json({
      success: false,
      error:
        'Upload APK indisponible : dépendance multer absente. '
        + 'Dans le conteneur api-gateway : npm install puis redémarrer le service.',
      detail: error.message,
    });
  }
  return mobileApkUpload.single('apk')(req, res, (uploadErr) => {
    if (uploadErr) return next(uploadErr);
    return mobileReleasesController.uploadRelease(req, res);
  });
});
router.post('/mobile/releases/promote', authenticateAdmin, mobileReleasesController.promoteToProduction);
router.post('/mobile/releases/ios', authenticateAdmin, mobileReleasesController.registerIosRelease);
router.patch(
  '/mobile/releases/channels/:channel/:platform',
  authenticateAdmin,
  mobileReleasesController.patchChannelPolicy,
);
router.post(
  '/mobile/releases/:id/activate',
  authenticateAdmin,
  mobileReleasesController.activateExistingRelease,
);

module.exports = router;
