const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const emailController = require('../controllers/email.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// Routes pour les logs d'emails
router.get('/logs', emailController.getEmailLogs);
router.get('/logs/:id', emailController.getEmailLog);

// Statistiques
router.get('/stats', emailController.getEmailStats);

// Envoyer un email de test (admin seulement)
router.post('/test', [
  body('to').isEmail().normalizeEmail(),
  body('subject').notEmpty(),
  body('content').optional()
], emailController.sendTestEmail);

// Renvoyer un email
router.post('/resend/:id', emailController.resendEmail);

// Tests de déliverabilité
router.get('/test-dns', emailController.testDNS);
router.get('/test-smtp', emailController.testSMTPConnection);

module.exports = router;

