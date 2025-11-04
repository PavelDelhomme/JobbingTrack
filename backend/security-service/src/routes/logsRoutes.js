const express = require('express');
const router = express.Router();
const securityController = require('../controllers/securityController');

// Récupérer les logs de sécurité avec filtres
router.get('/', securityController.getSecurityLogs);

// Créer un log de sécurité (appelé par d'autres services)
router.post('/', securityController.createSecurityLog);

module.exports = router;
