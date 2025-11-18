const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class EmailService {
  constructor() {
    // Configuration de base
    const config = {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      tls: {
        rejectUnauthorized: false
      }
    };

    // Ajouter l'authentification seulement si SMTP_USER est défini
    // (MailHog n'a pas besoin d'auth)
    if (process.env.SMTP_USER && process.env.SMTP_USER.trim() !== '') {
      config.auth = {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      };
    }

    this.transporter = nodemailer.createTransport(config);
  }

  /**
   * Logger un email dans la base de données
   */
  async logEmail(emailData) {
    try {
      const { userId, to, from, subject, type, emailContent, metadata } = emailData;
      
      const emailLog = await prisma.emailLog.create({
        data: {
          userId: userId || null,
          to,
          from: from || process.env.SMTP_FROM,
          subject,
          type,
          status: 'PENDING',
          emailContent,
          metadata: metadata || {}
        }
      });

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
      await prisma.emailLog.update({
        where: { id: emailLogId },
        data: {
          status,
          error: error ? error.toString() : null,
          sentAt: sentAt || (status === 'SENT' ? new Date() : null)
        }
      });
    } catch (error) {
      logger.error('Erreur lors de la mise à jour du log email:', error);
    }
  }

  async sendWelcomeEmail(user) {
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #3b82f6; margin: 0;">JobbingTrack</h1>
          <p style="color: #6b7280; margin: 5px 0;">Votre assistant personnel pour la recherche d'emploi</p>
        </div>

        <h2 style="color: #1f2937;">Bienvenue ${user.firstName} ! 🎉</h2>

        <p>Félicitations ! Votre compte JobbingTrack a été créé avec succès.</p>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #374151; margin-top: 0;">🚀 Vous pouvez maintenant :</h3>
          <ul style="color: #4b5563; line-height: 1.6;">
            <li>📝 <strong>Suivre vos candidatures</strong> - Gardez trace de toutes vos applications</li>
            <li>📅 <strong>Gérer vos entretiens</strong> - Planifiez et préparez vos rendez-vous</li>
            <li>🔔 <strong>Recevoir des rappels</strong> - Ne manquez plus jamais une relance</li>
            <li>👥 <strong>Organiser vos contacts</strong> - Votre carnet d'adresses professionnel</li>
            <li>📊 <strong>Analyser vos performances</strong> - Statistiques de vos candidatures</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}"
             style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Commencer maintenant
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 30px;">
          Si vous avez des questions, n'hésitez pas à nous contacter.
        </p>
      </div>
    `;

    let emailLog = null;
    try {
      // Logger l'email avant l'envoi
      emailLog = await this.logEmail({
        userId: user.id,
        to: user.email,
        from: process.env.SMTP_FROM,
        subject: '🎉 Bienvenue sur JobbingTrack !',
        type: 'WELCOME',
        emailContent,
        metadata: { firstName: user.firstName, lastName: user.lastName }
      });

      const mailOptions = {
        from: process.env.SMTP_FROM,
        to: user.email,
        subject: '🎉 Bienvenue sur JobbingTrack !',
        html: emailContent
      };

      await this.transporter.sendMail(mailOptions);
      
      // Mettre à jour le statut en SENT
      if (emailLog) {
        await this.updateEmailLogStatus(emailLog.id, 'SENT');
      }
      
      logger.info(`Email de bienvenue envoyé à ${user.email}`);
    } catch (error) {
      // Mettre à jour le statut en FAILED
      if (emailLog) {
        await this.updateEmailLogStatus(emailLog.id, 'FAILED', error);
      }
      logger.error('Erreur envoi email bienvenue:', error);
      throw error;
    }
  }

  async sendPasswordResetEmail(user, resetUrl) {
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #3b82f6; margin: 0;">JobbingTrack</h1>
          <p style="color: #6b7280; margin: 5px 0;">Réinitialisation de mot de passe</p>
        </div>

        <h2 style="color: #1f2937;">Bonjour ${user.firstName},</h2>

        <p>Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte JobbingTrack.</p>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #374151; margin: 0;">
            Cliquez sur le bouton ci-dessous pour réinitialiser votre mot de passe. Ce lien est valide pendant <strong>1 heure</strong>.
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}"
             style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Réinitialiser mon mot de passe
          </a>
        </div>

        <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="color: #92400e; margin: 0; font-size: 14px;">
            <strong>Si vous n'avez pas demandé cette réinitialisation,</strong> ignorez simplement cet email. Votre mot de passe restera inchangé.
          </p>
        </div>

        <p style="color: #6b7280; font-size: 14px;">
          Pour des raisons de sécurité, ne partagez jamais ce lien avec qui que ce soit.
        </p>

        <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 30px;">
          Cordialement,<br>L'équipe JobbingTrack
        </p>
      </div>
    `;

    let emailLog = null;
    try {
      // Logger l'email avant l'envoi
      emailLog = await this.logEmail({
        userId: user.id,
        to: user.email,
        from: process.env.SMTP_FROM,
        subject: '🔐 Réinitialisation de votre mot de passe JobbingTrack',
        type: 'RESET_PASSWORD',
        emailContent,
        metadata: { resetUrl, firstName: user.firstName }
      });

      const mailOptions = {
        from: process.env.SMTP_FROM,
        to: user.email,
        subject: '🔐 Réinitialisation de votre mot de passe JobbingTrack',
        html: emailContent
      };

      await this.transporter.sendMail(mailOptions);
      
      // Mettre à jour le statut en SENT
      if (emailLog) {
        await this.updateEmailLogStatus(emailLog.id, 'SENT');
      }
      
      logger.info(`Email de réinitialisation envoyé à ${user.email}`);
    } catch (error) {
      // Mettre à jour le statut en FAILED
      if (emailLog) {
        await this.updateEmailLogStatus(emailLog.id, 'FAILED', error);
      }
      logger.error('Erreur envoi email réinitialisation:', error);
      throw error;
    }
  }

  async sendVerificationEmail(user, verificationUrl) {
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #3b82f6; margin: 0;">JobbingTrack</h1>
          <p style="color: #6b7280; margin: 5px 0;">Vérification de votre adresse email</p>
        </div>

        <h2 style="color: #1f2937;">Bonjour ${user.firstName} ! 👋</h2>

        <p>Bienvenue sur JobbingTrack ! Pour activer votre compte et commencer à utiliser toutes nos fonctionnalités, veuillez vérifier votre adresse email.</p>

        <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
          <p style="color: #1e40af; margin: 0; font-size: 14px;">
            <strong>Pourquoi vérifier mon email ?</strong><br>
            La vérification de votre email assure la sécurité de votre compte et vous permet de recevoir des notifications importantes concernant vos candidatures.
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}"
             style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            ✓ Vérifier mon adresse email
          </a>
        </div>

        <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="color: #374151; margin: 0; font-size: 13px;">
            <strong>Le bouton ne fonctionne pas ?</strong><br>
            Copiez et collez ce lien dans votre navigateur :<br>
            <code style="background: #fff; padding: 5px 10px; border-radius: 4px; display: inline-block; margin-top: 8px; word-break: break-all;">${verificationUrl}</code>
          </p>
        </div>

        <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="color: #92400e; margin: 0; font-size: 14px;">
            <strong>Ce lien expire dans 24 heures.</strong> Si vous n'avez pas créé de compte sur JobbingTrack, ignorez simplement cet email.
          </p>
        </div>

        <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 30px;">
          Besoin d'aide ? Contactez-nous à support@jobbingtrack.com<br>
          <br>
          Cordialement,<br>L'équipe JobbingTrack
        </p>
      </div>
    `;

    let emailLog = null;
    try {
      // Logger l'email avant l'envoi
      emailLog = await this.logEmail({
        userId: user.id,
        to: user.email,
        from: process.env.SMTP_FROM,
        subject: '✅ Vérifiez votre adresse email - JobbingTrack',
        type: 'VERIFICATION',
        emailContent,
        metadata: { verificationUrl, firstName: user.firstName }
      });

      const mailOptions = {
        from: process.env.SMTP_FROM,
        to: user.email,
        subject: '✅ Vérifiez votre adresse email - JobbingTrack',
        html: emailContent
      };

      await this.transporter.sendMail(mailOptions);
      
      // Mettre à jour le statut en SENT
      if (emailLog) {
        await this.updateEmailLogStatus(emailLog.id, 'SENT');
      }
      
      logger.info(`Email de vérification envoyé à ${user.email}`);
    } catch (error) {
      // Mettre à jour le statut en FAILED
      if (emailLog) {
        await this.updateEmailLogStatus(emailLog.id, 'FAILED', error);
      }
      logger.error('Erreur envoi email vérification:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();
