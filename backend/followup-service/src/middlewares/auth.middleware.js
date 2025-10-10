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
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // ✅ Pas besoin de vérifier l'utilisateur en base - le JWT est la source de vérité
      req.user = {
        id: decoded.userId,
        email: decoded.email
      };
      req.token = token;
      
      next();
    } catch (err) {
      logger.warn(`Tentative d'accès avec token invalide: ${err.message}`);
      return res.status(403).json({
        error: 'Token invalide ou expiré'
      });
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

