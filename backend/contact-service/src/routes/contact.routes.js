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

module.exports = router;
