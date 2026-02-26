const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { authenticate } = require('../middlewares/auth.middleware');
const controller = require('../controllers/company.controller');
const archiveController = require('../controllers/archive.controller');

// Validations
const createValidation = [
  body('name').notEmpty().withMessage('Nom requis')
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

// CRUD Companies
router.post('/', createValidation, controller.createCompany);
router.get('/', controller.getCompanies);
router.get('/by-name/:name', controller.getCompanyByName);
router.get('/:id', param('id').isString(), controller.getCompany);
router.put('/:id', updateValidation, controller.updateCompany);
router.delete('/:id', param('id').isString(), controller.deleteCompany);
router.post('/:id/restore', param('id').isString(), archiveController.restoreFromTrash);
router.delete('/:id/permanent', param('id').isString(), archiveController.permanentDelete);
router.post('/:id/archive', param('id').isString(), archiveController.archiveItem);
router.post('/:id/unarchive', param('id').isString(), archiveController.unarchiveItem);

module.exports = router;
