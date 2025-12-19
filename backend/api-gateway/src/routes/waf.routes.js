/**
 * Routes pour la gestion du WAF (Web Application Firewall)
 */

const express = require('express');
const router = express.Router();
const { getWAFStats, WAF_RULES, BLACKLISTED_IPS, WHITELISTED_IPS, blacklistIP } = require('../middleware/waf');
const logger = require('../utils/logger');

// GET /api/v1/waf/stats - Statistiques WAF
router.get('/stats', async (req, res) => {
  try {
    const stats = await getWAFStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Erreur récupération stats WAF:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques WAF'
    });
  }
});

// GET /api/v1/waf/rules - Liste des règles WAF
router.get('/rules', (req, res) => {
  try {
    const rules = Object.keys(WAF_RULES).map(ruleName => ({
      name: ruleName,
      ...WAF_RULES[ruleName],
      patternsCount: WAF_RULES[ruleName].patterns.length
    }));
    
    res.json({
      success: true,
      data: rules
    });
  } catch (error) {
    logger.error('Erreur récupération règles WAF:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des règles WAF'
    });
  }
});

// GET /api/v1/waf/blacklist - Liste des IPs blacklistées
router.get('/blacklist', (req, res) => {
  try {
    res.json({
      success: true,
      data: BLACKLISTED_IPS.map(ip => ({ ip }))
    });
  } catch (error) {
    logger.error('Erreur récupération blacklist:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de la blacklist'
    });
  }
});

// GET /api/v1/waf/whitelist - Liste des IPs whitelistées
router.get('/whitelist', (req, res) => {
  try {
    res.json({
      success: true,
      data: WHITELISTED_IPS.map(ip => ({ ip }))
    });
  } catch (error) {
    logger.error('Erreur récupération whitelist:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de la whitelist'
    });
  }
});

module.exports = router;

