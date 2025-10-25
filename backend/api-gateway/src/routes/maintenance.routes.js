const express = require('express')
const axios = require('axios')
const router = express.Router()
const MaintenanceController = require('../controllers/maintenance.controller')
const adminController = require('../controllers/admin.controller')

// Middleware d'authentification temporaire (simple vérification du token)
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // En mode développement, accepter tous les tokens qui contiennent 'mock-'
  if (authHeader?.includes('mock-')) {
    req.user = {
      role: 'SUPER_ADMIN',
      email: 'admin@jobbingtrack.test',
      id: 'mock-admin-123'
    };
    return next();
  }

  // Si pas de token ou token invalide, retourner une erreur
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token d\'authentification requis'
    });
  }

  // En mode développement, accepter aussi les tokens Bearer normaux
  req.user = {
    role: 'ADMIN',
    email: 'user@jobbingtrack.test',
    id: 'user-123'
  };
  next();
};

// Toutes les routes nécessitent une authentification
router.use(authenticate)

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
router.get('/', authenticate, (req, res) => {
  try {
    // Retourner une liste vide pour l'instant (fonctionnalité à implémenter)
    res.json({
      success: true,
      maintenances: [],
      message: 'Aucune maintenance en cours'
    });
  } catch (error) {
    console.error('Erreur récupération maintenances:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des maintenances'
    });
  }
});

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

/**
 * @swagger
 * /api/v1/maintenance/metrics/prometheus/query:
 *   get:
 *     summary: Proxy vers Prometheus pour les requêtes de métriques
 *     tags: [Maintenance, Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Requête Prometheus à exécuter
 *     responses:
 *       200:
 *         description: Résultats de la requête Prometheus
 */
router.get('/metrics/prometheus/query', authenticate, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Paramètre query requis'
      });
    }

    // URL de Prometheus (en dur pour l'instant)
    const prometheusUrl = 'http://prometheus:9090';

    // Faire directement la requête (sans test de connectivité pour éviter les erreurs)
    const response = await axios.get(`${prometheusUrl}/api/v1/query`, {
      params: { query },
      timeout: 5000
    });

    res.json(response.data);
  } catch (error) {
    console.error('Erreur proxy Prometheus:', error);

    // Si c'est une erreur de connexion à Prometheus, retourner une erreur de service
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        message: 'Service Prometheus non disponible',
        error: 'Prometheus n\'est pas démarré ou accessible',
        available: false
      });
    }

    // Autre erreur
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des métriques Prometheus',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/maintenance/security/logs:
 *   get:
 *     summary: Récupérer les logs de sécurité
 *     tags: [Maintenance, Security]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [error, warn, info]
 *         description: Niveau de log
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *         description: Nombre de logs à retourner
 *     responses:
 *       200:
 *         description: Logs de sécurité
 */
router.get('/security/logs', authenticate, async (req, res) => {
  try {
    const { level = 'error', limit = 100 } = req.query;

    // Mode développement : retourner des logs mockés
    const mockLogs = {
      success: true,
      logs: [
        {
          timestamp: new Date().toISOString(),
          level: level,
          message: `Log de sécurité niveau ${level}`,
          service: 'security-service',
          user: 'admin',
          ip: '192.168.1.100',
          action: 'login_attempt'
        },
        {
          timestamp: new Date(Date.now() - 60000).toISOString(),
          level: level,
          message: `Connexion réussie`,
          service: 'auth-service',
          user: 'admin',
          ip: '192.168.1.100',
          action: 'login_success'
        }
      ],
      total: 2,
      level: level,
      limit: parseInt(limit),
      fallback: true,
      message: `Logs de sécurité niveau ${level} (mode développement)`
    };

    res.status(200).json(mockLogs);
  } catch (error) {
    console.error('Erreur récupération logs sécurité:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des logs de sécurité',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/maintenance/services:
 *   get:
 *     summary: Récupérer l'état de tous les services
 *     tags: [Maintenance, Services]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: État de tous les services
 */
router.get('/services', authenticate, adminController.getServicesList);

/**
 * @swagger
 * /api/v1/maintenance/services/{serviceName}/logs:
 *   get:
 *     summary: Récupérer les logs d'un service spécifique
 *     tags: [Maintenance, Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceName
 *         required: true
 *         schema:
 *           type: string
 *         description: Nom du service
 *       - in: query
 *         name: lines
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *         description: Nombre de lignes de logs à retourner
 *     responses:
 *       200:
 *         description: Logs du service
 */
router.get('/services/:serviceName/logs', authenticate, async (req, res) => {
  try {
    const { serviceName } = req.params;
    const { lines = 50 } = req.query;

    logger.info(`📋 Récupération des logs pour ${serviceName}`);

    // Mode développement : retourner des logs mockés
    const portMap = {
      'api-gateway': 3000,
      'auth-service': 3001,
      'application-service': 3002,
      'company-service': 3003,
      'contact-service': 3004,
      'interview-service': 3005,
      'notification-service': 3006,
      'dashboard-service': 3007,
      'call-service': 3008,
      'profile-service': 3009,
      'event-service': 3011,
      'followup-service': 3012,
      'workflow-service': 3013,
      'frontend': 8080,
      'database': 5432,
      'cache': 6379,
      'monitoring': 9090
    };

    const servicePort = portMap[serviceName] || 3000;

    const mockLogs = {
      success: true,
      serviceName: serviceName,
      logs: [
        `[${new Date().toISOString()}] INFO: Service ${serviceName} démarré`,
        `[${new Date().toISOString()}] INFO: Configuration chargée`,
        `[${new Date().toISOString()}] INFO: Connexion à la base de données établie`,
        `[${new Date().toISOString()}] INFO: Service écoute sur le port ${servicePort}`,
      ],
      totalLines: parseInt(lines),
      fallback: true,
      message: `Logs du service ${serviceName} (mode développement)`
    };

    res.status(200).json(mockLogs);
  } catch (error) {
    console.error(`Erreur récupération logs pour ${req.params.serviceName}:`, error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des logs',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/maintenance/services/{serviceName}/restart:
 *   post:
 *     summary: Redémarrer un service
 *     tags: [Maintenance, Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceName
 *         required: true
 *         schema:
 *           type: string
 *         description: Nom du service à redémarrer
 *     responses:
 *       200:
 *         description: Service redémarré avec succès
 */
router.post('/services/:serviceName/restart', authenticate, adminController.restartService);

/**
 * @swagger
 * /api/v1/maintenance/services/{serviceName}/start:
 *   post:
 *     summary: Démarrer un service
 *     tags: [Maintenance, Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceName
 *         required: true
 *         schema:
 *           type: string
 *         description: Nom du service à démarrer
 *     responses:
 *       200:
 *         description: Service démarré avec succès
 */
router.post('/services/:serviceName/start', authenticate, adminController.startService);

/**
 * @swagger
 * /api/v1/maintenance/services/{serviceName}/stop:
 *   post:
 *     summary: Arrêter un service
 *     tags: [Maintenance, Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceName
 *         required: true
 *         schema:
 *           type: string
 *         description: Nom du service à arrêter
 *     responses:
 *       200:
 *         description: Service arrêté avec succès
 */
router.post('/services/:serviceName/stop', authenticate, adminController.stopService);

module.exports = router
