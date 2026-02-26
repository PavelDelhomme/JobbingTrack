const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { authenticate } = require('../middlewares/auth.middleware');
const controller = require('../controllers/call.controller');
const archiveController = require('../controllers/archive.controller');

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

// Routes avec paramètres spécifiques AVANT les routes avec :id
router.get('/stats/overview', controller.getCallStats);
router.get('/trash', archiveController.getTrash);
router.post('/trash/empty', archiveController.emptyTrash);
router.get('/archived', archiveController.getArchived);
router.get('/application/:applicationId', param('applicationId').isString(), controller.getCallsByApplication);

// Routes CRUD générales
router.post('/', createValidation, controller.createCall);
router.get('/', controller.getCalls);
router.get('/:id', param('id').isString(), controller.getCall);
router.put('/:id', updateValidation, controller.updateCall);
router.delete('/:id', param('id').isString(), controller.deleteCall);
router.put('/:id/complete', param('id').isString(), controller.completeCall);
router.post('/:id/restore', param('id').isString(), archiveController.restoreFromTrash);
router.delete('/:id/permanent', param('id').isString(), archiveController.permanentDelete);
router.post('/:id/archive', param('id').isString(), archiveController.archiveItem);
router.post('/:id/unarchive', param('id').isString(), archiveController.unarchiveItem);

module.exports = router;

