const { logger } = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let statusCode = 500;
  let message = 'Erreur interne du serveur';
  let details = {};

  // Erreurs de validation Joi
  if (err.isJoi) {
    statusCode = 400;
    message = 'Données de requête invalides';
    details = {
      validationErrors: err.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }))
    };
  }
  // Erreurs Prisma
  else if (err.code) {
    switch (err.code) {
      case 'P2002':
        statusCode = 409;
        message = 'Conflit de données: ressource déjà existante';
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Ressource non trouvée';
        break;
      case 'P2003':
        statusCode = 400;
        message = 'Erreur de contrainte de clé étrangère';
        break;
      default:
        statusCode = 400;
        message = 'Erreur de base de données';
    }
    details = { prismaCode: err.code, meta: err.meta };
  }
  // Erreurs personnalisées
  else if (err.statusCode) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details || {};
  }

  // Log de l'erreur
  logger.error('Erreur HTTP', {
    statusCode,
    message,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    stack: err.stack,
    details
  });

  // Réponse d'erreur
  res.status(statusCode).json({
    success: false,
    message,
    details,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = { errorHandler };
