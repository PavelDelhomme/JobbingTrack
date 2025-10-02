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

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email requis'
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    // Pour la sécurité, on renvoie toujours le même message
    const successMessage = 'Si cet email existe, un lien de réinitialisation a été envoyé';

    if (!user) {
      return res.json({
        success: true,
        message: successMessage
      });
    }

    // Générer un token de reset
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Sauvegarder le token avec expiration (1 heure)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry: new Date(Date.now() + 3600000) // 1 heure
      }
    });

    // Envoyer l'email (async)
    emailService.sendResetPasswordEmail(user, resetToken).catch(error => {
      logger.error('Erreur envoi email reset:', error);
    });

    res.json({
      success: true,
      message: successMessage
    });

    logger.info(`Reset password demandé pour: ${email}`);
  } catch (error) {
    logger.error('Erreur forgot password:', error);
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        error: 'Token et mot de passe requis'
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExpiry: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Token invalide ou expiré'
      });
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(password, 12);

    // Mettre à jour l'utilisateur
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès'
    });

    logger.info(`Mot de passe réinitialisé pour: ${user.email}`);
  } catch (error) {
    logger.error('Erreur reset password:', error);
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

const updateProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const userId = req.user.userId;
    const { firstName, lastName, phone } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phone: phone || undefined
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        profilePicture: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      user
    });

    logger.info(`Profil mis à jour: ${user.email}`);
  } catch (error) {
    logger.error('Erreur mise à jour profil:', error);
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({
        success: false,
        error: 'Mot de passe actuel incorrect'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword
      }
    });

    res.json({
      success: true,
      message: 'Mot de passe changé avec succès'
    });

    logger.info(`Mot de passe changé pour: ${user.email}`);
  } catch (error) {
    logger.error('Erreur changement mot de passe:', error);
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

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  changePassword,
  refreshToken,
  logout
};