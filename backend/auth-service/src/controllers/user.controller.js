const { PrismaClient } = require('@prisma/client');
const { prisma } = require('../utils/prismaClient');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');

// ✅ Récupérer un utilisateur par ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    let user;
    try {
      user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          emailVerified: true,
          emailVerifiedAt: true,
          lastLoginAt: true,
          // ✅ loginCount n'existe pas dans le schéma Prisma, retiré
          createdAt: true,
          updatedAt: true
        }
      });
    } catch (dbError) {
      // Si la table User n'existe pas, retourner l'utilisateur connecté en développement
      if (dbError.code === 'P2021' && process.env.NODE_ENV === 'development') {
        logger.warn('Table User non trouvée, mode développement. Exécutez: make db-push-all');
        // Si l'ID correspond à l'utilisateur connecté, le retourner
        if (req.user && req.user.id === id) {
          return res.json({
            success: true,
            user: {
              id: req.user.id,
              email: req.user.email,
              firstName: req.user.firstName || 'Admin',
              lastName: req.user.lastName || 'User',
              phone: req.user.phone || null,
              role: req.user.role || 'ADMIN',
              isActive: true,
              emailVerified: true,
              emailVerifiedAt: new Date(),
              lastLoginAt: new Date(),
              // ✅ loginCount n'existe pas dans le schéma Prisma, retiré
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
        }
        return res.status(404).json({
          success: false,
          error: 'Utilisateur non trouvé'
        });
      }
      throw dbError;
    }

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
    logger.error('Erreur récupération utilisateur:', error);
    // En développement, si la table n'existe pas, retourner l'utilisateur connecté
    if (error.code === 'P2021' && process.env.NODE_ENV === 'development' && req.user) {
      logger.warn('Table User non trouvée, mode développement. Exécutez: make db-push-all');
      const { id } = req.params;
      if (req.user.id === id) {
        return res.json({
          success: true,
          user: {
            id: req.user.id,
            email: req.user.email,
            firstName: req.user.firstName || 'Admin',
            lastName: req.user.lastName || 'User',
            phone: req.user.phone || null,
            role: req.user.role || 'ADMIN',
            isActive: true,
            emailVerified: true,
            emailVerifiedAt: new Date(),
            lastLoginAt: new Date(),
            // ✅ loginCount n'existe pas dans le schéma Prisma, retiré
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }
    }
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'utilisateur',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ✅ Mettre à jour un utilisateur
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phone, password } = req.body;

    // Vérifier que l'utilisateur existe
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    // Préparer les données de mise à jour
    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone) updateData.phone = phone;

    // Si l'email change, vérifier qu'il n'existe pas déjà
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });
      
      if (emailExists) {
        return res.status(409).json({
          success: false,
          error: 'Cet email est déjà utilisé'
        });
      }

      updateData.email = email.toLowerCase();
      updateData.emailVerified = false; // Nécessite une nouvelle vérification
      updateData.emailVerificationToken = crypto.randomBytes(32).toString('hex');
    }

    // Si le mot de passe change, le hasher
    const passwordChanged = !!password;
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
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
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Si l'email a changé, envoyer un email de vérification
    if (updateData.email && updateData.emailVerificationToken) {
      try {
        await sendVerificationEmailInternal(
          updatedUser.id,
          updatedUser.email,
          updatedUser.firstName,
          updateData.emailVerificationToken
        );
      } catch (emailError) {
        logger.error('Erreur envoi email de vérification:', emailError);
        // Ne pas échouer la mise à jour si l'email échoue
      }
    }

    // Si le mot de passe a changé, envoyer un email de confirmation
    if (passwordChanged) {
      try {
        const emailService = require('../services/emailService');
        await emailService.sendPasswordChangedEmail(updatedUser);
      } catch (emailError) {
        logger.error('Erreur envoi email confirmation changement mot de passe:', emailError);
        // Ne pas échouer la mise à jour si l'email échoue
      }
    }

    res.json({
      success: true,
      user: updatedUser,
      message: 'Utilisateur mis à jour avec succès'
    });

    logger.info(`Utilisateur mis à jour: ${id}`);
  } catch (error) {
    logger.error('Erreur mise à jour utilisateur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de l\'utilisateur'
    });
  }
};

