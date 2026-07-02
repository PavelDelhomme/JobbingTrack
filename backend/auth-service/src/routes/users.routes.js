const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');
const authController = require('../controllers/auth.controller');
const userController = require('../controllers/user.controller');

// ✅ Toutes les routes sont protégées et nécessitent une authentification
router.use(authenticate);

// Routes CRUD utilisateurs (alias vers auth controller pour compatibilité)
router.get('/', authController.getAllUsers);
router.post('/clean-test-users', requireAdmin, authController.cleanTestUsers);
router.get('/:id', userController.getUserById);
router.put('/:id', userController.updateUser);
router.delete('/:id', requireAdmin, authController.deleteUser);

// Routes d'administration (ADMIN / SUPER_ADMIN)
router.put('/:id/role', requireAdmin, authController.updateUserRole);
router.put('/:id/status', requireAdmin, authController.toggleUserStatus);
router.post('/:id/impersonate', requireAdmin, userController.impersonateUser);

// Routes de vérification email
router.post('/:id/send-verification', requireAdmin, userController.sendVerificationEmail);
router.post('/:id/resend-verification', requireAdmin, userController.resendVerificationEmail);

// Route pour envoyer un email de réinitialisation de mot de passe (admin)
router.post('/:id/send-password-reset', requireAdmin, authController.sendPasswordResetForUser);

module.exports = router;
