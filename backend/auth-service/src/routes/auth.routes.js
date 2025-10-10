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
  body('lastName').notEmpty()
], authController.register);

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], authController.login);

router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);

// Routes protégées
router.get('/profile', authenticate, authController.getProfile);

// ✅ ADMIN - Routes de gestion des utilisateurs
router.get('/users', authenticate, authController.getAllUsers);
router.put('/users/:id/role', authenticate, authController.updateUserRole);
router.put('/users/:id/status', authenticate, authController.toggleUserStatus);
router.delete('/users/:id', authenticate, authController.deleteUser);

module.exports = router;
