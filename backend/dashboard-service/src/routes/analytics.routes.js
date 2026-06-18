const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// Middleware d'authentification optionnel (pour permettre le tracking anonyme)
const optionalAuth = async (req, res, next) => {
  // Essayer d'authentifier, mais ne jamais bloquer (tracking anonyme autorisé)
  if (req.headers.authorization) {
    try {
      const authHeader = req.headers.authorization;
      const parts = authHeader.split(' ');
      
      if (parts.length === 2 && parts[0] === 'Bearer') {
        const token = parts[1];
        const jwt = require('jsonwebtoken');
        
        const devBypassToken = process.env.DEV_AUTH_BYPASS_TOKEN;
        if (process.env.NODE_ENV !== 'production' && devBypassToken && token === devBypassToken) {
          req.user = {
            id: 'dev_user_1',
            email: 'redacted@example.invalid',
            role: 'USER'
          };
          req.token = token;
          return next();
        }
        
        // Essayer de vérifier le token
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          req.user = {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role
          };
          req.token = token;
        } catch (err) {
          // Token invalide ou expiré - continuer sans authentification (tracking anonyme)
          req.user = null;
          req.token = null;
        }
      }
    } catch (error) {
      // En cas d'erreur, continuer sans authentification (tracking anonyme)
      req.user = null;
      req.token = null;
    }
  }
  
  // Toujours continuer, même sans authentification
  next();
};

// Sessions
router.post('/sessions', optionalAuth, analyticsController.createSession);
router.put('/sessions/:sessionId', optionalAuth, analyticsController.updateSession);

// Événements
router.post('/events/batch', optionalAuth, analyticsController.trackEventsBatch);
router.post('/events', optionalAuth, analyticsController.trackEvent);
router.get('/events', authenticate, analyticsController.getEvents);

// Erreurs
router.post('/errors', optionalAuth, analyticsController.trackError);
router.get('/errors', authenticate, analyticsController.getErrors);

// Performance
router.post('/performance', optionalAuth, analyticsController.trackPerformance);
router.get('/performance', authenticate, analyticsController.getPerformance);

// Appareils
router.post('/device', optionalAuth, analyticsController.registerDevice);

// Statistiques (route la plus spécifique en premier)
router.get('/stats/:userId/versions', authenticate, analyticsController.getUserVersionsAndDevices);
router.get('/stats/:userId?', authenticate, analyticsController.getUserStats);

module.exports = router;

