const express = require('express');
const axios = require('axios');
const router = express.Router();

// Middleware d'authentification temporaire (simple vérification du token)
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token d\'authentification requis'
    });
  }
  // TODO: Implémenter une vraie vérification du token JWT
  next();
};

// Récupérer toutes les maintenances
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

// Activer la maintenance pour un service
router.post('/:serviceName/activate', authenticate, (req, res) => {
  try {
    const { serviceName } = req.params;
    const { message } = req.body;

    // Simulation d'une maintenance activée
    res.json({
      success: true,
      maintenance: {
        serviceName,
        isActive: true,
        message: message || `Maintenance activée pour ${serviceName}`,
        activatedAt: new Date().toISOString(),
        activatedBy: 'admin' // TODO: Récupérer depuis le token JWT
      }
    });
  } catch (error) {
    console.error('Erreur activation maintenance:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'activation de la maintenance'
    });
  }
});

// Désactiver la maintenance pour un service
router.post('/:serviceName/deactivate', authenticate, (req, res) => {
  try {
    const { serviceName } = req.params;

    res.json({
      success: true,
      message: `Maintenance désactivée pour ${serviceName}`,
      maintenance: {
        serviceName,
        isActive: false,
        deactivatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Erreur désactivation maintenance:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la désactivation de la maintenance'
    });
  }
});

// ✅ NOUVEAU - Proxy vers Prometheus pour les métriques
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

    const response = await axios.get(`${prometheusUrl}/api/v1/query`, {
      params: { query },
      timeout: 5000
    });

    res.json(response.data);
  } catch (error) {
    console.error('Erreur proxy Prometheus:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des métriques Prometheus',
      error: error.message
    });
  }
});

module.exports = router;
