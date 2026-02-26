const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { authenticate } = require('../middlewares/auth.middleware');
const controller = require('../controllers/contact.controller');
const archiveController = require('../controllers/archive.controller');

// Validations
const createValidation = [
  body('firstName').notEmpty().withMessage('Prénom requis'),
  body('lastName').notEmpty().withMessage('Nom requis')
];

const updateValidation = [
  param('id').isString().withMessage('ID invalide')
];

// Routes publiques
router.get('/health', controller.getHealth);

// Routes protégées
router.use(authenticate);

// Routes corbeille (avant /:id)
router.get('/trash', archiveController.getTrash);
router.post('/trash/empty', archiveController.emptyTrash);
router.get('/archived', archiveController.getArchived);

router.post('/', createValidation, controller.createContact);
router.get('/', controller.getContacts);
router.get('/:id', param('id').isString(), controller.getContact);
router.put('/:id', updateValidation, controller.updateContact);
router.delete('/:id', param('id').isString(), controller.deleteContact);
router.post('/:id/restore', param('id').isString(), archiveController.restoreFromTrash);
router.delete('/:id/permanent', param('id').isString(), archiveController.permanentDelete);
router.post('/:id/archive', param('id').isString(), archiveController.archiveItem);
router.post('/:id/unarchive', param('id').isString(), archiveController.unarchiveItem);

// NOUVELLES ROUTES - Relations many-to-many
router.post('/:id/link-company', [
  param('id').isString().withMessage('ID contact invalide'),
  body('companyId').isString().withMessage('CompanyId requis')
], controller.linkContactToCompany);

router.post('/:id/link-application', [
  param('id').isString().withMessage('ID contact invalide'),
  body('applicationId').isString().withMessage('ApplicationId requis')
], controller.linkContactToApplication);

// NOUVELLES ROUTES - Récupération par relations
router.get('/company/:companyId', param('companyId').isString(), controller.getContactsByCompany);
router.get('/application/:applicationId', param('applicationId').isString(), controller.getContactsByApplication);

module.exports = router;
