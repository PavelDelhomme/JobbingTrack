const axios = require('axios');

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://prometheus:9090';

/**
 * Service pour interagir avec Prometheus
 */
class PrometheusService {
  /**
   * Effectue une requête instantanée (instant query)
   * @param {string} query - Requête PromQL
   * @returns {Promise<Object>} Résultat de la requête
   */
  async queryInstant(query) {
    try {
      const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
        params: { query },
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      console.error(`[Prometheus] Erreur query instant "${query}":`, error.message);
      throw new Error(`Prometheus query failed: ${error.message}`);
    }
  }

  /**
   * Effectue une requête sur une plage de temps (range query)
   * @param {string} query - Requête PromQL
   * @param {string} start - Timestamp de début (RFC3339 ou Unix)
   * @param {string} end - Timestamp de fin (RFC3339 ou Unix)
   * @param {string} step - Intervalle d'échantillonnage (ex: '1m', '15s')
   * @returns {Promise<Object>} Résultat de la requête
   */
  async queryRange(query, start, end, step = '15s') {
    try {
      const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query_range`, {
        params: { query, start, end, step },
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      console.error(`[Prometheus] Erreur query range "${query}":`, error.message);
      throw new Error(`Prometheus range query failed: ${error.message}`);
    }
  }

  /**
   * Récupère les métriques globales de la machine/système
   * @returns {Promise<Object>} Métriques système
   */
  async getSystemMetrics() {
    const queries = {
      cpu_cores: 'machine_cpu_cores',
      memory_total: 'machine_memory_bytes',
      containers_running: 'count(container_last_seen{name!=""})',
      cpu_usage_total: 'sum(rate(container_cpu_usage_seconds_total{name!=""}[5m])) * 100',
      memory_usage_total: 'sum(container_memory_usage_bytes{name!=""})'
    };

    const results = {};

    for (const [key, query] of Object.entries(queries)) {
      try {
        const data = await this.queryInstant(query);
        results[key] = data.data.result;
      } catch (error) {
        console.error(`[Prometheus] Erreur métrique système ${key}:`, error.message);
        results[key] = [];
      }
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      data: results
    };
  }

  /**
   * Récupère les métriques de tous les conteneurs
   * @returns {Promise<Object>} Métriques de tous les conteneurs
   */
  async getAllContainersMetrics() {
    const queries = {
      cpu: 'sum(rate(container_cpu_usage_seconds_total{name!=""}[5m])) by (name) * 100',
      memory: 'container_memory_usage_bytes{name!=""}',
      memory_limit: 'container_spec_memory_limit_bytes{name!=""}',
      network_rx: 'sum(rate(container_network_receive_bytes_total{name!=""}[5m])) by (name)',
      network_tx: 'sum(rate(container_network_transmit_bytes_total{name!=""}[5m])) by (name)',
      fs_usage: 'container_fs_usage_bytes{name!=""}'
    };

    const results = {};

    for (const [key, query] of Object.entries(queries)) {
      try {
        const data = await this.queryInstant(query);
        results[key] = data.data.result;
      } catch (error) {
        console.error(`[Prometheus] Erreur métrique conteneurs ${key}:`, error.message);
        results[key] = [];
      }
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      data: results
    };
  }

  /**
   * Récupère les métriques d'un conteneur spécifique
   * @param {string} containerName - Nom du conteneur
   * @returns {Promise<Object>} Métriques du conteneur
   */
  async getContainerMetrics(containerName) {
    const queries = {
      cpu: `rate(container_cpu_usage_seconds_total{name="${containerName}"}[5m]) * 100`,
      memory_usage: `container_memory_usage_bytes{name="${containerName}"}`,
      memory_limit: `container_spec_memory_limit_bytes{name="${containerName}"}`,
      memory_cache: `container_memory_cache{name="${containerName}"}`,
      network_rx: `rate(container_network_receive_bytes_total{name="${containerName}"}[5m])`,
      network_tx: `rate(container_network_transmit_bytes_total{name="${containerName}"}[5m])`,
      fs_usage: `container_fs_usage_bytes{name="${containerName}"}`,
      fs_limit: `container_fs_limit_bytes{name="${containerName}"}`,
      uptime: `time() - container_start_time_seconds{name="${containerName}"}`
    };

    const results = {};

    for (const [key, query] of Object.entries(queries)) {
      try {
        const data = await this.queryInstant(query);
        results[key] = data.data.result;
      } catch (error) {
        console.error(`[Prometheus] Erreur métrique ${key} pour ${containerName}:`, error.message);
        results[key] = [];
      }
    }

    return {
      success: true,
      container: containerName,
      timestamp: new Date().toISOString(),
      data: results
    };
  }

  /**
   * Récupère l'historique des métriques
   * @param {string} query - Requête PromQL
   * @param {string} start - Timestamp de début
   * @param {string} end - Timestamp de fin
   * @param {string} step - Intervalle d'échantillonnage
   * @returns {Promise<Object>} Historique des métriques
   */
  async getHistoryMetrics(query, start, end, step = '1m') {
    try {
      const data = await this.queryRange(query, start, end, step);
      return {
        success: true,
        timestamp: new Date().toISOString(),
        query,
        data: data.data.result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        query
      };
    }
  }
}

module.exports = new PrometheusService();
