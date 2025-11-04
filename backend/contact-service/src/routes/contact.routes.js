const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { authenticate } = require('../middlewares/auth.middleware');
const controller = require('../controllers/contact.controller');

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

router.post('/', createValidation, controller.createContact);
router.get('/', controller.getContacts);
router.get('/:id', param('id').isString(), controller.getContact);
router.put('/:id', updateValidation, controller.updateContact);
router.delete('/:id', param('id').isString(), controller.deleteContact);

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
