const express = require('express');
const router = express.Router();
const securityController = require('../controllers/securityController');

// Récupérer les logs de sécurité avec filtres
router.get('/', securityController.getSecurityLogs);

module.exports = router;
