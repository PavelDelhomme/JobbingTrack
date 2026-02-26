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

const idValidation = param('id').isString().notEmpty().withMessage('ID invalide');

const updateValidation = [
  idValidation
];

// Routes publiques
router.get('/health', controller.getHealth);

// Routes protégées
router.use(authenticate);

// Routes candidatures
router.post('/', createValidation, controller.createApplication);
router.get('/', controller.getApplications);

// Routes corbeille & archivage (AVANT /:id pour éviter que "trash"/"archived" soient matchés comme :id)
router.get('/trash', archiveController.getTrash);
router.post('/trash/empty', archiveController.emptyTrash);
router.get('/archived', archiveController.getArchivedApplications);
router.get('/archive-stats', archiveController.getArchiveStats);

// Routes plateformes (avant /:id)
router.post('/platforms', [
  body('name').notEmpty().withMessage('Nom de plateforme requis')
], platformController.createPlatform);
router.get('/platforms', platformController.getPlatforms);
router.get('/platforms/:id', idValidation, platformController.getPlatform);
router.put('/platforms/:id', [idValidation], platformController.updatePlatform);
router.delete('/platforms/:id', idValidation, platformController.deletePlatform);

// Routes par ID (après les routes nommées)
router.get('/:id', idValidation, controller.getApplication);
router.put('/:id', updateValidation, controller.updateApplication);
router.delete('/:id', idValidation, controller.deleteApplication);
router.post('/:id/archive', [
  idValidation,
  body('reason').optional().isString()
], archiveController.archiveApplication);
router.post('/:id/unarchive', idValidation, archiveController.restoreApplication);
router.post('/:id/restore', idValidation, archiveController.restoreFromTrash);
router.delete('/:id/permanent', idValidation, archiveController.permanentDeleteFromTrash);

// NOUVELLES ROUTES - Historique des statuts
router.put('/:id/status', [
  idValidation,
  body('status').isIn([
    'CANDIDATE_PENDING', 'NO_RESPONSE', 'NO_RESPONSE_AFTER_FIRST_FOLLOWUP',
    'NO_RESPONSE_AFTER_SECOND_FOLLOWUP', 'FIRST_INTERVIEW_PENDING',
    'OTHER_INTERVIEW_PENDING', 'ACCEPTED_AFTER_INTERVIEW',
    'REJECTED_WITHOUT_INTERVIEW', 'REJECTED_AFTER_INTERVIEW',
    'INTERVIEW_PENDING', 'INTERVIEW_DONE', 'OFFER_RECEIVED', 'REJECTED',
    'RELANCED_PENDING', 'AWAITING_INTERVIEW', 'INTERVIEW_SOON',
    'POST_INTERVIEW_FEEDBACK', 'NO_RESPONSE_NO_INTERVIEW', 'NO_RESPONSE_AFTER_FOLLOWUP'
  ]).withMessage('Statut invalide'),
  body('comment').optional().isString()
], controller.updateApplicationStatus);

router.get('/:id/status-history', idValidation, controller.getApplicationStatusHistory);

// NOUVELLES ROUTES - Contacts liés aux candidatures
router.get('/:id/contacts', idValidation, controller.getApplicationContacts);

module.exports = router;
