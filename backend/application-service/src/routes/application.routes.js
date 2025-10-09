const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { authenticate } = require('../middlewares/auth.middleware');
const controller = require('../controllers/application.controller');

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

router.post('/', createValidation, controller.createApplication);
router.get('/', controller.getApplications);
router.get('/:id', param('id').isUUID(), controller.getApplication);
router.put('/:id', updateValidation, controller.updateApplication);
router.delete('/:id', param('id').isUUID(), controller.deleteApplication);

module.exports = router;
