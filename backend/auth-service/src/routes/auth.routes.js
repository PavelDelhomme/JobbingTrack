const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Service d\'authentification opérationnel',
    service: 'auth-service',
    timestamp: new Date().toISOString()
  });
});

// Routes publiques
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').notEmpty(),
  body('lastName').notEmpty(),
  body('role').optional().isIn(['USER', 'ADMIN', 'SUPER_ADMIN', 'TESTER'])
], authController.register);

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], authController.login);

router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);

// Routes publiques - Réinitialisation de mot de passe
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail()
], authController.forgotPassword);

router.get('/reset-password/:token', authController.verifyResetToken);
router.post('/reset-password/:token', [
  body('password').isLength({ min: 6 })
], authController.resetPassword);

// Routes protégées
router.get('/profile', authenticate, authController.getProfile);

// ✅ ADMIN - Routes de gestion des utilisateurs
router.get('/users', authenticate, authController.getAllUsers);
router.put('/users/:id/role', authenticate, authController.updateUserRole);
router.put('/users/:id/status', authenticate, authController.toggleUserStatus);
router.delete('/users/:id', authenticate, authController.deleteUser);

// ✅ ADMIN - Nouvelles routes pour les métriques de sécurité (temporairement désactivées)
// router.get('/sessions/active', authenticate, authController.getActiveSessions);
// router.get('/security/metrics', authenticate, authController.getSecurityMetrics);

// ✅ CUSTOMIZATION - Routes pour la personnalisation utilisateur
router.get('/customization', authenticate, authController.getUserCustomization);

router.put('/customization', authenticate, [
  body('theme').optional().isIn(['light', 'dark', 'auto']),
  body('language').optional().isLength({ min: 2, max: 5 }),
  body('dashboardLayout').optional().isIn(['grid', 'list', 'kanban']),
  body('primaryColor').optional().isHexColor(),
  body('accentColor').optional().isHexColor(),
  body('notifications').optional().isObject(),
  body('metricsDisplay').optional().isObject(),
  body('sidebarCollapsed').optional().isBoolean(),
  body('compactMode').optional().isBoolean(),
  body('showAnimations').optional().isBoolean(),
  body('itemsPerPage').optional().isInt({ min: 5, max: 100 }),
  body('autoRefresh').optional().isBoolean(),
  body('refreshInterval').optional().isInt({ min: 5, max: 300 }),
  body('accessibility').optional().isObject(),
  body('dataRetention').optional().isObject()
], authController.saveUserCustomization);

module.exports = router;
