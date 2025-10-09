const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const controller = require('../controllers/followup.controller');

// Routes publiques
router.get('/health', controller.getHealth);

// Routes protégées
// TODO: Ajouter les routes spécifiques au service
// - GET /api/v1/followups - Liste des relances
// - POST /api/v1/followups - Créer une relance
// - GET /api/v1/followups/:id - Détails d'une relance
// - PUT /api/v1/followups/:id - Modifier une relance
// - DELETE /api/v1/followups/:id - Supprimer une relance
// - PUT /api/v1/followups/:id/complete - Marquer comme complétée

module.exports = router;

