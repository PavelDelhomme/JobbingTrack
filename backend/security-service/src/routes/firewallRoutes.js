/**
 * Routes pour la gestion du firewall
 */

const express = require('express');
const router = express.Router();
const firewallController = require('../controllers/firewallController');

// Note: securityMiddleware.analyzeRequest est déjà appliqué globalement dans server.js
// Les routes sont protégées par le middleware de sécurité global

// Routes pour les règles de firewall
router.get('/rules', firewallController.getFirewallRules);
router.post('/rules', firewallController.createFirewallRule);
router.put('/rules/:id', firewallController.updateFirewallRule);
router.delete('/rules/:id', firewallController.deleteFirewallRule);

// Routes pour les menaces réseau
router.get('/threats', firewallController.getNetworkThreats);
router.post('/threats/:id/block', firewallController.blockThreat);

// Routes pour les statistiques réseau
router.get('/network/stats', firewallController.getNetworkStats);
router.get('/network/containers/:containerId', firewallController.getContainerStats);

// Routes pour bloquer/débloquer des IPs
router.post('/block-ip', firewallController.blockIp);
router.post('/unblock-ip', firewallController.unblockIp);
router.get('/blocked-ips', firewallController.getBlockedIps);

module.exports = router;

