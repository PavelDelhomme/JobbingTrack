/**
 * EmailService - Service principal d'envoi d'emails
 * Architecture inspirée de SuperTokens avec pattern Strategy
 */

const { PrismaClient } = require('@prisma/client');
const { prisma } = require('../utils/prismaClient');
const logger = require('../utils/logger');
const { replaceVariables } = require('../utils/templateParser');

// Providers
const SMTPEmailProvider = require('./email/providers/smtp.provider');
const ResendEmailProvider = require('./email/providers/resend.provider');

// Service Python pour l'envoi d'emails (reset password et verification)
const PythonEmailService = require('./email/pythonEmailService');

// Templates (fallback si pas en DB)
const welcomeTemplate = require('./email/templates/welcome.template');
const resetPasswordTemplate = require('./email/templates/resetPassword.template');
const verificationTemplate = require('./email/templates/verification.template');
const passwordChangedTemplate = require('./email/templates/passwordChanged.template');

class EmailService {
  constructor() {
    this.provider = null;
    this.initialized = false;
  }

  /**
   * Initialiser le provider selon la configuration (Pattern Strategy - SuperTokens)
   */
  initializeProvider() {
    if (this.initialized && this.provider) {
      return this.provider;
    }

    const emailProvider = process.env.EMAIL_PROVIDER || 'SMTP';

    switch (emailProvider.toUpperCase()) {
      case 'RESEND':
        logger.info('📧 [EmailService] Initializing Resend provider');
        this.provider = new ResendEmailProvider({
          apiKey: process.env.RESEND_API_KEY,
          from: process.env.SMTP_FROM || process.env.EMAIL_FROM || 'noreply@jobbingtrack.test',
          replyTo: process.env.SMTP_REPLY_TO || 'noreply@jobbingtrack.test',
        });
        break;

      case 'SMTP':
      default:
        logger.info('📧 [EmailService] Initializing SMTP provider');
        // Configuration SMTP :
        // - user/password : authentification SMTP (ex: redacted@example.invalid)
        // - from : adresse d'affichage pour le destinataire (ex: noreply@jobbingtrack.test)
        // Note: Certains serveurs SMTP (OVH) peuvent rejeter si le domaine From diffère
        // Dans ce cas, utiliser le format "JobbingTrack <redacted@example.invalid>" pour from
        this.provider = new SMTPEmailProvider({
          host: process.env.SMTP_HOST || 'mailhog',
          port: process.env.SMTP_PORT || '1025',
          secure: process.env.SMTP_SECURE || 'false',
          // Authentification SMTP (adresse réelle du serveur)
          user: process.env.SMTP_USER, // ex: redacted@example.invalid
          password: process.env.SMTP_PASS,
          // Adresse d'affichage (ce que voit le destinataire)
          from: process.env.SMTP_FROM || 'JobbingTrack <noreply@jobbingtrack.test>',
          replyTo: process.env.SMTP_REPLY_TO || 'noreply@jobbingtrack.test',
          tls: {
            rejectUnauthorized: false, // Pour dev
          },
        });
        break;
    }

    // Vérifier la connexion au démarrage (comme SuperTokens)
    this.provider.verifyConnection().then((verified) => {
      if (verified) {
        logger.info(`✅ [EmailService] Provider ${this.provider.getProviderName()} initialized and verified`);
      } else {
        logger.warn(`⚠️ [EmailService] Provider ${this.provider.getProviderName()} initialized but verification failed`);
      }
    });

    this.initialized = true;
    return this.provider;
  }

  /**
   * Obtenir le provider actuel (lazy initialization)
   */
  getProvider() {
    if (!this.provider) {
      this.initializeProvider();
    }
    return this.provider;
  }

  /**
   * Transporter Nodemailer (pour compatibilité avec l'ancien code)
   * @deprecated Utiliser getProvider().sendEmail() à la place
   */
  get transporter() {
    const provider = this.getProvider();
    if (provider.getProviderName() === 'SMTP') {
      return provider.transporter;
    }
    throw new Error('transporter only available for SMTP provider');
  }

