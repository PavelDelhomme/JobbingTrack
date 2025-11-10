const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { authenticate } = require('../middlewares/auth.middleware');
const controller = require('../controllers/call.controller');

// Validations
const createValidation = [
  body('applicationId').isString().withMessage('ID candidature invalide'),
  body('subject').isString().withMessage('Sujet requis'),
  body('callDate')
    .custom((value, { req }) => value || req.body.scheduledDate)
    .withMessage('Date d\'appel requise'),
  body('status')
    .optional()
    .isString()
];

const updateValidation = [
  param('id').isString().withMessage('ID invalide')
];

// Routes publiques
router.get('/health', controller.getHealth);

// Routes protégées
router.use(authenticate);

// ✅ Routes avec paramètres spécifiques AVANT les routes avec :id
router.get('/stats/overview', controller.getCallStats);
router.get('/application/:applicationId', param('applicationId').isString(), controller.getCallsByApplication);

// Routes CRUD générales
router.post('/', createValidation, controller.createCall);
router.get('/', controller.getCalls);
router.get('/:id', param('id').isString(), controller.getCall);
router.put('/:id', updateValidation, controller.updateCall);
router.delete('/:id', param('id').isString(), controller.deleteCall);
router.put('/:id/complete', param('id').isString(), controller.completeCall);

module.exports = router;

