const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metricsController');

// Récupérer les métriques système actuelles
router.get('/system', metricsController.getSystemMetrics);

// Récupérer les métriques système en temps réel
router.get('/system/realtime', metricsController.getRealtimeSystemMetrics);

// Récupérer les métriques d'endpoints
router.get('/endpoints', metricsController.getEndpointMetrics);

// Récupérer l'historique des métriques système
router.get('/system/history', metricsController.getSystemMetricsHistory);

// Récupérer l'historique des métriques de performance
router.get('/performance/history', metricsController.getPerformanceMetricsHistory);

// Enregistrer une métrique de performance
router.post('/performance', metricsController.recordPerformanceMetric);

module.exports = router;
