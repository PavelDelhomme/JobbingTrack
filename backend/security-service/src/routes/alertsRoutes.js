const express = require('express');
const router = express.Router();
const securityService = require('../services/securityService');

// Récupérer les alertes de sécurité
router.get('/', async (req, res) => {
  try {
    const { level, limit = 20 } = req.query;

    const alerts = await securityService.getSecurityAlerts({
      level,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des alertes:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des alertes'
    });
  }
});

// Marquer une alerte comme acquittée
router.patch('/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;
    const { acknowledgedBy } = req.body;

    const alert = await securityService.prisma.securityAlert.update({
      where: { id },
      data: {
        isAcknowledged: true,
        acknowledgedBy,
        acknowledgedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Alerte acquittée avec succès',
      data: alert
    });
  } catch (error) {
    console.error('Erreur lors de l\'acquittement de l\'alerte:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'acquittement de l\'alerte'
    });
  }
});

// Résoudre une alerte
router.patch('/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;

    const alert = await securityService.prisma.securityAlert.update({
      where: { id },
      data: {
        resolvedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Alerte résolue avec succès',
      data: alert
    });
  } catch (error) {
    console.error('Erreur lors de la résolution de l\'alerte:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la résolution de l\'alerte'
    });
  }
});

module.exports = router;
