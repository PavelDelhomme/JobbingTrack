const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const controller = require('../controllers/statistics.controller');

// Routes protégées
router.use(authenticate);

// Route principale pour les statistiques agrégées
router.get('/', controller.getAggregatedStatistics);

module.exports = router;

