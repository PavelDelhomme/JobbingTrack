// backend/src/services/emailService.js
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      // Pour éviter les erreurs de certificat
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  async sendWelcomeEmail(user) {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM,
        to: user.email,
        subject: '🎉 Bienvenue sur JobbingTrack !',
        html: `
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
              <a href="${process.env.FRONTEND_URL}/login" 
                 style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 500;">
                🚀 Accéder à JobbingTrack
              </a>
            </div>
            
            <hr style="margin: 30px 0; border: none; height: 1px; background: #e5e7eb;">
            
            <p style="color: #6b7280; font-size: 14px; text-align: center;">
              Besoin d'aide ? Répondez à cet email<br>
              <strong>L'équipe JobbingTrack</strong><br>
              <a href="${process.env.FRONTEND_URL}" style="color: #3b82f6;">jobbingtrack.delhomme.ovh</a>
            </p>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`✅ Email de bienvenue envoyé à ${user.email}`);
    } catch (error) {
      logger.error('❌ Erreur envoi email bienvenue:', error);
      throw error;
    }
  }

  async sendResetPasswordEmail(user, resetToken) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      
      const mailOptions = {
        from: process.env.SMTP_FROM,
        to: user.email,
        subject: '🔒 Réinitialisation de votre mot de passe JobbingTrack',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #3b82f6; margin: 0;">JobbingTrack</h1>
              <p style="color: #6b7280; margin: 5px 0;">Réinitialisation de mot de passe</p>
            </div>
            
            <h2 style="color: #1f2937;">🔒 Réinitialisation demandée</h2>
            
            <p>Bonjour <strong>${user.firstName}</strong>,</p>
            
            <p>Vous avez demandé une réinitialisation de votre mot de passe JobbingTrack.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: #ef4444; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 500;">
                🔄 Réinitialiser mon mot de passe
              </a>
            </div>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e;">
                <strong>⏰ Ce lien expire dans 1 heure</strong> pour votre sécurité.
              </p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              Si le bouton ne fonctionne pas, copiez ce lien :<br>
              <a href="${resetUrl}" style="color: #3b82f6; word-break: break-all;">${resetUrl}</a>
            </p>
            
            <hr style="margin: 30px 0; border: none; height: 1px; background: #e5e7eb;">
            
            <p style="color: #6b7280; font-size: 14px; text-align: center;">
              <strong>L'équipe JobbingTrack</strong><br>
              <a href="${process.env.FRONTEND_URL}" style="color: #3b82f6;">jobbingtrack.delhomme.ovh</a>
            </p>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`✅ Email de reset envoyé à ${user.email}`);
    } catch (error) {
      logger.error('❌ Erreur envoi email reset:', error);
      throw error;
    }
  }

  // Test de connexion email
  async testConnection() {
    try {
      await this.transporter.verify();
      logger.info('✅ Connexion SMTP vérifiée avec succès');
      return true;
    } catch (error) {
      logger.error('❌ Erreur connexion SMTP:', error);
      return false;
    }
  }

  async sendFollowUpReminder(userEmail, application) {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM,
        to: userEmail,
        subject: `⏰ Temps de relancer ${application.company.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #f59e0b;">⏰ Il est temps de relancer !</h2>
            <p>Votre candidature pour <strong>${application.position}</strong> chez <strong>${application.company.name}</strong> a été envoyée il y a plus de 7 jours.</p>
            <p>Il serait peut-être temps de faire une relance courtoise.</p>
          </div>
        `
      };
  
      await this.transporter.sendMail(mailOptions);
      logger.info(`✅ Email de rappel relance envoyé à ${userEmail}`);
    } catch (error) {
      logger.error('❌ Erreur envoi email rappel:', error);
      // Ne pas faire crash l'app
    }
  }

  async sendInterviewReminder(userEmail, interview) {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM,
        to: userEmail,
        subject: `📅 Entretien demain - ${interview.application.company.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #8b5cf6;">📅 Rappel d'entretien demain</h2>
            <p>Vous avez un entretien prévu demain :</p>
            <ul>
              <li><strong>Entreprise:</strong> ${interview.application.company.name}</li>
              <li><strong>Poste:</strong> ${interview.application.position}</li>
              <li><strong>Type:</strong> ${interview.type}</li>
            </ul>
            <p style="color: #10b981; font-weight: bold;">🍀 Bonne chance !</p>
          </div>
        `
      };
  
      await this.transporter.sendMail(mailOptions);
      logger.info(`✅ Email de rappel entretien envoyé à ${userEmail}`);
    } catch (error) {
      logger.error('❌ Erreur envoi email entretien:', error);
      // Ne pas faire crash l'app
    }
  }

}

module.exports = new EmailService();