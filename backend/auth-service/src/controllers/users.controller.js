const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const { prisma } = require('../utils/prismaClient');

/**
 * Récupérer tous les utilisateurs (ADMIN seulement)
 */
const getAllUsers = async (req, res) => {
  try {
    const currentUser = req.user;

    // Vérifier que l'utilisateur est admin
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé. Droits administrateur requis.'
      });
    }

    const users = await prisma.user.findMany({
      where: {
        deletedAt: null // Exclure les utilisateurs supprimés
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        emailVerified: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Formater les données pour le frontend
    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      lastLogin: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      emailVerified: user.emailVerified
    }));

    res.json({
      success: true,
      users: formattedUsers,
      total: formattedUsers.length
    });

  } catch (error) {
    logger.error('Erreur récupération utilisateurs:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des utilisateurs'
    });
  }
};

/**
 * Récupérer un utilisateur spécifique par ID
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    // Vérifier les permissions
    if (currentUser.userId !== id && currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        emailVerified: true,
        emailVerifiedAt: true
      }
    });

    if (!user || user.deletedAt) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      user: {
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        lastLogin: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
        emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null
      }
    });

  } catch (error) {
    logger.error('Erreur récupération utilisateur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'utilisateur'
    });
  }
};

/**
 * Mettre à jour un utilisateur
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;
    const { firstName, lastName, phone, isActive, role } = req.body;

    // Vérifier les permissions
    const isOwnProfile = currentUser.userId === id;
    const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN';

    if (!isOwnProfile && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé'
      });
    }

    // Vérifier que l'utilisateur existe
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser || existingUser.deletedAt) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    // Préparer les données à mettre à jour
    const updateData = {};

    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;

    // Seuls les admins peuvent modifier isActive et role
    if (isAdmin) {
      if (isActive !== undefined) updateData.isActive = isActive;
      if (role !== undefined) updateData.role = role;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        updatedAt: true
      }
    });

    logger.info(`Utilisateur ${id} mis à jour par ${currentUser.userId}`);

    res.json({
      success: true,
      user: updatedUser,
      message: 'Utilisateur mis à jour avec succès'
    });

  } catch (error) {
    logger.error('Erreur mise à jour utilisateur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de l\'utilisateur'
    });
  }
};

/**
 * Supprimer un utilisateur (soft delete)
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    // Seuls les admins peuvent supprimer
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé. Droits administrateur requis.'
      });
    }

    // Empêcher l'auto-suppression
    if (currentUser.userId === id) {
      return res.status(400).json({
        success: false,
        error: 'Vous ne pouvez pas supprimer votre propre compte'
      });
    }

    // Vérifier que l'utilisateur existe
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser || existingUser.deletedAt) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    // Soft delete
    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false
      }
    });

    logger.info(`Utilisateur ${id} supprimé par ${currentUser.userId}`);

    res.json({
      success: true,
      message: 'Utilisateur supprimé avec succès'
    });

  } catch (error) {
    logger.error('Erreur suppression utilisateur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de l\'utilisateur'
    });
  }
};

/**
 * Obtenir les statistiques des utilisateurs
 */
const getUserStats = async (req, res) => {
  try {
    const currentUser = req.user;

    // Vérifier que l'utilisateur est admin
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé'
      });
    }

    const [total, active, inactive, admins, verified] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { isActive: true, deletedAt: null } }),
      prisma.user.count({ where: { isActive: false, deletedAt: null } }),
      prisma.user.count({ where: { role: 'ADMIN', deletedAt: null } }),
      prisma.user.count({ where: { emailVerified: true, deletedAt: null } })
    ]);

    res.json({
      success: true,
      stats: {
        total,
        active,
        inactive,
        admins,
        verified
      }
    });

  } catch (error) {
    logger.error('Erreur récupération statistiques:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques'
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserStats
};

