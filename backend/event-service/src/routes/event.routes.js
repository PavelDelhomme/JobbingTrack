const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { authenticate } = require('../middlewares/auth.middleware');
const controller = require('../controllers/event.controller');

// Validations
const createValidation = [
  body('title').isString().withMessage('Titre requis'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Date de début invalide'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Date de fin invalide')
];

const updateValidation = [
  param('id').isString().withMessage('ID invalide'),
  body('title').optional().isString(),
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601()
];

// Routes publiques
router.get('/health', controller.getHealth);

// Routes protégées
router.use(authenticate);

// Routes timeline et événements
router.get('/', controller.getAllEvents);
router.get('/stats', controller.getEventStats);
router.get('/export', controller.exportTimeline);
router.get('/timeline/:entityType/:entityId', controller.getTimeline);
router.post('/', createValidation, controller.createEvent);
router.put('/:id', updateValidation, controller.updateEvent);
router.delete('/:id', param('id').isString().withMessage('ID invalide'), controller.deleteEvent);

module.exports = router;
