const express = require('express');
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

module.exports = router;
