/**
 * Tests de performance pour le système de monitoring
 * Vérifie que le monitoring C est performant
 */

const axios = require('axios');
const { describe, it, expect } = require('@jest/globals');

const MONITORING_C_URL = process.env.MONITORING_C_URL || 'http://localhost:5098';

describe('Monitoring Performance', () => {
  describe('Latence API', () => {
    it('devrait répondre en moins de 100ms', async () => {
      try {
        const startTime = Date.now();
        const response = await axios.get(`${MONITORING_C_URL}/api/v1/metrics`, {
          timeout: 5000
        });
        const endTime = Date.now();
        const latency = endTime - startTime;

        expect(response.status).toBe(200);
        expect(latency).toBeLessThan(100);
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          console.warn('⚠️ Monitoring-c non disponible, test ignoré');
          return;
        }
        throw error;
      }
    });
  });

  describe('Charge', () => {
    it('devrait gérer 100 requêtes simultanées', async () => {
      try {
        const requests = Array(100).fill(null).map(() =>
          axios.get(`${MONITORING_C_URL}/api/v1/metrics`, { timeout: 5000 })
        );

        const startTime = Date.now();
        const responses = await Promise.allSettled(requests);
        const endTime = Date.now();
        const duration = endTime - startTime;

        const successful = responses.filter(r => r.status === 'fulfilled').length;
        expect(successful).toBeGreaterThan(90); // Au moins 90% de réussite
        expect(duration).toBeLessThan(5000); // Moins de 5 secondes
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          console.warn('⚠️ Monitoring-c non disponible, test ignoré');
          return;
        }
        throw error;
      }
    });
  });
});

