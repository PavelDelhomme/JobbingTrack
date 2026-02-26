const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { authenticate } = require('../middlewares/auth.middleware');
const controller = require('../controllers/event.controller');
const archiveController = require('../controllers/archive.controller');

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

// Routes corbeille (avant /:id)
router.get('/trash', archiveController.getTrash);
router.post('/trash/empty', archiveController.emptyTrash);
router.get('/archived', archiveController.getArchived);

// Routes timeline et événements
router.get('/', controller.getAllEvents);
router.get('/stats', controller.getEventStats);
router.get('/export', controller.exportTimeline);
router.get('/timeline/:entityType/:entityId', controller.getTimeline);
router.post('/', createValidation, controller.createEvent);
router.put('/:id', updateValidation, controller.updateEvent);
router.delete('/:id', param('id').isString().withMessage('ID invalide'), controller.deleteEvent);
router.post('/:id/restore', param('id').isString(), archiveController.restoreFromTrash);
router.delete('/:id/permanent', param('id').isString(), archiveController.permanentDelete);
router.post('/:id/archive', param('id').isString(), archiveController.archiveItem);
router.post('/:id/unarchive', param('id').isString(), archiveController.unarchiveItem);

module.exports = router;
