const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { authenticate } = require('../middlewares/auth.middleware');
const controller = require('../controllers/interview.controller');

// Validations
const createValidation = [
  body('applicationId').notEmpty().withMessage('ID candidature requis'),
  body('type').notEmpty().withMessage('Type requis'),
  body('scheduledAt').notEmpty().withMessage('Date requise')
];

const updateValidation = [
  param('id').isString().withMessage('ID invalide')
];

// Routes publiques
router.get('/health', controller.getHealth);

// Routes protégées
router.use(authenticate);

router.post('/', createValidation, controller.createInterview);
router.get('/', controller.getInterviews);
router.get('/:id', param('id').isString(), controller.getInterview);
router.put('/:id', updateValidation, controller.updateInterview);
router.delete('/:id', param('id').isString(), controller.deleteInterview);

module.exports = router;