  /**
   * Logger un email dans la base de données
   */
  async logEmail(emailData) {
    try {
      const { userId, to, from, subject, type, emailContent, metadata } = emailData;

      // Vérifier si la table EmailLog existe
      let emailLog = null;
      try {
        emailLog = await prisma.emailLog.create({
          data: {
            userId: userId || null,
            to,
            from: from || process.env.SMTP_FROM || 'noreply@jobbingtrack.test',
            subject,
            type,
            status: 'PENDING',
            emailContent,
            metadata: metadata || {},
          },
        });
      } catch (dbError) {
        // Si la table n'existe pas, logger l'erreur mais continuer
        if (dbError.code === 'P2021') {
          logger.warn('Table EmailLog non trouvée, email sera envoyé sans log. Exécutez: make db-push-all');
          // Retourner un objet mock pour que le code continue
          emailLog = { id: 'temp-' + Date.now() };
        } else {
          throw dbError;
        }
      }

      return emailLog;
    } catch (error) {
      logger.error('Erreur lors du log email:', error);
      // Ne pas faire échouer l'envoi si le log échoue
      return null;
    }
  }

  /**
   * Mettre à jour le statut d'un email loggé
   */
  async updateEmailLogStatus(emailLogId, status, error = null, sentAt = null) {
    try {
      // Ignorer si l'ID est temporaire (table EmailLog n'existe pas)
      if (emailLogId && emailLogId.toString().startsWith('temp-')) {
        logger.debug('EmailLog temporaire, mise à jour ignorée');
        return;
      }

      await prisma.emailLog.update({
        where: { id: emailLogId },
        data: {
          status,
          error: error ? error.toString() : null,
          sentAt: sentAt || (status === 'SENT' ? new Date() : null),
        },
      });
    } catch (error) {
      logger.error('Erreur lors de la mise à jour du log email:', error);
      // Ne pas faire échouer l'envoi si la mise à jour du log échoue
    }
  }

  /**
   * Récupérer un template depuis la DB ou utiliser le fallback
   */
  async getTemplate(type) {
    try {
      const template = await prisma.emailTemplate.findUnique({
        where: { type, isActive: true },
      });
      return template;
    } catch (error) {
      logger.warn(`Erreur récupération template ${type} depuis DB, utilisation du fallback:`, error.message);
      return null;
    }
  }

