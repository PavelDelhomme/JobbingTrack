const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const { prisma } = require('../utils/prismaClient');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      logger.warn(`Tentative d'accès sans token: ${req.method} ${req.originalUrl}`);
      // S'assurer que la réponse est bien envoyée et que la requête est terminée
      if (!res.headersSent) {
        return res.status(401).json({
          success: false,
          error: 'Token d\'authentification manquant'
        });
      }
      return; // Ne pas appeler next() si la réponse a déjà été envoyée
    }

    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      logger.warn(`Format de token invalide: ${req.method} ${req.originalUrl}`);
      // S'assurer que la réponse est bien envoyée et que la requête est terminée
      if (!res.headersSent) {
        return res.status(401).json({
          success: false,
          error: 'Format du token invalide'
        });
      }
      return; // Ne pas appeler next() si la réponse a déjà été envoyée
    }

    const token = parts[1];

    // Utiliser une promesse pour éviter les problèmes de callback
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      let user;
      try {
        user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            profilePicture: true,
            role: true, // ✅ Récupérer le rôle
            createdAt: true
          }
        });
      } catch (dbError) {
        // Si la table User n'existe pas, logger l'erreur mais permettre l'accès en développement
        if (dbError.code === 'P2021' && process.env.NODE_ENV === 'development') {
          logger.warn('Table User non trouvée, mode développement activé. Exécutez: make db-push-all');
          // Créer un utilisateur mock pour le développement
          user = {
            id: decoded.userId,
            email: decoded.email || 'redacted@example.invalid',
            firstName: 'Dev',
            lastName: 'User',
            role: decoded.role || 'ADMIN'
          };
        } else {
          throw dbError;
        }
      }

      if (!user) {
        // En développement, si l'utilisateur n'est pas trouvé mais le token est valide,
        // créer un utilisateur mock pour permettre le développement
        if (process.env.NODE_ENV === 'development') {
          // En développement, c'est normal d'utiliser des utilisateurs mock
          // Ne logger qu'en mode debug pour éviter le spam
          if (process.env.DEBUG === 'true') {
            logger.info(`[DEV] Utilisateur mock créé pour userId: ${decoded.userId}`);
          }
          user = {
            id: decoded.userId,
            email: decoded.email || 'redacted@example.invalid',
            firstName: 'Dev',
            lastName: 'User',
            role: decoded.role || 'ADMIN'
          };
        } else {
          // En production, logger un warning
          logger.warn(`Utilisateur non trouvé pour userId: ${decoded.userId}`);
          // S'assurer que la réponse est bien envoyée et que la requête est terminée
          if (!res.headersSent) {
            return res.status(401).json({
              success: false,
              error: 'Utilisateur non trouvé'
            });
          }
          return; // Ne pas appeler next() si la réponse a déjà été envoyée
        }
      }

      req.user = user;
      req.token = token;
      
      next();
    } catch (jwtError) {
      // Erreur JWT (token invalide, expiré, etc.)
      logger.warn(`Token invalide: ${jwtError.message} - ${req.method} ${req.originalUrl}`);
      return res.status(401).json({
        success: false,
        error: 'Token invalide ou expiré',
        details: process.env.NODE_ENV === 'development' ? jwtError.message : undefined
      });
    }
  } catch (error) {
    logger.error('Erreur dans le middleware d\'authentification:', error);
    // S'assurer que la réponse est bien envoyée et que la requête est terminée
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de l\'authentification'
      });
    }
    return; // Ne pas appeler next() si la réponse a déjà été envoyée
  }
};

const requireAdmin = (req, res, next) => {
  const role = req.user?.role;
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    return next();
  }
  return res.status(403).json({
    success: false,
    error: 'Accès administrateur requis',
  });
};

module.exports = {
  authenticate,
  requireAdmin,
};
