const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { authenticate } = require('../middlewares/auth.middleware');
const controller = require('../controllers/company.controller');

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

// CRUD Companies
router.post('/', createValidation, controller.createCompany);
router.get('/', controller.getCompanies);
router.get('/by-name/:name', controller.getCompanyByName); // ✅ NOUVEAU
router.get('/:id', param('id').isString(), controller.getCompany);
router.put('/:id', updateValidation, controller.updateCompany);
router.delete('/:id', param('id').isString(), controller.deleteCompany);

module.exports = router;
