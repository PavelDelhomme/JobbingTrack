const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { authenticate } = require('../middlewares/auth.middleware');
const controller = require('../controllers/event.controller');

// Validations
const createValidation = [
  body('type').notEmpty().withMessage('Type requis'),
  body('description').notEmpty().withMessage('Description requise')
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

module.exports = router;
