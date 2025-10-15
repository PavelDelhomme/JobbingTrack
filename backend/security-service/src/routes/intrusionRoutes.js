const express = require('express');
const router = express.Router();
const securityService = require('../services/securityService');

// Récupérer les tentatives d'intrusion
router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const attempts = await securityService.prisma.intrusionAttempt.findMany({
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    res.json({
      success: true,
      data: attempts,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        count: attempts.length
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des tentatives d\'intrusion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des tentatives d\'intrusion'
    });
  }
});

// Enregistrer une tentative d'intrusion
router.post('/', async (req, res) => {
  try {
    const {
      sourceIP,
      attackType,
      targetEndpoint,
      method,
      userAgent,
      payload,
      riskScore,
      isBlocked,
      blockReason
    } = req.body;

    if (!sourceIP || !attackType) {
      return res.status(400).json({
        success: false,
        message: 'sourceIP et attackType sont requis'
      });
    }

    const attempt = await securityService.recordIntrusionAttempt({
      sourceIP,
      attackType,
      targetEndpoint,
      method,
      userAgent,
      payload,
      riskScore: riskScore || 50,
      isBlocked: isBlocked || false,
      blockReason
    });

    res.status(201).json({
      success: true,
      message: 'Tentative d\'intrusion enregistrée',
      data: attempt
    });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de la tentative d\'intrusion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement de la tentative d\'intrusion'
    });
  }
});

module.exports = router;
