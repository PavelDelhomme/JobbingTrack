const express = require('express');
const router = express.Router();
const deploymentController = require('../controllers/deploymentController');

// Créer un nouveau déploiement
router.post('/', deploymentController.createDeployment);

// Récupérer tous les déploiements
router.get('/', deploymentController.getDeployments);

// Récupérer un déploiement par ID
router.get('/:id', deploymentController.getDeploymentById);

// Mettre à jour le statut d'un déploiement
router.patch('/:id/status', deploymentController.updateDeploymentStatus);

// Récupérer les métriques de déploiement pour les analytics
router.get('/metrics/analytics', deploymentController.getDeploymentMetrics);

// Récupérer les statistiques de déploiement
router.get('/stats/overview', deploymentController.getDeploymentStats);

module.exports = router;
