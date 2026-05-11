const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { authenticate } = require('../middlewares/auth.middleware');
const controller = require('../controllers/notification.controller');

const authenticateInternalSecret = (req, res, next) => {
  const internalSecret = process.env.SECURITY_INTERNAL_SECRET;
  const providedSecret = req.get('X-Internal-Secret') || req.get('x-internal-secret');

  if (!internalSecret || providedSecret !== internalSecret) {
    return res.status(403).json({
      success: false,
      error: 'Accès interne refusé'
    });
  }

  return next();
};

// Validations
const createValidation = [
  body('title').notEmpty().withMessage('Titre requis'),
  body('type').notEmpty().withMessage('Type requis')
];

const updateValidation = [
  param('id').isString().withMessage('ID invalide')
];

// Routes publiques
router.get('/health', controller.getHealth);
router.post('/internal/security-alert-email', authenticateInternalSecret, [
  body('to').isEmail(),
  body('subject').notEmpty(),
  body('html').notEmpty()
], controller.sendInternalSecurityAlertEmail);

// Routes protégées
router.use(authenticate);

// Routes notifications
router.post('/', createValidation, controller.createNotification);
router.get('/', controller.getNotifications);
router.get('/stats', controller.getStats);
router.put('/mark-all-read', controller.markAllAsRead);

// Routes emails
router.get('/emails/logs', controller.getEmailLogs);
router.post('/emails/send', [
  body('to').isEmail(),
  body('subject').notEmpty(),
  body('body').notEmpty()
], controller.sendEmail);

// Routes rappels automatiques
router.get('/reminders/automated', controller.getAutomatedReminders);
router.post('/reminders/automated', [
  body('type').notEmpty(),
  body('title').notEmpty(),
  body('triggerType').notEmpty()
], controller.createAutomatedReminder);
router.put('/reminders/automated/:id', param('id').isString(), controller.updateAutomatedReminder);
router.delete('/reminders/automated/:id', param('id').isString(), controller.deleteAutomatedReminder);

// Routes avec parametres dynamiques (en dernier)
router.get('/:id', param('id').isString(), controller.getNotification);
router.delete('/:id', param('id').isString(), controller.deleteNotification);
router.put('/:id/mark-read', param('id').isString(), controller.markAsRead);

module.exports = router;
