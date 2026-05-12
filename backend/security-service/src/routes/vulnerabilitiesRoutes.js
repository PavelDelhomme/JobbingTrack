const express = require('express');
const router = express.Router();
const securityService = require('../services/securityService');

// Récupérer les vulnérabilités
router.get('/', async (req, res) => {
  try {
    const { status, severity, limit = 50 } = req.query;

    const vulnerabilities = await securityService.getVulnerabilities({
      status,
      severity,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: vulnerabilities
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des vulnérabilités:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des vulnérabilités'
    });
  }
});

// Créer une vulnérabilité
router.post('/', async (req, res) => {
  try {
    const {
      title,
      description,
      severity,
      cveId,
      cvssScore,
      affectedComponent,
      status,
      assignedTo,
      remediation,
      tags
    } = req.body;

    if (!title || !description || !severity) {
      return res.status(400).json({
        success: false,
        message: 'title, description et severity sont requis'
      });
    }

    const vulnerability = await securityService.prisma.vulnerability.create({
      data: {
        title,
        description,
        severity,
        cveId,
        cvssScore,
        affectedComponent,
        status: status || 'open',
        assignedTo,
        remediation,
        tags: tags || []
      }
    });

    res.status(201).json({
      success: true,
      message: 'Vulnérabilité créée avec succès',
      data: vulnerability
    });
  } catch (error) {
    console.error('Erreur lors de la création de la vulnérabilité:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la vulnérabilité'
    });
  }
});

// Importer les alertes Dependabot GitHub côté serveur uniquement
router.post('/dependabot/import', async (req, res) => {
  try {
    const result = await securityService.analyzeDependabotAlerts({
      repository: req.body?.repository,
      state: req.body?.state,
      maxPages: req.body?.maxPages,
      perPage: req.body?.perPage
    });

    res.status(result.scanned ? 200 : 202).json({
      success: result.scanned,
      data: result
    });
  } catch (error) {
    console.error('Erreur lors de l\'import Dependabot:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'import Dependabot'
    });
  }
});

// Mettre à jour une vulnérabilité
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const vulnerability = await securityService.prisma.vulnerability.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Vulnérabilité mise à jour avec succès',
      data: vulnerability
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la vulnérabilité:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la vulnérabilité'
    });
  }
});

module.exports = router;
