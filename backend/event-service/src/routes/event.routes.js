const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { authenticate } = require('../middlewares/auth.middleware');
const controller = require('../controllers/event.controller');

// Validations
const createValidation = [
  body('title').notEmpty().withMessage('Titre requis'),
  body('type').notEmpty().withMessage('Type requis'),
  body('date').notEmpty().withMessage('Date requise')
];

const updateValidation = [
  param('id').isString().withMessage('ID invalide')
];

// Routes publiques
router.get('/health', controller.getHealth);

// Routes protégées
router.use(authenticate);

router.post('/', createValidation, controller.createEvent);
router.get('/', controller.getEvents);
router.get('/:id', param('id').isString(), controller.getEvent);
router.put('/:id', updateValidation, controller.updateEvent);
router.delete('/:id', param('id').isString(), controller.deleteEvent);

module.exports = router;

