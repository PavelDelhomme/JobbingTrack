const express = require('express');
const router = express.Router();
const {
  getUserPreferences,
  updateUserPreferences,
  resetUserPreferences
} = require('../controllers/preferences.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

/**
 * @route   GET /api/v1/preferences
 * @desc    Récupérer les préférences de l'utilisateur connecté
 * @access  Private
 */
router.get('/', authenticateToken, getUserPreferences);

/**
 * @route   PUT /api/v1/preferences
 * @desc    Mettre à jour les préférences de l'utilisateur
 * @access  Private
 */
router.put('/', authenticateToken, updateUserPreferences);

/**
 * @route   POST /api/v1/preferences/reset
 * @desc    Réinitialiser les préférences par défaut
 * @access  Private
 */
router.post('/reset', authenticateToken, resetUserPreferences);

module.exports = router;

