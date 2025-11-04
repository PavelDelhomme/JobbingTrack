const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const controller = require('../controllers/dashboard.controller');

// Routes publiques
router.get('/health', controller.getHealth);
router.get('/stats/public', controller.getStats);

// Routes protégées
router.use(authenticate);

router.get('/stats', controller.getStats);
router.get('/statistics', controller.getStats); // Alias pour compatibilité API Gateway

module.exports = router;
