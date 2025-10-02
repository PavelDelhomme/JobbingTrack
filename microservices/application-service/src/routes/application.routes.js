const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const controller = require('../controllers/application.controller');

// Routes publiques
router.get('/health', controller.getHealth);

// Routes protégées
// TODO: Ajouter les routes spécifiques au service

module.exports = router;
