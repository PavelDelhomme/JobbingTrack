const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');
const authController = require('../controllers/auth.controller');
const userController = require('../controllers/user.controller');

// ✅ Toutes les routes sont protégées et nécessitent une authentification
router.use(authenticate);

// Routes CRUD utilisateurs (alias vers auth controller pour compatibilité)
router.get('/', authController.getAllUsers);
router.get('/:id', userController.getUserById);
router.put('/:id', userController.updateUser);
router.delete('/:id', authController.deleteUser);

// Routes d'administration
router.put('/:id/role', authController.updateUserRole);
router.put('/:id/status', authController.toggleUserStatus);
router.post('/:id/impersonate', userController.impersonateUser);

// Routes de vérification email
router.post('/:id/send-verification', userController.sendVerificationEmail);
router.post('/:id/resend-verification', userController.resendVerificationEmail);

// Route pour envoyer un email de réinitialisation de mot de passe (admin)
router.post('/:id/send-password-reset', authController.sendPasswordResetForUser);

module.exports = router;
