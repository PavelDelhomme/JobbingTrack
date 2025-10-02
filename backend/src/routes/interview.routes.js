// backend/src/routes/interview.routes.js
const express = require('express');
const { body } = require('express-validator');
const auth = require('../middlewares/auth');
const {
  getInterviews,
  createInterview,
  updateInterview
} = require('../controllers/interview.controller');

const router = express.Router();

// Validation pour création d'entretien
const createInterviewValidation = [
  body('applicationId').notEmpty().withMessage('ID de candidature requis'),
  body('type').isIn(['PHONE_SCREENING', 'VIDEO', 'ON_SITE', 'TECHNICAL', 'HR', 'MANAGER', 'TEAM', 'FINAL']).withMessage('Type d\'entretien invalide'),
  body('scheduledAt').isISO8601().withMessage('Date d\'entretien invalide'),
  body('duration').optional().isInt({ min: 15, max: 480 }).withMessage('Durée invalide (15-480 minutes)')
];

// Toutes les routes nécessitent une authentification
router.use(auth);

/**
 * @swagger
 * /api/v1/interviews:
 *   get:
 *     summary: Récupérer la liste des entretiens
 *     tags: [Interviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: applicationId
 *         schema:
 *           type: string
 *         description: Filtrer par ID de candidature
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [SCHEDULED, COMPLETED, CANCELLED, RESCHEDULED, NO_SHOW]
 *         description: Filtrer par statut
 *       - in: query
 *         name: upcoming
 *         schema:
 *           type: boolean
 *         description: Afficher uniquement les entretiens à venir
 *     responses:
 *       200:
 *         description: Liste des entretiens récupérée avec succès
 */
router.get('/', getInterviews);

/**
 * @swagger
 * /api/v1/interviews:
 *   post:
 *     summary: Créer un nouvel entretien
 *     tags: [Interviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - applicationId
 *               - type
 *               - scheduledAt
 *             properties:
 *               applicationId:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [PHONE_SCREENING, VIDEO, ON_SITE, TECHNICAL, HR, MANAGER, TEAM, FINAL]
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *               duration:
 *                 type: integer
 *                 minimum: 15
 *                 maximum: 480
 *               location:
 *                 type: string
 *               meetingUrl:
 *                 type: string
 *               interviewer:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Entretien créé avec succès
 */
router.post('/', createInterviewValidation, createInterview);

/**
 * @swagger
 * /api/v1/interviews/{id}:
 *   put:
 *     summary: Mettre à jour un entretien
 *     tags: [Interviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [SCHEDULED, COMPLETED, CANCELLED, RESCHEDULED, NO_SHOW]
 *               feedback:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Entretien mis à jour avec succès
 */
router.put('/:id', updateInterview);

module.exports = router;