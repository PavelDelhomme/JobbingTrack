// backend/src/routes/dashboard.routes.js
const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const {
  getDashboardStats,
  getRecentActivities,
  getUpcomingReminders,
  getApplicationsTimeline,
  getTopCompanies
} = require('../controllers/dashboard.controller');

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * /api/v1/dashboard/stats:
 *   get:
 *     summary: Statistiques générales du dashboard
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiques récupérées avec succès
 */
router.get('/stats', getDashboardStats);
router.get('/activities', getRecentActivities);
router.get('/reminders', getUpcomingReminders);
router.get('/timeline', getApplicationsTimeline);
router.get('/top-companies', getTopCompanies);

module.exports = router;