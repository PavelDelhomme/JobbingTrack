const express = require('express');
const router = express.Router();
const advancedController = require('../controllers/admin-advanced.controller');

// Middleware d'authentification basique pour le développement
const authenticate = (req, res, next) => {
  // En mode développement, accepter tous les tokens
  if (req.headers.authorization?.includes('mock-jwt-token-')) {
    req.user = { role: 'SUPER_ADMIN' };
    return next();
  }
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

module.exports = router;
