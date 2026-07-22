const axios = require('axios');
const logger = require('../utils/logger');

const COMPANY_SERVICE_URL = process.env.COMPANY_SERVICE_URL || 'http://company-service:3003';

/**
 * 🏢 Service de gestion intelligente des entreprises
 * 
 * Logique métier :
 * - Vérifie si une entreprise existe par son nom
 * - Créé automatiquement si elle n'existe pas
 * - Retourne toujours un ID d'entreprise valide
 */
class CompanyService {
  
  /**
   * Récupère ou créé une entreprise automatiquement
   * @param {string} companyName - Nom de l'entreprise
   * @param {object} additionalData - Données supplémentaires (website, location, etc.)
   * @param {string} authToken - Token JWT pour authentification
   * @returns {Promise<string>} - ID de l'entreprise
   */
  async getOrCreateCompany(companyName, additionalData = {}, authToken) {
    try {
      if (!companyName || companyName.trim() === '') {
        throw new Error('Le nom de l\'entreprise est requis');
      }

      // 1️⃣ Vérifier si l'entreprise existe déjà
      logger.info(`Vérification existence entreprise: ${companyName}`);
      
      try {
        const existingCompany = await this.getCompanyByName(companyName, authToken);
        if (existingCompany) return existingCompany.id;
      } catch (error) {
        // Si 404, l'entreprise n'existe pas, on continue pour la créer
        if (error.response?.status !== 404) {
          throw error;
        }
      }

      // 2️⃣ Créer nouvelle entreprise
      logger.info(`Création nouvelle entreprise: ${companyName}`);
      const newCompany = await this.createCompany({
        name: companyName.trim(),
        ...additionalData
      }, authToken);

      logger.info(`✅ Nouvelle entreprise créée: ${newCompany.name} (${newCompany.id})`);
      return newCompany.id;

    } catch (error) {
      logger.error('Erreur getOrCreateCompany:', error.message);
      throw new Error(`Impossible de gérer l'entreprise: ${error.message}`);
    }
  }

  /**
   * Récupère une entreprise par son nom
   */
  async getCompanyByName(name, authToken) {
    try {
      const response = await axios.get(
        `${COMPANY_SERVICE_URL}/api/v1/companies/by-name/${encodeURIComponent(name)}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          timeout: 5000
        }
      );

      return response.data.company;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Créé une nouvelle entreprise
   */
  async createCompany(companyData, authToken) {
    try {
      const response = await axios.post(
        `${COMPANY_SERVICE_URL}/api/v1/companies`,
        companyData,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );

      return response.data.company;
    } catch (error) {
      logger.error('Erreur création entreprise:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Récupère une entreprise par son ID
   */
  async getCompanyById(companyId, authToken) {
    try {
      const response = await axios.get(
        `${COMPANY_SERVICE_URL}/api/v1/companies/${companyId}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          timeout: 5000
        }
      );

      return response.data.company;
    } catch (error) {
      logger.error('Erreur récupération entreprise:', error.message);
      return null;
    }
  }

  /**
   * Met à jour une entreprise
   */
  async updateCompany(companyId, companyData, authToken) {
    try {
      const response = await axios.put(
        `${COMPANY_SERVICE_URL}/api/v1/companies/${companyId}`,
        companyData,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );

      return response.data.company;
    } catch (error) {
      logger.error('Erreur mise à jour entreprise:', error.message);
      throw error;
    }
  }

  /**
   * Garantit un companyId appartenant au user du token.
   * Si companyId pointe vers l'entreprise d'un autre compte, clone via getOrCreate(name).
   */
  async ensureOwnedCompanyId({
    companyId,
    companyName,
    companyData = {},
    authToken,
    userId,
  }) {
    if (companyId) {
      const existing = await this.getCompanyById(companyId, authToken);
      if (existing && existing.userId === userId) {
        return existing.id;
      }
      const nameFromId = existing?.name;
      const resolvedName = (companyName && String(companyName).trim()) || nameFromId;
      if (!resolvedName) {
        throw new Error('Entreprise introuvable ou non accessible pour ce compte');
      }
      logger.warn(
        `Entreprise ${companyId} hors scope user ${userId} → getOrCreate("${resolvedName}")`,
      );
      return this.getOrCreateCompany(resolvedName, companyData || {}, authToken);
    }

    if (companyName && String(companyName).trim()) {
      return this.getOrCreateCompany(companyName, companyData || {}, authToken);
    }

    throw new Error('companyId ou companyName requis');
  }
}

module.exports = new CompanyService();

