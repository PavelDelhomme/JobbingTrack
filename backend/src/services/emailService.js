// backend/src/services/emailService.js
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendFollowUpReminder(email, application) {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@jobbingtrack.com',
        to: email,
        subject: `⏰ Temps de relancer ${application.company.name}`,
        html: `
          <h2>Il est temps de relancer votre candidature</h2>
          <p>Votre candidature pour le poste <strong>"${application.position}"</strong> chez <strong>${application.company.name}</strong> a été envoyée il y a plus de 7 jours.</p>
          <p>Il serait peut-être temps de faire une relance courtoise pour montrer votre motivation.</p>
          <p><a href="${process.env.FRONTEND_URL}/applications/${application.id}" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Voir la candidature</a></p>
        `
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`Email de rappel envoyé à ${email} pour la candidature ${application.id}`);
    } catch (error) {
      logger.error('Erreur envoi email de rappel:', error);
    }
  }

  async sendInterviewReminder(email, interview) {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@jobbingtrack.com',
        to: email,
        subject: `📅 Entretien demain - ${interview.application.company.name}`,
        html: `
          <h2>Rappel d'entretien demain</h2>
          <p>Vous avez un entretien <strong>${interview.type}</strong> prévu demain :</p>
          <ul>
            <li><strong>Entreprise:</strong> ${interview.application.company.name}</li>
            <li><strong>Poste:</strong> ${interview.application.position}</li>
            <li><strong>Date:</strong> ${interview.scheduledAt.toLocaleDateString('fr-FR')}</li>
            <li><strong>Heure:</strong> ${interview.scheduledAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</li>
            ${interview.location ? `<li><strong>Lieu:</strong> ${interview.location}</li>` : ''}
            ${interview.meetingUrl ? `<li><strong>Lien:</strong> <a href="${interview.meetingUrl}">Rejoindre l'entretien</a></li>` : ''}
          </ul>
          <p>Bonne chance ! 🍀</p>
        `
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`Email de rappel d'entretien envoyé à ${email}`);
    } catch (error) {
      logger.error('Erreur envoi email d\'entretien:', error);
    }
  }
}

module.exports = new EmailService();
