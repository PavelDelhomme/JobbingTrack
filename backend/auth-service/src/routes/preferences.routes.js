const express = require('express');
const router = express.Router();
const {
  getUserPreferences,
  updateUserPreferences,
  resetUserPreferences,
  exportUserPreferences,
  importUserPreferences
} = require('../controllers/preferences.controller');
const { authenticate } = require('../middlewares/auth.middleware');

/**
 * @route   GET /api/v1/preferences
 * @desc    Récupérer les préférences de l'utilisateur connecté
 * @access  Private
 */
router.get('/', authenticate, getUserPreferences);

/**
 * @route   PUT /api/v1/preferences
 * @desc    Mettre à jour les préférences de l'utilisateur
 * @access  Private
 */
router.put('/', authenticate, updateUserPreferences);

/**
 * @route   POST /api/v1/preferences/reset
 * @desc    Réinitialiser les préférences par défaut
 * @access  Private
 */
router.post('/reset', authenticate, resetUserPreferences);

/**
 * @route   GET /api/v1/preferences/export
 * @desc    Exporter les préférences de l'utilisateur
 * @access  Private
 */
router.get('/export', authenticate, exportUserPreferences);

/**
 * @route   POST /api/v1/preferences/import
 * @desc    Importer les préférences de l'utilisateur
 * @access  Private
 */
router.post('/import', authenticate, importUserPreferences);
router.post('/reset', authenticate, resetUserPreferences);

module.exports = router;

