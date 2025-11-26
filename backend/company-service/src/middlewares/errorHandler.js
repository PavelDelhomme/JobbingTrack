const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error('Erreur:', err);

  // Erreur de validation Prisma
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: 'Une ressource avec ces données existe déjà'
    });
  }

  // Erreur de contrainte Prisma
  if (err.code === 'P2003') {
    return res.status(400).json({
      success: false,
      error: 'Référence invalide'
    });
  }

  // Erreur de ressource non trouvée Prisma
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: 'Ressource non trouvée'
    });
  }

  // Erreur table non trouvée Prisma (P2021) - Mode développement
  if (err.code === 'P2021' && process.env.NODE_ENV !== 'production') {
    logger.warn('Table non trouvée (P2021), retour de données vides (mode développement)');
    return res.status(200).json({
      success: true,
      companies: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        pages: 0
      },
      warning: 'Table non trouvée. Exécutez "make db-push-all" pour créer les tables.'
    });
  }

  // Erreur de validation
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Données invalides',
      details: err.message
    });
  }

  // Erreur JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Token invalide'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expiré'
    });
  }

  // Erreur par défaut
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Erreur interne du serveur' 
      : err.message
  });
};

module.exports = errorHandler;
