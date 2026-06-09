const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const transportConfig = {
      host: process.env.SMTP_HOST || 'mailhog',
      port: Number(process.env.SMTP_PORT || 1025),
      secure: process.env.SMTP_SECURE === 'true',
      tls: {
        rejectUnauthorized: false
      }
    };

    if (smtpUser && smtpPass) {
      transportConfig.auth = {
        user: smtpUser,
        pass: smtpPass
      };
    } else if (smtpUser || smtpPass) {
      logger.warn('Configuration SMTP incomplète: auth désactivée car SMTP_USER ou SMTP_PASS manque');
    }

    this.transporter = nodemailer.createTransport(transportConfig);
  }

  async sendEmail(to, subject, html, options = {}) {
    try {
      const mailOptions = {
        from: options.from || process.env.SMTP_FROM || 'JobbingTrack <redacted@example.invalid>',
        to,
        subject,
        html,
        replyTo: options.replyTo || process.env.SMTP_REPLY_TO || undefined
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email envoyé à ${to}: ${info.messageId}`);
      return info;
    } catch (error) {
      logger.error('Erreur envoi email:', error);
      throw error;
    }
  }

  async sendNotificationEmail(user, notification) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #3b82f6; margin: 0;">JobbingTrack</h1>
        </div>

        <h2 style="color: #1f2937;">${notification.title}</h2>
        <p>${notification.message}</p>

        ${notification.link ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${notification.link}"
               style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Voir les détails
            </a>
          </div>
        ` : ''}

        <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 30px;">
          Cordialement,<br>L'équipe JobbingTrack
        </p>
      </div>
    `;

    return this.sendEmail(user.email, notification.title, html);
  }

  async sendReminderEmail(user, reminder) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #3b82f6; margin: 0;">🔔 JobbingTrack</h1>
        </div>

        <h2 style="color: #1f2937;">Rappel : ${reminder.title}</h2>
        ${reminder.description ? `<p>${reminder.description}</p>` : ''}

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #374151; margin: 0;">
            N'oubliez pas de prendre les actions nécessaires concernant cette tâche.
          </p>
        </div>

        <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 30px;">
          Cordialement,<br>L'équipe JobbingTrack
        </p>
      </div>
    `;

    return this.sendEmail(user.email, `Rappel : ${reminder.title}`, html);
  }
}

module.exports = new EmailService();

