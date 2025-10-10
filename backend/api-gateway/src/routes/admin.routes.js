const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const logsController = require('../controllers/logs.controller');

// Middleware d'authentification
const authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token manquant'
      });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production-2025');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Token invalide'
    });
  }
};

// Routes de gestion des services (admin uniquement)
router.post('/services/restart', authenticate, adminController.restartService);
router.post('/services/stop', authenticate, adminController.stopService);
router.post('/services/start', authenticate, adminController.startService);

// Routes des logs (admin uniquement)
router.get('/logs/services', authenticate, logsController.getAvailableServices);
router.get('/logs/all', authenticate, logsController.getAllLogs);
router.get('/logs/:serviceName', authenticate, logsController.getServiceLogs);

module.exports = router;

