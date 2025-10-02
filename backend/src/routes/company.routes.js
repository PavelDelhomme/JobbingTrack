// backend/src/routes/company.routes.js
const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middlewares/auth.middleware');
const {
  getCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany,
  getCompanyApplications
} = require('../controllers/company.controller');

const router = express.Router();

const createCompanyValidation = [
  body('name').notEmpty().withMessage('Nom de l\'entreprise requis'),
  body('website').optional().isURL().withMessage('URL invalide'),
  body('industry').optional().isLength({ max: 100 }).withMessage('Secteur trop long')
];

router.use(authenticate);

/**
 * @swagger
 * /api/v1/companies:
 *   get:
 *     summary: Récupérer la liste des entreprises
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Rechercher par nom
 *       - in: query
 *         name: industry
 *         schema:
 *           type: string
 *         description: Filtrer par secteur
 */
router.get('/', getCompanies);
router.get('/:id', getCompany);
router.post('/', createCompanyValidation, createCompany);
router.put('/:id', updateCompany);
router.delete('/:id', deleteCompany);
router.get('/:id/applications', getCompanyApplications);

module.exports = router;
