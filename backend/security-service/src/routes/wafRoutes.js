/**
 * Routes pour la gestion du WAF (Web Application Firewall)
 */

const express = require('express');
const router = express.Router();
const wafController = require('../controllers/wafController');

// Note: securityMiddleware.analyzeRequest est déjà appliqué globalement dans server.js
// Les routes sont protégées par le middleware de sécurité global

// GET /api/v1/security/waf/config - Configuration WAF
router.get('/config', wafController.getWafConfig);

// PUT /api/v1/security/waf/toggle - Activer/désactiver WAF
router.put('/toggle', wafController.toggleWaf);

// PUT /api/v1/security/waf/rules/:ruleName - Activer/désactiver une règle
router.put('/rules/:ruleName', wafController.toggleWafRule);

// GET /api/v1/security/waf/stats - Statistiques WAF
router.get('/stats', wafController.getWafStats);

module.exports = router;

