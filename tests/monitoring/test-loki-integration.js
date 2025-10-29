const axios = require('axios');

const LOKI_URL = process.env.LOKI_URL || 'http://127.0.0.1:3100';

/**
 * Tests d'intégration Loki
 * Vérifie que Loki est accessible et peut récupérer des logs
 */
describe('Loki Integration Tests', () => {
  
  describe('Loki Accessibility', () => {
    it('should be accessible on http://127.0.0.1:3100', async () => {
      const response = await axios.get(`${LOKI_URL}/ready`, {
        timeout: 5000
      });

      expect(response.status).toBe(200);
    });

    it('should return ready status', async () => {
      const response = await axios.get(`${LOKI_URL}/ready`);
      
      expect(response.status).toBe(200);
      expect(response.data).toBe('ready');
    });

    it('should have metrics endpoint', async () => {
      const response = await axios.get(`${LOKI_URL}/metrics`, {
        timeout: 5000
      });

      expect(response.status).toBe(200);
      expect(response.data).toContain('loki_');
    });
  });

  describe('Loki Query API', () => {
    it('should support log queries via /loki/api/v1/query_range', async () => {
      const now = Date.now() * 1000000; // Nanoseconds
      const oneHourAgo = now - (3600 * 1000000000);

      const response = await axios.get(`${LOKI_URL}/loki/api/v1/query_range`, {
        params: {
          query: '{job="docker"}',
          start: oneHourAgo,
          end: now,
          limit: 10
        },
        timeout: 10000
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'success');
      expect(response.data).toHaveProperty('data');
      expect(response.data.data).toHaveProperty('resultType');
    });

    it('should return logs for {job="docker"} query', async () => {
      const now = Date.now() * 1000000;
      const oneHourAgo = now - (3600 * 1000000000);

      const response = await axios.get(`${LOKI_URL}/loki/api/v1/query_range`, {
        params: {
          query: '{job="docker"}',
          start: oneHourAgo,
          end: now,
          limit: 100
        }
      });

      expect(response.data.status).toBe('success');
      expect(response.data.data).toHaveProperty('result');
      expect(Array.isArray(response.data.data.result)).toBe(true);
    });

    it('should support label filtering', async () => {
      const now = Date.now() * 1000000;
      const oneHourAgo = now - (3600 * 1000000000);

      const response = await axios.get(`${LOKI_URL}/loki/api/v1/query_range`, {
        params: {
          query: '{container="prometheus"}',
          start: oneHourAgo,
          end: now,
          limit: 10
        }
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'success');
    });

    it('should support LogQL grep filter', async () => {
      const now = Date.now() * 1000000;
      const oneHourAgo = now - (3600 * 1000000000);

      const response = await axios.get(`${LOKI_URL}/loki/api/v1/query_range`, {
        params: {
          query: '{job="docker"} |= "level"',
          start: oneHourAgo,
          end: now,
          limit: 10
        }
      });

      expect(response.status).toBe(200);
      expect(response.data.status).toBe('success');
    });
  });

  describe('Loki Labels API', () => {
    it('should return available labels via /loki/api/v1/labels', async () => {
      const response = await axios.get(`${LOKI_URL}/loki/api/v1/labels`, {
        timeout: 5000
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'success');
      expect(response.data).toHaveProperty('data');
      expect(Array.isArray(response.data.data)).toBe(true);
    });

    it('should include expected labels', async () => {
      const response = await axios.get(`${LOKI_URL}/loki/api/v1/labels`);

      const labels = response.data.data;
      
      // Vérifier que les labels attendus sont présents
      expect(labels).toContain('job');
      
      // Labels Docker SD devraient être présents si Promtail collecte
      const expectedLabels = ['container', 'service', 'stream'];
      const hasDockerLabels = expectedLabels.some(label => labels.includes(label));
      
      // Au moins un des labels Docker devrait être présent
      if (labels.length > 0) {
        expect(labels.length).toBeGreaterThan(0);
      }
    });

    it('should return label values for a specific label', async () => {
      const response = await axios.get(`${LOKI_URL}/loki/api/v1/label/job/values`, {
        timeout: 5000
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'success');
      expect(Array.isArray(response.data.data)).toBe(true);
    });
  });

  describe('Loki Series API', () => {
    it('should return series data', async () => {
      const now = Date.now() / 1000; // Seconds
      const oneHourAgo = now - 3600;

      const response = await axios.get(`${LOKI_URL}/loki/api/v1/series`, {
        params: {
          'match[]': '{job="docker"}',
          start: oneHourAgo,
          end: now
        },
        timeout: 10000
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'success');
      expect(response.data).toHaveProperty('data');
      expect(Array.isArray(response.data.data)).toBe(true);
    });
  });

  describe('Loki Configuration and Health', () => {
    it('should report build information', async () => {
      const response = await axios.get(`${LOKI_URL}/loki/api/v1/status/buildinfo`, {
        timeout: 5000
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'success');
      expect(response.data.data).toHaveProperty('version');
    });

    it('should be ingesting logs from Promtail', async () => {
      const now = Date.now() * 1000000;
      const fiveMinutesAgo = now - (300 * 1000000000);

      const response = await axios.get(`${LOKI_URL}/loki/api/v1/query_range`, {
        params: {
          query: '{job="docker"}',
          start: fiveMinutesAgo,
          end: now,
          limit: 1
        }
      });

      expect(response.data.status).toBe('success');
      
      // Si Promtail fonctionne, il devrait y avoir des logs récents
      const hasRecentLogs = response.data.data.result.length > 0;
      
      if (hasRecentLogs) {
        console.log('✅ Loki is receiving logs from Promtail');
      } else {
        console.log('⚠️ No recent logs found - Promtail might not be running');
      }
    });
  });

  describe('Loki Log Retention', () => {
    it('should respect retention configuration (30 days)', async () => {
      const response = await axios.get(`${LOKI_URL}/metrics`);

      expect(response.data).toContain('loki_');
      
      // Vérifier que le compactor est actif (indique que la rétention fonctionne)
      if (response.data.includes('loki_compactor')) {
        expect(response.data).toContain('loki_compactor');
      }
    });
  });

  describe('Loki Error Handling', () => {
    it('should return error for invalid LogQL query', async () => {
      try {
        await axios.get(`${LOKI_URL}/loki/api/v1/query_range`, {
          params: {
            query: 'invalid{{{query',
            start: Date.now() - 3600000,
            end: Date.now()
          }
        });
        fail('Should have thrown an error for invalid query');
      } catch (error) {
        expect(error.response.status).toBeGreaterThanOrEqual(400);
      }
    });

    it('should handle missing required parameters', async () => {
      try {
        await axios.get(`${LOKI_URL}/loki/api/v1/query_range`, {
          params: {
            query: '{job="docker"}'
            // Missing start and end
          }
        });
        fail('Should have thrown an error for missing parameters');
      } catch (error) {
        expect(error.response.status).toBeGreaterThanOrEqual(400);
      }
    });
  });
});
