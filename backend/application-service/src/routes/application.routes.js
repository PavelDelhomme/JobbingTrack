const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { authenticate } = require('../middlewares/auth.middleware');
const controller = require('../controllers/application.controller');
const platformController = require('../controllers/platform.controller');
const archiveController = require('../controllers/archive.controller');

// Validations
const createValidation = [
  body('position').notEmpty().withMessage('Poste requis')
  // ✅ companyId n'est plus obligatoire - on peut fournir companyName
];

const updateValidation = [
  param('id').isUUID().withMessage('ID invalide')
];

// Routes publiques
router.get('/health', controller.getHealth);

// Routes protégées
router.use(authenticate);

// Routes candidatures
router.post('/', createValidation, controller.createApplication);
router.get('/', controller.getApplications);
router.get('/:id', param('id').isUUID(), controller.getApplication);
router.put('/:id', updateValidation, controller.updateApplication);
router.delete('/:id', param('id').isUUID(), controller.deleteApplication);

// Routes plateformes
router.post('/platforms', [
  body('name').notEmpty().withMessage('Nom de plateforme requis')
], platformController.createPlatform);
router.get('/platforms', platformController.getPlatforms);
router.get('/platforms/:id', param('id').isUUID(), platformController.getPlatform);
router.put('/platforms/:id', [
  param('id').isUUID().withMessage('ID invalide')
], platformController.updatePlatform);
router.delete('/platforms/:id', param('id').isUUID(), platformController.deletePlatform);

// Routes archivage
router.post('/:id/archive', [
  param('id').isUUID().withMessage('ID invalide'),
  body('reason').optional().isString()
], archiveController.archiveApplication);
router.post('/:id/restore', param('id').isUUID(), archiveController.restoreApplication);
router.get('/archived', archiveController.getArchivedApplications);
router.get('/archive-stats', archiveController.getArchiveStats);
router.delete('/:id/permanent', param('id').isUUID(), archiveController.deleteArchivedApplication);

module.exports = router;
