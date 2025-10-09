const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');

const prisma = new PrismaClient();

const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { email, password, firstName, lastName, phone } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Un compte avec cette adresse email existe déjà'
      });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 12);

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        phone
      }
    });

    // Générer le token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Envoyer email de bienvenue (async)
    emailService.sendWelcomeEmail(user).catch(error => {
      logger.error('Erreur envoi email bienvenue:', error);
    });

    // Retourner la réponse (sans le mot de passe)
    const { password: _, resetToken, resetTokenExpiry, ...userWithoutPassword } = user;

    res.status(201).json({
      success: true,
      message: 'Compte créé avec succès',
      user: userWithoutPassword,
      token
    });

    logger.info(`Nouvel utilisateur inscrit: ${user.email}`);
  } catch (error) {
    logger.error('Erreur inscription:', error);
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Trouver l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        error: 'Email ou mot de passe incorrect'
      });
    }

    // Générer le token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Retourner la réponse (sans le mot de passe)
    const { password: _, resetToken, resetTokenExpiry, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Connexion réussie',
      user: userWithoutPassword,
      token
    });

    logger.info(`Connexion utilisateur: ${user.email}`);
  } catch (error) {
    logger.error('Erreur connexion:', error);
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        profilePicture: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            applications: true,
            contacts: true,
            reminders: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    logger.error('Erreur récupération profil:', error);
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token requis'
      });
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Utilisateur non trouvé'
        });
      }

      const newToken = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        message: 'Token rafraîchi avec succès',
        token: newToken
      });

    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token invalide'
      });
    }
  } catch (error) {
    logger.error('Erreur refresh token:', error);
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    res.json({
      success: true,
      message: 'Déconnexion réussie'
    });

    logger.info('Utilisateur déconnecté');
  } catch (error) {
    logger.error('Erreur logout:', error);
    next(error);
  }
};

// ✅ ADMIN - Liste tous les utilisateurs
const getAllUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      users,
      total: users.length
    });
  } catch (error) {
    logger.error('Erreur récupération utilisateurs:', error);
    next(error);
  }
};

// ✅ ADMIN - Modifier le rôle d'un utilisateur
const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['USER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Rôle invalide'
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true
      }
    });

    res.json({
      success: true,
      message: 'Rôle mis à jour',
      user
    });

    logger.info(`Rôle utilisateur modifié: ${id} -> ${role}`);
  } catch (error) {
    logger.error('Erreur mise à jour rôle:', error);
    next(error);
  }
};

// ✅ ADMIN - Activer/Désactiver un utilisateur
const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true
      }
    });

    res.json({
      success: true,
      message: `Utilisateur ${isActive ? 'activé' : 'désactivé'}`,
      user
    });

    logger.info(`Statut utilisateur modifié: ${id} -> ${isActive}`);
  } catch (error) {
    logger.error('Erreur modification statut:', error);
    next(error);
  }
};

// ✅ ADMIN - Supprimer un utilisateur
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.user.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Utilisateur supprimé'
    });

    logger.info(`Utilisateur supprimé: ${id}`);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }
    logger.error('Erreur suppression utilisateur:', error);
    next(error);
  }
};

module.exports = {
  register,
  login,
  getProfile,
  refreshToken,
  logout,
  getAllUsers,
  updateUserRole,
  toggleUserStatus,
  deleteUser
};
