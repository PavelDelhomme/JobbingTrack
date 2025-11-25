const express = require('express');
const router = express.Router();
const advancedController = require('../controllers/admin-advanced.controller');
const adminController = require('../controllers/admin.controller');
const archiveController = require('../controllers/archive.controller');
const trashController = require('../controllers/trash.controller');

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

// Debug: ajouter une route de test
router.get('/test', authenticate, (req, res) => {
  res.json({ success: true, message: 'Route admin test fonctionne!' });
});

module.exports = router;
