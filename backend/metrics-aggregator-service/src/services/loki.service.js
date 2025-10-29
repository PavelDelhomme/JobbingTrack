const axios = require('axios');

const LOKI_URL = process.env.LOKI_URL || 'http://loki:3100';

/**
 * Service pour interagir avec Loki
 */
class LokiService {
  /**
   * Effectue une requête de logs sur une plage de temps
   * @param {string} query - Requête LogQL
   * @param {number} limit - Nombre maximum de lignes
   * @param {string} start - Timestamp de début (nanoseconds Unix)
   * @param {string} end - Timestamp de fin (nanoseconds Unix)
   * @returns {Promise<Object>} Résultat de la requête
   */
  async queryLogs(query, limit = 100, start = null, end = null) {
    try {
      const params = {
        query,
        limit: parseInt(limit),
        direction: 'backward'
      };

      if (start) params.start = start;
      if (end) params.end = end;

      const response = await axios.get(`${LOKI_URL}/loki/api/v1/query_range`, {
        params,
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      console.error(`[Loki] Erreur query "${query}":`, error.message);
      throw new Error(`Loki query failed: ${error.message}`);
    }
  }

  /**
   * Stream des logs en temps réel
   * @param {string} query - Requête LogQL
   * @returns {Promise<Stream>} Stream de logs
   */
  async streamLogs(query) {
    try {
      const response = await axios.get(`${LOKI_URL}/loki/api/v1/tail`, {
        params: { query },
        responseType: 'stream',
        timeout: 0 // Pas de timeout pour le streaming
      });

      return response.data;
    } catch (error) {
      console.error(`[Loki] Erreur stream "${query}":`, error.message);
      throw new Error(`Loki stream failed: ${error.message}`);
    }
  }

  /**
   * Récupère les logs d'un conteneur spécifique
   * @param {string} containerName - Nom du conteneur
   * @param {number} limit - Nombre maximum de lignes
   * @param {string} start - Timestamp de début
   * @param {string} end - Timestamp de fin
   * @returns {Promise<Object>} Logs du conteneur
   */
  async getContainerLogs(containerName, limit = 100, start = null, end = null) {
    try {
      const query = `{container="${containerName}"}`;
      const data = await this.queryLogs(query, limit, start, end);

      return {
        success: true,
        container: containerName,
        timestamp: new Date().toISOString(),
        limit,
        logs: data.data.result
      };
    } catch (error) {
      return {
        success: false,
        container: containerName,
        error: error.message
      };
    }
  }

  /**
   * Récupère tous les logs de tous les services
   * @param {number} limit - Nombre maximum de lignes
   * @param {string} start - Timestamp de début
   * @param {string} end - Timestamp de fin
   * @param {string} service - Filtrer par service (optionnel)
   * @returns {Promise<Object>} Tous les logs
   */
  async getAllLogs(limit = 100, start = null, end = null, service = null) {
    try {
      const query = service ? `{service="${service}"}` : `{job="docker"}`;
      const data = await this.queryLogs(query, limit, start, end);

      return {
        success: true,
        timestamp: new Date().toISOString(),
        limit,
        service: service || 'all',
        logs: data.data.result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Recherche dans les logs avec une expression régulière
   * @param {string} containerName - Nom du conteneur
   * @param {string} pattern - Pattern de recherche
   * @param {number} limit - Nombre maximum de lignes
   * @returns {Promise<Object>} Logs correspondants
   */
  async searchLogs(containerName, pattern, limit = 100) {
    try {
      const query = `{container="${containerName}"} |~ "${pattern}"`;
      const data = await this.queryLogs(query, limit);

      return {
        success: true,
        container: containerName,
        pattern,
        timestamp: new Date().toISOString(),
        logs: data.data.result
      };
    } catch (error) {
      return {
        success: false,
        container: containerName,
        pattern,
        error: error.message
      };
    }
  }

  /**
   * Compte les occurrences d'un pattern dans les logs
   * @param {string} containerName - Nom du conteneur
   * @param {string} pattern - Pattern à compter
   * @param {string} timeRange - Plage de temps (ex: '5m', '1h')
   * @returns {Promise<Object>} Nombre d'occurrences
   */
  async countPattern(containerName, pattern, timeRange = '5m') {
    try {
      const query = `sum(count_over_time({container="${containerName}"} |~ "${pattern}" [${timeRange}]))`;
      const data = await this.queryLogs(query, 1);

      return {
        success: true,
        container: containerName,
        pattern,
        timeRange,
        count: data.data.result
      };
    } catch (error) {
      return {
        success: false,
        container: containerName,
        pattern,
        error: error.message
      };
    }
  }
}

module.exports = new LokiService();
