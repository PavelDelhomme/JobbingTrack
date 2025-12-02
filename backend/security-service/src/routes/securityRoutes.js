const express = require('express');
const router = express.Router();
const securityController = require('../controllers/securityController');

// Récupérer les métriques de sécurité
router.get('/metrics', securityController.getSecurityMetrics);

// Récupérer les logs de sécurité
router.get('/logs', securityController.getSecurityLogs);

// Créer un log de sécurité
router.post('/logs', securityController.createSecurityLog);

// Récupérer les statistiques de sécurité détaillées
router.get('/stats', securityController.getSecurityStats);

// Récupérer les tendances de sécurité par heure
router.get('/trends', securityController.getSecurityTrends);

// Récupérer les métriques système en temps réel
router.get('/system-metrics', securityController.getSystemMetrics);

// Déclencher une analyse de sécurité manuelle
router.post('/analyze', securityController.triggerSecurityAnalysis);

// Créer une alerte de sécurité
router.post('/alerts', securityController.createSecurityAlert);

// Récupérer les alertes de sécurité
router.get('/alerts', securityController.getSecurityAlerts);

// Générer des données de développement (pour les tests)
router.post('/generate-dev-data', securityController.generateDevelopmentData);

// Analyser les risques de sécurité en temps réel
router.get('/risk-analysis', securityController.analyzeSecurityRisks);

// Démarrer la génération continue de données de sécurité
router.post('/generate-continuous', securityController.startContinuousGeneration);

// Arrêter la génération continue de données de sécurité
router.delete('/generate-continuous', securityController.stopContinuousGeneration);

// État de la génération continue
router.get('/generate-continuous/status', securityController.getGenerationStatus);

// Récupérer les politiques de sécurité
router.get('/policies', securityController.getPolicies);

// Récupérer les IPs bloquées
router.get('/blocked-ips', securityController.getBlockedIPs);

module.exports = router;
