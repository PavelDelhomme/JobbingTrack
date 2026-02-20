const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        error: 'Token d\'authentification manquant'
      });
    }

    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        error: 'Format du token invalide'
      });
    }

    const token = parts[1];

    try {
      if (!process.env.JWT_SECRET) {
        logger.error('JWT_SECRET non configuré dans interview-service');
        return res.status(500).json({
          error: 'Configuration d\'authentification manquante'
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // ✅ JWT est la source de vérité ; auth-service envoie userId dans le payload
      req.user = {
        id: decoded.userId ?? decoded.id,
        email: decoded.email,
        role: decoded.role
      };
      req.token = token;
      
      next();
    } catch (err) {
      // Distinguer les différents types d'erreurs JWT
      if (err.name === 'TokenExpiredError') {
        logger.warn(`Token expiré pour ${req.method} ${req.originalUrl}`);
        return res.status(401).json({
          error: 'Token expiré',
          code: 'TOKEN_EXPIRED'
        });
      } else if (err.name === 'JsonWebTokenError') {
        logger.warn(`Token invalide pour ${req.method} ${req.originalUrl}: ${err.message}`);
        return res.status(401).json({
          error: 'Token invalide',
          code: 'TOKEN_INVALID'
        });
      } else {
        logger.warn(`Erreur vérification token pour ${req.method} ${req.originalUrl}: ${err.message}`);
        return res.status(403).json({
          error: 'Token invalide ou expiré',
          code: 'TOKEN_ERROR'
        });
      }
    }
  } catch (error) {
    logger.error('Erreur dans le middleware d\'authentification:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'authentification'
    });
  }
};

module.exports = {
  authenticate
};
