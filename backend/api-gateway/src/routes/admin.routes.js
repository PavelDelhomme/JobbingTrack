const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const logsController = require('../controllers/logs.controller');
const trashController = require('../controllers/trash.controller');

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
    
    // ✅ Créer l'objet user avec toutes les infos du JWT
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role // ✅ Extraire le rôle
    };
    
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
router.get('/logs/:serviceName/stream', authenticate, logsController.streamServiceLogs); // ✅ NOUVEAU - Stream temps réel

// Routes de la corbeille (admin uniquement)
router.get('/trash', authenticate, trashController.getAllDeletedItems);
router.post('/trash/:type/:id/restore', authenticate, trashController.restoreItem);
router.delete('/trash/:type/:id/permanent', authenticate, trashController.permanentDelete);
router.post('/trash/empty', authenticate, trashController.emptyTrash);

module.exports = router;

