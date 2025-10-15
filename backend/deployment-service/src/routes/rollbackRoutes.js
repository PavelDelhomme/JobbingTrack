const express = require('express');
const router = express.Router();
const rollbackController = require('../controllers/rollbackController');

// Créer une demande de rollback
router.post('/', rollbackController.createRollback);

// Récupérer tous les rollbacks
router.get('/', rollbackController.getRollbacks);

// Récupérer un rollback par ID
router.get('/:id', rollbackController.getRollbackById);

// Mettre à jour le statut d'un rollback
router.patch('/:id/status', rollbackController.updateRollbackStatus);

// Récupérer les statistiques de rollback
router.get('/stats/overview', rollbackController.getRollbackStats);

module.exports = router;
