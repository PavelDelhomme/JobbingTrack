/**
 * ResendEmailProvider - Provider Resend API
 * Alternative à SMTP pour meilleure délivrabilité
 */

const BaseEmailProvider = require('./base.provider');
const logger = require('../../../utils/logger');

class ResendEmailProvider extends BaseEmailProvider {
  constructor(config) {
    super();
    this.config = config;
    
    // Lazy load Resend (optionnel)
    try {
      const { Resend } = require('resend');
      this.resend = new Resend(config.apiKey);
      this.available = true;
    } catch (error) {
      logger.warn('⚠️ [Resend] Package not installed. Run: npm install resend');
      this.available = false;
    }
  }

  /**
   * Envoyer un email via Resend
   */
  async sendEmail({ to, subject, htmlContent, textContent, from, replyTo }) {
    if (!this.available) {
      throw new Error('Resend provider not available. Install: npm install resend');
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: from || this.config.from,
        to: [to],
        subject: subject,
        html: htmlContent,
        text: textContent,
        reply_to: replyTo || this.config.replyTo,
      });

      if (error) {
        throw new Error(error.message);
      }

      logger.info('✅ [Resend] Email sent successfully', {
        messageId: data.id,
        to: to,
        subject: subject,
        provider: 'Resend',
      });

      return {
        success: true,
        messageId: data.id,
        provider: 'Resend',
      };
    } catch (error) {
      logger.error('❌ [Resend] Email send failed', {
        to: to,
        error: error.message,
        provider: 'Resend',
      });

      throw new Error(`Resend delivery failed: ${error.message}`);
    }
  }

  /**
   * Vérifier la configuration Resend
   */
  async verifyConnection() {
    if (!this.available) {
      logger.warn('⚠️ [Resend] Provider not available');
      return false;
    }

    try {
      // Resend n'a pas de méthode verify, on simule
      if (!this.config.apiKey) {
        throw new Error('Resend API key not configured');
      }

      logger.info('✅ [Resend] API Key configured', {
        from: this.config.from,
        provider: 'Resend',
      });
      return true;
    } catch (error) {
      logger.error('❌ [Resend] Configuration error', {
        error: error.message,
        provider: 'Resend',
      });
      return false;
    }
  }

  /**
   * Obtenir le nom du provider
   */
  getProviderName() {
    return 'Resend';
  }
}

module.exports = ResendEmailProvider;

