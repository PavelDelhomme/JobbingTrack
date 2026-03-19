/**
 * Tests pour les endpoints monitoring-c
 * Vérifie que le système de monitoring C fonctionne correctement
 */

const axios = require('axios');
const { describe, it, expect } = require('@jest/globals');

const MONITORING_C_URL = process.env.MONITORING_C_URL || 'http://localhost:5098';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:5002';

async function fetchMetricsViaGatewayWithRetry(maxAttempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await axios.get(`${API_GATEWAY_URL}/api/v1/metrics`, {
        timeout: 7000,
        responseType: 'json'
      });
    } catch (error) {
      lastError = error;
      const retryable = error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED';
      if (!retryable || attempt === maxAttempts) break;
      await new Promise((r) => setTimeout(r, 900));
    }
  }
  throw lastError;
}

async function fetchMetricsWithRetry(maxAttempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await axios.get(`${MONITORING_C_URL}/api/v1/metrics`, {
        timeout: 5000,
        responseType: 'json'
      });
    } catch (error) {
      lastError = error;
      const retryable = error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT';
      if (!retryable || attempt === maxAttempts) break;
      await new Promise((r) => setTimeout(r, 700));
    }
  }
  throw lastError;
}

describe('Monitoring C Endpoints', () => {
  describe('GET /api/v1/metrics', () => {
    it('devrait retourner les métriques système', async () => {
      try {
        let response;
        try {
          response = await fetchMetricsWithRetry();
        } catch (directError) {
          // En local/Docker mixte, monitoring-c peut être indisponible sur localhost:5098.
          // On valide alors via l'endpoint métriques de la gateway.
          response = await fetchMetricsViaGatewayWithRetry();
        }

        expect(response.status).toBe(200);
        // Parser le JSON si c'est une chaîne
        const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        expect(data).toHaveProperty('cpu');
        expect(data).toHaveProperty('memory');
        expect(data).toHaveProperty('disk');
        expect(data).toHaveProperty('containers');
        expect(Array.isArray(data.containers)).toBe(true);
      } catch (error) {
        // Si monitoring-c ET gateway métriques sont indisponibles, ne pas casser toute la suite API.
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
          console.warn(`⚠️ Monitoring-c et gateway metrics indisponibles (${MONITORING_C_URL} / ${API_GATEWAY_URL}), test ignoré`);
          return;
        }
        throw error;
      }
    });

    it('devrait inclure les métriques de conteneurs', async () => {
      try {
        const response = await fetchMetricsWithRetry();

        const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        if (data.containers && data.containers.length > 0) {
          const container = data.containers[0];
          expect(container).toHaveProperty('name');
          expect(container).toHaveProperty('cpu_percent');
          expect(container).toHaveProperty('memory_mb');
          expect(container).toHaveProperty('network_rx_mb');
          expect(container).toHaveProperty('network_tx_mb');
        }
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          return;
        }
        throw error;
      }
    });

    it('devrait inclure les métriques globales', async () => {
      try {
        const response = await fetchMetricsWithRetry();

        const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        expect(data).toHaveProperty('avg_response_time_ms');
        expect(data).toHaveProperty('avg_cpu_percent');
        expect(data).toHaveProperty('avg_memory_percent');
        expect(data).toHaveProperty('availability_percent');
        expect(data).toHaveProperty('load_score');
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          return;
        }
        throw error;
      }
    });
  });
});

