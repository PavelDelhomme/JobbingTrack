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

    // ✅ Mode développement: Accepter les tokens mock
    if (process.env.NODE_ENV === 'development' && token.startsWith('mock-jwt-token')) {
      logger.info('🔐 Mode développement: Token mock accepté');
      req.user = {
        id: 'dev_user_1',
        email: 'dev@jobbingtrack.com',
        role: 'USER'
      };
      req.token = token;
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const uid = decoded.userId ?? decoded.id ?? decoded.sub;
      if (!uid) {
        logger.warn('JWT sans userId/id/sub');
        return res.status(403).json({ error: 'Token invalide (userId manquant)' });
      }
      req.user = {
        id: String(uid),
        email: decoded.email,
        role: decoded.role
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
