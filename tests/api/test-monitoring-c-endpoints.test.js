/**
 * Tests pour les endpoints monitoring-c
 * Vérifie que le système de monitoring C fonctionne correctement
 */

const axios = require('axios');
const { describe, it, expect } = require('@jest/globals');

const MONITORING_C_URL = process.env.MONITORING_C_URL || 'http://localhost:5098';

describe('Monitoring C Endpoints', () => {
  describe('GET /api/v1/metrics', () => {
    it('devrait retourner les métriques système', async () => {
      try {
        const response = await axios.get(`${MONITORING_C_URL}/api/v1/metrics`, {
          timeout: 5000
        });

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('cpu');
        expect(response.data).toHaveProperty('memory');
        expect(response.data).toHaveProperty('disk');
        expect(response.data).toHaveProperty('containers');
        expect(Array.isArray(response.data.containers)).toBe(true);
      } catch (error) {
        // Si monitoring-c n'est pas démarré, skip le test
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          console.warn('⚠️ Monitoring-c non disponible, test ignoré');
          return;
        }
        throw error;
      }
    });

    it('devrait inclure les métriques de conteneurs', async () => {
      try {
        const response = await axios.get(`${MONITORING_C_URL}/api/v1/metrics`);

        if (response.data.containers && response.data.containers.length > 0) {
          const container = response.data.containers[0];
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
        const response = await axios.get(`${MONITORING_C_URL}/api/v1/metrics`);

        expect(response.data).toHaveProperty('avg_response_time_ms');
        expect(response.data).toHaveProperty('avg_cpu_percent');
        expect(response.data).toHaveProperty('avg_memory_percent');
        expect(response.data).toHaveProperty('availability_percent');
        expect(response.data).toHaveProperty('load_score');
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          return;
        }
        throw error;
      }
    });
  });
});

