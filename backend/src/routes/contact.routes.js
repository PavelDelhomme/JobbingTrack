// backend/src/routes/contact.routes.js
const express = require('express');
const { body } = require('express-validator');
const auth = require('../middlewares/auth');
const {
  getContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact
} = require('../controllers/contact.controller');

const router = express.Router();

const createContactValidation = [
  body('firstName').notEmpty().withMessage('Prénom requis'),
  body('lastName').notEmpty().withMessage('Nom requis'),
  body('email').optional().isEmail().withMessage('Email invalide'),
  body('phone').optional().isMobilePhone().withMessage('Numéro de téléphone invalide')
];

router.use(auth);

router.get('/', getContacts);
router.get('/:id', getContact);
router.post('/', createContactValidation, createContact);
router.put('/:id', updateContact);
router.delete('/:id', deleteContact);

module.exports = router;