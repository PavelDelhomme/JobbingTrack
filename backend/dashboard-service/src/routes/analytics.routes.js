const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// Middleware d'authentification optionnel (pour permettre le tracking anonyme)
const optionalAuth = async (req, res, next) => {
  // Essayer d'authentifier, mais ne pas bloquer si pas de token
  if (req.headers.authorization) {
    try {
      await authenticate(req, res, () => {
        // Si l'authentification réussit, continuer
        next();
      });
    } catch (error) {
      // Si l'authentification échoue, continuer quand même (tracking anonyme)
      next();
    }
  } else {
    next();
  }
};

// Sessions
router.post('/sessions', optionalAuth, analyticsController.createSession);
router.put('/sessions/:sessionId', optionalAuth, analyticsController.updateSession);

// Événements
router.post('/events', optionalAuth, analyticsController.trackEvent);
router.get('/events', authenticate, analyticsController.getEvents);

// Erreurs
router.post('/errors', optionalAuth, analyticsController.trackError);
router.get('/errors', authenticate, analyticsController.getErrors);

// Performance
router.post('/performance', optionalAuth, analyticsController.trackPerformance);

// Appareils
router.post('/device', optionalAuth, analyticsController.registerDevice);

// Statistiques
router.get('/stats/:userId?', authenticate, analyticsController.getUserStats);

module.exports = router;

