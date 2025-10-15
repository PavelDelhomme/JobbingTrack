const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metricsController');

// Enregistrer une métrique pour un déploiement spécifique
router.post('/:deploymentId/metrics', metricsController.recordMetric);

// Récupérer les métriques d'un déploiement spécifique
router.get('/:deploymentId/metrics', metricsController.getDeploymentMetrics);

// Récupérer les métriques agrégées par type
router.get('/aggregated', metricsController.getAggregatedMetrics);

// Récupérer les tendances de performance
router.get('/trends/performance', metricsController.getPerformanceTrends);

module.exports = router;
