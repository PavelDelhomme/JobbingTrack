const express = require('express')
const router = express.Router()
const MaintenanceController = require('../controllers/maintenance.controller')
const authMiddleware = require('../middlewares/auth')

// Toutes les routes nécessitent une authentification
router.use(authMiddleware)

/**
 * @swagger
 * /api/v1/maintenance:
 *   get:
 *     summary: Récupérer l'état de maintenance de tous les services
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste de tous les états de maintenance
 */
router.get('/', MaintenanceController.getAllMaintenanceStatus)

/**
 * @swagger
 * /api/v1/maintenance/services:
 *   get:
 *     summary: Récupérer la liste des services disponibles pour la maintenance
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des services disponibles
 */
router.get('/services', MaintenanceController.getAvailableServices)

/**
 * @swagger
 * /api/v1/maintenance/{serviceName}:
 *   get:
 *     summary: Récupérer l'état de maintenance d'un service spécifique
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceName
 *         required: true
 *         schema:
 *           type: string
 *         description: Nom du service
 *     responses:
 *       200:
 *         description: État de maintenance du service
 */
router.get('/:serviceName', MaintenanceController.getMaintenanceStatus)

/**
 * @swagger
 * /api/v1/maintenance/{serviceName}/activate:
 *   post:
 *     summary: Activer le mode maintenance pour un service
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceName
 *         required: true
 *         schema:
 *           type: string
 *         description: Nom du service
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: Message personnalisé affiché pendant la maintenance
 *               scheduledStart:
 *                 type: string
 *                 format: date-time
 *                 description: Date de début programmée de la maintenance
 *               scheduledEnd:
 *                 type: string
 *                 format: date-time
 *                 description: Date de fin programmée de la maintenance
 *     responses:
 *       200:
 *         description: Mode maintenance activé avec succès
 */
router.post('/:serviceName/activate', MaintenanceController.activateMaintenance)

/**
 * @swagger
 * /api/v1/maintenance/{serviceName}/deactivate:
 *   post:
 *     summary: Désactiver le mode maintenance pour un service
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceName
 *         required: true
 *         schema:
 *           type: string
 *         description: Nom du service
 *     responses:
 *       200:
 *         description: Mode maintenance désactivé avec succès
 */
router.post('/:serviceName/deactivate', MaintenanceController.deactivateMaintenance)

/**
 * @swagger
 * /api/v1/maintenance/{serviceName}/message:
 *   put:
 *     summary: Mettre à jour le message de maintenance pour un service
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceName
 *         required: true
 *         schema:
 *           type: string
 *         description: Nom du service
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: Nouveau message de maintenance
 *     responses:
 *       200:
 *         description: Message de maintenance mis à jour avec succès
 */
router.put('/:serviceName/message', MaintenanceController.updateMaintenanceMessage)

module.exports = router
