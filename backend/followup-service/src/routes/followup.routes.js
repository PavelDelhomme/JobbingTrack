const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { authenticate } = require('../middlewares/auth.middleware');
const controller = require('../controllers/followup.controller');

// Validations
const createValidation = [
  body('applicationId').isString().withMessage('ID candidature invalide'),
  body('followUpDate')
    .custom((value, { req }) => value || req.body.scheduledDate || req.body.scheduledFor)
    .withMessage('Date de relance requise'),
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

router.post('/', createValidation, controller.createFollowup);
router.get('/', controller.getFollowups);
router.get('/stats', controller.getStats);
router.get('/suggestions', controller.getSuggestions);
router.get('/:id', param('id').isString(), controller.getFollowup);
router.put('/:id', updateValidation, controller.updateFollowup);
router.delete('/:id', param('id').isString(), controller.deleteFollowup);
router.put('/:id/complete', param('id').isString(), controller.completeFollowup);

module.exports = router;

