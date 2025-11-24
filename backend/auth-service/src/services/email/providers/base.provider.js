/**
 * BaseEmailProvider - Interface commune pour tous les providers d'email
 * Inspiré de SuperTokens EmailDeliveryInterface
 */

class BaseEmailProvider {
  /**
   * @abstract
   * Envoyer un email
   * @param {Object} input
   * @param {string} input.to - Email destinataire
   * @param {string} input.subject - Sujet
   * @param {string} input.htmlContent - Contenu HTML
   * @param {string} [input.textContent] - Contenu texte (optionnel)
   * @returns {Promise<{success: boolean, messageId: string, provider: string}>}
   */
  async sendEmail(input) {
    throw new Error('sendEmail() must be implemented by subclass');
  }

  /**
   * @abstract
   * Vérifier la connexion/configuration du provider
   * @returns {Promise<boolean>}
   */
  async verifyConnection() {
    throw new Error('verifyConnection() must be implemented by subclass');
  }

  /**
   * @abstract
   * Obtenir le nom du provider
   * @returns {string}
   */
  getProviderName() {
    throw new Error('getProviderName() must be implemented by subclass');
  }
}

module.exports = BaseEmailProvider;

