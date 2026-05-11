const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
      port: process.env.SMTP_PORT || 2525,
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

  async sendEmail(to, subject, html) {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || 'JobbingTrack <noreply@jobbingtrack.test>',
        to,
        subject,
        html
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

