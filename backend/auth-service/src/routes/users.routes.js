const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserStats
} = require('../controllers/users.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

/**
 * @route   GET /api/v1/users
 * @desc    Récupérer tous les utilisateurs
 * @access  Private (Admin only)
 */
router.get('/', authenticateToken, getAllUsers);

/**
 * @route   GET /api/v1/users/stats
 * @desc    Récupérer les statistiques des utilisateurs
 * @access  Private (Admin only)
 */
router.get('/stats', authenticateToken, getUserStats);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Récupérer un utilisateur par ID
 * @access  Private
 */
router.get('/:id', authenticateToken, getUserById);

/**
 * @route   PATCH /api/v1/users/:id
 * @desc    Mettre à jour un utilisateur
 * @access  Private
 */
router.patch('/:id', authenticateToken, updateUser);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Supprimer un utilisateur (soft delete)
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticateToken, deleteUser);

module.exports = router;

