const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { authenticate } = require('../middlewares/auth.middleware');
const controller = require('../controllers/call.controller');

// Validations
const createValidation = [
  body('applicationId').notEmpty().withMessage('ID candidature requis'),
  body('type').notEmpty().withMessage('Type requis'),
  body('scheduledDate').notEmpty().withMessage('Date requise')
];

const updateValidation = [
  param('id').isString().withMessage('ID invalide')
];

// Routes publiques
router.get('/health', controller.getHealth);

// Routes protégées
router.use(authenticate);

router.post('/', createValidation, controller.createCall);
router.get('/', controller.getCalls);
router.get('/:id', param('id').isString(), controller.getCall);
router.put('/:id', updateValidation, controller.updateCall);
router.delete('/:id', param('id').isString(), controller.deleteCall);
router.put('/:id/complete', param('id').isString(), controller.completeCall);

// Nouvelles routes pour les statistiques et appels par candidature
router.get('/stats/overview', controller.getCallStats);
router.get('/application/:applicationId', param('applicationId').isString(), controller.getCallsByApplication);

module.exports = router;

