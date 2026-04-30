const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const controller = require('../controllers/statistics.controller');

// Route principale pour les statistiques agrégées (avec auth optionnel)
// L'authentification sera vérifiée par l'API Gateway
router.get('/', controller.getAggregatedStatistics);
router.get('/timeline', controller.getStatisticsTimeline);
router.get('/summary', controller.getStatisticsSummary);
router.post('/collect', controller.collectStatistics);

module.exports = router;

