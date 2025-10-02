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
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" 
                 style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Commencer maintenant
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 30px;">
              Si vous avez des questions, n'hésitez pas à nous contacter.
            </p>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`Email de bienvenue envoyé à ${user.email}`);
    } catch (error) {
      logger.error('Erreur envoi email bienvenue:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();