  /**
   * Envoyer un email de bienvenue
   */
  async sendWelcomeEmail(user) {
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      const appName = 'JobbingTrack';
      const userName = user.firstName || 'Utilisateur';

      // Essayer de récupérer le template depuis la DB
      const dbTemplate = await this.getTemplate('WELCOME');
      let html, text, subject;

      if (dbTemplate && dbTemplate.isActive) {
        // Utiliser le template de la DB
        html = replaceVariables(dbTemplate.htmlContent, {
          userName,
          firstName: userName,
          appName,
          frontendUrl,
        });
        text = dbTemplate.textContent ? replaceVariables(dbTemplate.textContent, {
          userName,
          firstName: userName,
          appName,
          frontendUrl,
        }) : null;
        subject = replaceVariables(dbTemplate.subject, {
          userName,
          firstName: userName,
          appName,
          frontendUrl,
        });
      } else {
        // Fallback sur le template fichier
        html = welcomeTemplate.getWelcomeEmailHTML({
          userName,
          appName,
          frontendUrl,
        });
        text = welcomeTemplate.getWelcomeEmailText({
          userName,
          appName,
          frontendUrl,
        });
        subject = '🎉 Bienvenue sur JobbingTrack !';
      }

      // Logger l'email
      const emailLog = await this.logEmail({
        userId: user.id,
        to: user.email,
        from: process.env.SMTP_FROM || 'noreply@jobbingtrack.test',
        subject,
        type: 'WELCOME',
        emailContent: html,
        metadata: { appName, frontendUrl },
      });

      // Envoyer l'email via le provider
      const result = await this.getProvider().sendEmail({
        to: user.email,
        subject,
        htmlContent: html,
        textContent: text,
        from: process.env.SMTP_FROM || 'noreply@jobbingtrack.test',
        replyTo: process.env.SMTP_REPLY_TO || 'noreply@jobbingtrack.test',
      });

      // Mettre à jour le statut
      if (emailLog && emailLog.id) {
        await this.updateEmailLogStatus(emailLog.id, 'SENT');
      }

      logger.info(`Email de bienvenue envoyé à ${user.email}`);
      return result;
    } catch (error) {
      // Mettre à jour le statut en FAILED
      if (emailLog && emailLog.id) {
        await this.updateEmailLogStatus(emailLog.id, 'FAILED', error);
      }
      logger.error('Erreur envoi email bienvenue:', error);
      throw error;
    }
  }

  /**
   * Envoyer un email de réinitialisation de mot de passe
   * Utilise le service Python pour l'envoi
   */
  async sendPasswordResetEmail(user, resetToken) {
    let emailLog = null;
    try {
      // Logger l'email dans la DB
      try {
        emailLog = await this.logEmail({
          userId: user.id,
          to: user.email,
          from: process.env.SMTP_FROM || 'noreply@jobbingtrack.test',
          subject: '🔐 Réinitialisation de votre mot de passe JobbingTrack',
          type: 'RESET_PASSWORD',
          emailContent: `Reset password email for ${user.email}`,
          metadata: { resetToken, userId: user.id },
        });
      } catch (dbError) {
        logger.warn('Erreur log email (table EmailLog peut-être absente):', dbError.message);
      }

      // Utiliser le service Python pour l'envoi
      logger.info(`[EmailService] Utilisation du service Python pour reset password`);
      const result = await PythonEmailService.sendPasswordResetEmail(user, resetToken);

      // Mettre à jour le statut
      if (emailLog && emailLog.id && !emailLog.id.toString().startsWith('temp-')) {
        if (result.success) {
          await this.updateEmailLogStatus(emailLog.id, 'SENT');
        } else {
          await this.updateEmailLogStatus(emailLog.id, 'FAILED', result.error);
        }
      }

      if (result.success) {
        logger.info(`Email de réinitialisation envoyé à ${user.email} via service Python`);
      } else {
        logger.error(`Erreur envoi email réinitialisation via Python: ${result.error}`);
      }

      return result;
    } catch (error) {
      logger.error('Erreur envoi email réinitialisation:', error);
      // Mettre à jour le statut en FAILED si emailLog existe
      if (emailLog && emailLog.id && !emailLog.id.toString().startsWith('temp-')) {
        await this.updateEmailLogStatus(emailLog.id, 'FAILED', error);
      }
      throw error;
    }
  }

  /**
   * Envoyer un email de vérification
   * Utilise le service Python pour l'envoi
   * @param {Object} user - Utilisateur
   * @param {string} verificationToken - Token de vérification
   */
  async sendVerificationEmail(user, verificationToken) {
    let emailLog = null;
    try {
      // Logger l'email dans la DB
      try {
        emailLog = await this.logEmail({
          userId: user.id,
          to: user.email,
          from: process.env.SMTP_FROM || 'noreply@jobbingtrack.test',
          subject: '✅ Vérifiez votre adresse email - JobbingTrack',
          type: 'VERIFICATION',
          emailContent: `Verification email for ${user.email}`,
          metadata: { verificationToken, userId: user.id },
        });
      } catch (dbError) {
        logger.warn('Erreur log email (table EmailLog peut-être absente):', dbError.message);
      }

      // Utiliser le service Python pour l'envoi
      logger.info(`[EmailService] Utilisation du service Python pour vérification email`);
      const result = await PythonEmailService.sendVerificationEmail(user, verificationToken);

      // Mettre à jour le statut
      if (emailLog && emailLog.id && !emailLog.id.toString().startsWith('temp-')) {
        if (result.success) {
          await this.updateEmailLogStatus(emailLog.id, 'SENT');
        } else {
          await this.updateEmailLogStatus(emailLog.id, 'FAILED', result.error);
        }
      }

      if (result.success) {
        logger.info(`Email de vérification envoyé à ${user.email} via service Python`);
      } else {
        logger.error(`Erreur envoi email vérification via Python: ${result.error}`);
      }

      return result;
    } catch (error) {
      logger.error('Erreur envoi email vérification:', error);
      // Mettre à jour le statut en FAILED si emailLog existe
      if (emailLog && emailLog.id && !emailLog.id.toString().startsWith('temp-')) {
        await this.updateEmailLogStatus(emailLog.id, 'FAILED', error);
      }
      throw error;
    }
  }

  /**
   * Envoyer un email de confirmation de changement de mot de passe
   * @param {Object} user - Utilisateur
   */
  async sendPasswordChangedEmail(user) {
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      const appName = 'JobbingTrack';
      const userName = user.firstName || 'Utilisateur';
      const changeTime = new Date().toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      const supportLink = `${frontendUrl}/support`;

      // Essayer de récupérer le template depuis la DB
      const dbTemplate = await this.getTemplate('PASSWORD_CHANGED');
      let html, text, subject;

      if (dbTemplate && dbTemplate.isActive) {
        // Utiliser le template de la DB
        html = replaceVariables(dbTemplate.htmlContent, {
          userName,
          firstName: userName,
          appName,
          changeTime,
          supportLink,
        });
        text = dbTemplate.textContent ? replaceVariables(dbTemplate.textContent, {
          userName,
          firstName: userName,
          appName,
          changeTime,
          supportLink,
        }) : null;
        subject = replaceVariables(dbTemplate.subject, {
          userName,
          firstName: userName,
          appName,
        });
      } else {
        // Fallback sur le template fichier
        html = passwordChangedTemplate.getPasswordChangedEmailHTML({
          userName,
          appName,
          changeTime,
          supportLink,
        });
        text = passwordChangedTemplate.getPasswordChangedEmailText({
          userName,
          appName,
          changeTime,
          supportLink,
        });
        subject = '✅ Votre mot de passe a été modifié - JobbingTrack';
      }

      // Logger l'email
      const emailLog = await this.logEmail({
        userId: user.id,
        to: user.email,
        from: process.env.SMTP_FROM || 'noreply@jobbingtrack.test',
        subject,
        type: 'PASSWORD_CHANGED',
        emailContent: html,
        metadata: { changeTime },
      });

      // Envoyer l'email via le provider
      const result = await this.getProvider().sendEmail({
        to: user.email,
        subject,
        htmlContent: html,
        textContent: text,
        from: process.env.SMTP_FROM || 'noreply@jobbingtrack.test',
        replyTo: process.env.SMTP_REPLY_TO || 'noreply@jobbingtrack.test',
      });

      // Mettre à jour le statut
      if (emailLog && emailLog.id) {
        await this.updateEmailLogStatus(emailLog.id, 'SENT');
      }

      logger.info(`Email de confirmation de changement de mot de passe envoyé à ${user.email}`);
      return result;
    } catch (error) {
      // Mettre à jour le statut en FAILED
      if (emailLog && emailLog.id) {
        await this.updateEmailLogStatus(emailLog.id, 'FAILED', error);
      }
      logger.error('Erreur envoi email confirmation changement mot de passe:', error);
      throw error;
    }
  }

  /**
   * Envoyer un email générique (pour les tests)
   */
  async sendGenericEmail({ to, subject, htmlContent, textContent, from, replyTo }) {
    try {
      const result = await this.getProvider().sendEmail({
        to,
        subject,
        htmlContent,
        textContent,
        from: from || process.env.SMTP_FROM || 'noreply@jobbingtrack.test',
        replyTo: replyTo || process.env.SMTP_REPLY_TO || 'noreply@jobbingtrack.test',
      });

      logger.info(`Email générique envoyé à ${to}`);
      return result;
    } catch (error) {
      logger.error('Erreur envoi email générique:', error);
      throw error;
    }
  }

  /**
   * Vérifier la connexion du provider
   */
  async verifyConnection() {
    return await this.getProvider().verifyConnection();
  }
}

// Singleton (comme SuperTokens)
module.exports = new EmailService();
