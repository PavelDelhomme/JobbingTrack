const express = require('express');
const router = express.Router();
const securityService = require('../services/securityService');

// Récupérer les attaques DDoS
router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const attacks = await securityService.prisma.dDoSAttack.findMany({
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    res.json({
      success: true,
      data: attacks,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        count: attacks.length
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des attaques DDoS:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des attaques DDoS'
    });
  }
});

// Enregistrer une attaque DDoS
router.post('/', async (req, res) => {
  try {
    const {
      sourceIPs,
      attackType,
      targetEndpoint,
      duration,
      totalRequests,
      requestsPerSecond,
      isMitigated
    } = req.body;

    if (!sourceIPs || !attackType || !targetEndpoint) {
      return res.status(400).json({
        success: false,
        message: 'sourceIPs, attackType et targetEndpoint sont requis'
      });
    }

    const attack = await securityService.recordDDoSAttack({
      sourceIPs,
      attackType,
      targetEndpoint,
      duration: duration || 60,
      totalRequests,
      requestsPerSecond,
      isMitigated: isMitigated || false
    });

    res.status(201).json({
      success: true,
      message: 'Attaque DDoS enregistrée',
      data: attack
    });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de l\'attaque DDoS:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement de l\'attaque DDoS'
    });
  }
});

module.exports = router;
