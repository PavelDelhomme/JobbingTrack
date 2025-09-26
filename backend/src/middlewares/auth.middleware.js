const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        error: 'Token d\\'authentification manquant'
      });
    }

    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        error: 'Format du token invalide'
      });
    }

    const token = parts[1];

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        logger.warn(`Tentative d'accès avec token invalide: ${err.message}`);
        return res.status(403).json({
          error: 'Token invalide ou expiré'
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          profilePicture: true,
          createdAt: true
        }
      });

      if (!user) {
        return res.status(404).json({
          error: 'Utilisateur non trouvé'
        });
      }

      req.user = user;
      req.token = token;
      
      next();
    });
  } catch (error) {
    logger.error('Erreur dans le middleware d\\'authentification:', error);
    res.status(500).json({
      error: 'Erreur lors de l\\'authentification'
    });
  }
};

module.exports = {
  authenticate
};
