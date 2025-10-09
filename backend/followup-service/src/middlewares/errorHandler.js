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

