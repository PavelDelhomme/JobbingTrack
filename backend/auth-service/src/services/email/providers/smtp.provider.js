/**
 * SMTPEmailProvider - Provider SMTP (OVH, Gmail, etc.)
 * Inspiré de SuperTokens SMTP implementation
 */

const nodemailer = require('nodemailer');
const BaseEmailProvider = require('./base.provider');
const logger = require('../../../utils/logger');

class SMTPEmailProvider extends BaseEmailProvider {
  constructor(config) {
    super();
    this.config = config;
    this.transporter = this.createTransporter();
  }

  /**
   * Créer le transporter Nodemailer
   */
  createTransporter() {
    const transporterConfig = {
      host: this.config.host,
      port: parseInt(this.config.port, 10),
      secure: this.config.secure === 'true' || this.config.secure === true,
      auth: {
        user: this.config.user,
        pass: this.config.password,
      },
    };

    // Support TLS custom (comme SuperTokens)
    if (this.config.tls) {
      transporterConfig.tls = {
        rejectUnauthorized: this.config.tls.rejectUnauthorized !== false,
        minVersion: this.config.tls.minVersion || 'TLSv1.2',
      };
    } else {
      // Par défaut, ne pas rejeter les certificats auto-signés (dev)
      transporterConfig.tls = {
        rejectUnauthorized: false,
      };
    }

    // Pour le port 587, utiliser STARTTLS au lieu de SSL
    if (parseInt(this.config.port, 10) === 587) {
      transporterConfig.requireTLS = true;
    }

    return nodemailer.createTransport(transporterConfig);
  }

  /**
   * Envoyer un email via SMTP
   */
  async sendEmail({ to, subject, htmlContent, textContent, from, replyTo }) {
    try {
      const mailOptions = {
        from: from || this.config.from,
        to: to,
        subject: subject,
        // Headers pour que l'email apparaisse comme venant de noreply@jobbingtrack.com
        headers: {
          'From': from || this.config.from,
          'Reply-To': replyTo || this.config.replyTo || from || this.config.from,
        },
      };

      // Toujours envoyer les 2 versions (best practice SuperTokens)
      if (htmlContent) {
        mailOptions.html = htmlContent;
      }

      if (textContent) {
        mailOptions.text = textContent;
      } else if (htmlContent) {
        // Générer version texte automatiquement si pas fournie
        mailOptions.text = this.htmlToText(htmlContent);
      }

      const info = await this.transporter.sendMail(mailOptions);

      logger.info('✅ [SMTP] Email sent successfully', {
        messageId: info.messageId,
        to: to,
        subject: subject,
        provider: 'SMTP',
      });

      return {
        success: true,
        messageId: info.messageId,
        provider: 'SMTP',
      };
    } catch (error) {
      logger.error('❌ [SMTP] Email send failed', {
        to: to,
        error: error.message,
        code: error.code,
        provider: 'SMTP',
      });

      throw new Error(`SMTP delivery failed: ${error.message}`);
    }
  }

  /**
   * Vérifier la connexion SMTP au démarrage (comme SuperTokens)
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      logger.info('✅ [SMTP] Connection verified', {
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        provider: 'SMTP',
      });
      return true;
    } catch (error) {
      logger.error('❌ [SMTP] Connection verification failed', {
        error: error.message,
        host: this.config.host,
        port: this.config.port,
        provider: 'SMTP',
      });
      // Ne pas throw, juste log (comme SuperTokens)
      return false;
    }
  }

  /**
   * Obtenir le nom du provider
   */
  getProviderName() {
    return 'SMTP';
  }

  /**
   * Helper : Convertir HTML en texte simple
   */
  htmlToText(html) {
    if (!html) return '';
    
    return html
      .replace(/<style[^>]*>.*?<\/style>/gms, '')
      .replace(/<script[^>]*>.*?<\/script>/gms, '')
      .replace(/<[^>]+>/gm, '')
      .replace(/\s+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }
}

module.exports = SMTPEmailProvider;

