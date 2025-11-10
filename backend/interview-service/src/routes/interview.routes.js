const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { authenticate } = require('../middlewares/auth.middleware');
const controller = require('../controllers/interview.controller');

// Validations
const createValidation = [
  body('applicationId').isString().withMessage('ID candidature invalide'),
  body('interviewDate')
    .custom((value, { req }) => value || req.body.scheduledAt)
    .withMessage('Date d\'entretien requise'),
  body('status')
    .optional()
    .isIn(['SCHEDULED', 'COMPLETED', 'FEEDBACK_PENDING', 'CANCELLED', 'RESCHEDULED'])
    .withMessage('Statut d\'entretien invalide')
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
