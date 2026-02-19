const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const dashboardController = require('../controllers/dashboard.controller');
const statisticsController = require('../controllers/statistics.controller');

// Routes publiques
router.get('/health', dashboardController.getHealth);
router.get('/stats/public', statisticsController.getAggregatedStatistics);

// Routes protégées (statistics utilise les appels HTTP aux services, pas Prisma Application/Company)
router.use(authenticate);

router.get('/stats', statisticsController.getAggregatedStatistics);
router.get('/statistics', statisticsController.getAggregatedStatistics); // Alias pour compatibilité API Gateway

module.exports = router;