// ✅ Impersonnaliser un utilisateur (connexion en tant qu'un autre utilisateur)
const impersonateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    // Vérifier que l'utilisateur actuel est admin
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Vous n\'avez pas les permissions pour impersonnaliser un utilisateur'
      });
    }

    // Vérifier que l'utilisateur à impersonnaliser existe
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true
      }
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    if (!targetUser.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Cet utilisateur est désactivé'
      });
    }

    // Créer un token d'impersonalisation
    const impersonationToken = jwt.sign(
      {
        userId: targetUser.id,
        email: targetUser.email,
        role: targetUser.role,
        impersonatedBy: currentUser.id,
        impersonating: true
      },
      process.env.JWT_SECRET,
      { expiresIn: '2h' } // Token valide 2h pour l'impersonalisation
    );

    logger.info(`Impersonalisation: ${currentUser.id} (${currentUser.email}) -> ${targetUser.id} (${targetUser.email})`);

    res.json({
      success: true,
      token: impersonationToken,
      user: targetUser,
      message: `Vous êtes maintenant connecté en tant que ${targetUser.firstName} ${targetUser.lastName}`,
      impersonatedBy: {
        id: currentUser.id,
        email: currentUser.email
      }
    });
  } catch (error) {
    logger.error('Erreur impersonalisation:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'impersonalisation'
    });
  }
};

// ✅ Envoyer un email de vérification
const sendVerificationEmail = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        emailVerified: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        error: 'Cet email est déjà vérifié'
      });
    }

    // Générer un nouveau token de vérification
    const verificationToken = crypto.randomBytes(32).toString('hex');

    await prisma.user.update({
      where: { id },
      data: { emailVerificationToken: verificationToken }
    });

    // Envoyer l'email
    await sendVerificationEmailInternal(user.id, user.email, user.firstName, verificationToken);

    res.json({
      success: true,
      message: 'Email de vérification envoyé avec succès'
    });

    logger.info(`Email de vérification envoyé à: ${user.email}`);
  } catch (error) {
    logger.error('Erreur envoi email de vérification:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'envoi de l\'email de vérification'
    });
  }
};

// ✅ Renvoyer un email de vérification
const resendVerificationEmail = async (req, res) => {
  try {
    return await sendVerificationEmail(req, res);
  } catch (error) {
    logger.error('Erreur renvoi email de vérification:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du renvoi de l\'email de vérification'
    });
  }
};

// ✅ Vérifier l'email avec le token
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await prisma.user.findFirst({
      where: { emailVerificationToken: token }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Token de vérification invalide ou expiré'
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        error: 'Cet email est déjà vérifié'
      });
    }

    // Marquer l'email comme vérifié
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        emailVerificationToken: null
      }
    });

    res.json({
      success: true,
      message: 'Email vérifié avec succès'
    });

    logger.info(`Email vérifié pour l'utilisateur: ${user.email}`);
  } catch (error) {
    logger.error('Erreur vérification email:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la vérification de l\'email'
    });
  }
};

// Fonction interne pour envoyer l'email de vérification
async function sendVerificationEmailInternal(userId, email, firstName, token) {
  const frontendUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:8080';
  const verificationUrl = `${frontendUrl}/verify-email/${token}`;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Vérification de votre email</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Bienvenue sur JobbingTrack !</h1>
        </div>
        <div class="content">
          <p>Bonjour ${firstName},</p>
          
          <p>Merci de vous être inscrit sur JobbingTrack ! Pour activer votre compte, veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous :</p>
          
          <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">Vérifier mon email</a>
          </div>
          
          <p>Ou copiez ce lien dans votre navigateur :</p>
          <p style="background: #eee; padding: 10px; border-radius: 5px; word-break: break-all;">
            ${verificationUrl}
          </p>
          
          <p>Ce lien est valide pendant 24 heures.</p>
          
          <p>Si vous n'avez pas créé de compte sur JobbingTrack, vous pouvez ignorer cet email.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} JobbingTrack - Tous droits réservés</p>
          <p>Cet email a été envoyé à ${email}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await emailService.sendEmail({
      to: email,
      subject: 'Vérifiez votre adresse email - JobbingTrack',
      html: emailHtml
    });
  } catch (error) {
    logger.error('Erreur envoi email de vérification:', error);
    throw error;
  }
}

module.exports = {
  getUserById,
  updateUser,
  impersonateUser,
  sendVerificationEmail,
  resendVerificationEmail,
  verifyEmail
};

