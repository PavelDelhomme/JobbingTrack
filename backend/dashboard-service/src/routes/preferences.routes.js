const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const controller = require('../controllers/preferences.controller');

// Toutes les routes des préférences sont protégées
router.use(authenticate);

// ✅ CRUD Préférences utilisateur
router.get('/', controller.getUserPreferences);
router.put('/', controller.saveUserPreferences);
router.post('/reset', controller.resetUserPreferences);

module.exports = router;

