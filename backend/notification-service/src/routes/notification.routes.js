const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { authenticate } = require('../middlewares/auth.middleware');
const controller = require('../controllers/notification.controller');

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

// Routes protégées
router.use(authenticate);

router.post('/', createValidation, controller.createNotification);
router.get('/', controller.getNotifications);
router.get('/:id', param('id').isString(), controller.getNotification);
router.put('/:id', updateValidation, controller.updateNotification);
router.delete('/:id', param('id').isString(), controller.deleteNotification);
router.put('/:id/mark-read', param('id').isString(), controller.markAsRead);

module.exports = router;
