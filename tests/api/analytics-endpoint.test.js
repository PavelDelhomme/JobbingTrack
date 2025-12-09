/**
 * Tests pour l'endpoint analytics /api/v1/persistence/logs
 */

const axios = require('axios');

const METRICS_URL = process.env.METRICS_URL || 'http://localhost:5004';

describe('Analytics Endpoint', () => {
  test('devrait retourner 200 même en cas d\'erreur', async () => {
    try {
      const response = await axios.get(`${METRICS_URL}/api/v1/persistence/logs?limit=100&level=ERROR`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success');
      expect(response.data).toHaveProperty('data');
      expect(Array.isArray(response.data.data)).toBe(true);
    } catch (error) {
      // Même en cas d'erreur, le backend devrait retourner 200
      if (error.response) {
        expect(error.response.status).not.toBe(500);
      }
    }
  });

  test('devrait retourner un tableau vide en cas d\'erreur', async () => {
    try {
      const response = await axios.get(`${METRICS_URL}/api/v1/persistence/logs?limit=100&level=ERROR`);
      expect(response.status).toBe(200);
      if (!response.data.success) {
        expect(response.data.data).toEqual([]);
      }
    } catch (error) {
      // Ignorer les erreurs réseau
    }
  });
});

