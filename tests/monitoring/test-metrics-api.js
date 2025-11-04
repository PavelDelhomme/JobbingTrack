const axios = require('axios');
const jwt = require('jsonwebtoken');

const BASE_URL = process.env.METRICS_API_URL || 'http://localhost:3008';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Tests de l'API Metrics Aggregator
 * Teste les endpoints HTTP de l'API qui expose les métriques Prometheus et logs Loki
 */
describe('Metrics Aggregator API Tests', () => {
  let validToken;

  beforeAll(() => {
    // Générer un token JWT valide pour les tests
    validToken = jwt.sign(
      {
        id: 1,
        email: 'test@jobbingtrack.test',
        role: 'admin'
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log(`Testing API at: ${BASE_URL}`);
  });

  describe('Health Check', () => {
    it('should return 200 on /health without authentication', async () => {
      const response = await axios.get(`${BASE_URL}/health`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'ok');
      expect(response.data).toHaveProperty('timestamp');
      expect(response.data).toHaveProperty('prometheus');
      expect(response.data).toHaveProperty('loki');
    });

    it('should return API info on root endpoint', async () => {
      const response = await axios.get(`${BASE_URL}/`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('service');
      expect(response.data).toHaveProperty('version');
      expect(response.data).toHaveProperty('endpoints');
    });
  });

  describe('System Metrics', () => {
    it('should return 200 on /api/metrics/system with valid JWT', async () => {
      const response = await axios.get(`${BASE_URL}/api/metrics/system`, {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('data');
      expect(response.data.data).toHaveProperty('cpu_cores');
      expect(response.data.data).toHaveProperty('memory_total');
      expect(response.data.data).toHaveProperty('containers_running');
    });

    it('should return 401 on /api/metrics/system without JWT', async () => {
      try {
        await axios.get(`${BASE_URL}/api/metrics/system`);
        fail('Should have thrown 401 error');
      } catch (error) {
        expect(error.response.status).toBe(401);
        expect(error.response.data).toHaveProperty('success', false);
        expect(error.response.data).toHaveProperty('error');
      }
    });

    it('should return 403 on /api/metrics/system with invalid JWT', async () => {
      try {
        await axios.get(`${BASE_URL}/api/metrics/system`, {
          headers: {
            'Authorization': 'Bearer invalid-token-here'
          }
        });
        fail('Should have thrown 403 error');
      } catch (error) {
        expect(error.response.status).toBe(403);
        expect(error.response.data).toHaveProperty('success', false);
      }
    });
  });

  describe('Containers Metrics', () => {
    it('should return 200 on /api/metrics/containers with valid JWT', async () => {
      const response = await axios.get(`${BASE_URL}/api/metrics/containers`, {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('data');
      expect(response.data.data).toHaveProperty('cpu');
      expect(response.data.data).toHaveProperty('memory');
      expect(response.data.data).toHaveProperty('network_rx');
      expect(response.data.data).toHaveProperty('network_tx');
    });

    it('should return metrics arrays', async () => {
      const response = await axios.get(`${BASE_URL}/api/metrics/containers`, {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      });

      expect(Array.isArray(response.data.data.cpu)).toBe(true);
      expect(Array.isArray(response.data.data.memory)).toBe(true);
    });
  });

  describe('Container Specific Metrics', () => {
    it('should return 200 on /api/metrics/container/:name with valid JWT', async () => {
      const containerName = 'jobbingtrack-api-gateway';
      
      const response = await axios.get(
        `${BASE_URL}/api/metrics/container/${containerName}`,
        {
          headers: {
            'Authorization': `Bearer ${validToken}`
          }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('container', containerName);
      expect(response.data).toHaveProperty('data');
    });

    it('should include detailed metrics for container', async () => {
      const response = await axios.get(
        `${BASE_URL}/api/metrics/container/jobbingtrack-postgres`,
        {
          headers: {
            'Authorization': `Bearer ${validToken}`
          }
        }
      );

      expect(response.data.data).toHaveProperty('cpu');
      expect(response.data.data).toHaveProperty('memory_usage');
      expect(response.data.data).toHaveProperty('memory_limit');
      expect(response.data.data).toHaveProperty('network_rx');
      expect(response.data.data).toHaveProperty('network_tx');
      expect(response.data.data).toHaveProperty('fs_usage');
    });
  });

  describe('Metrics History', () => {
    it('should return 200 on /api/metrics/history with valid parameters', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneHourAgo = now - 3600;

      const response = await axios.get(`${BASE_URL}/api/metrics/history`, {
        headers: {
          'Authorization': `Bearer ${validToken}`
        },
        params: {
          query: 'up',
          start: oneHourAgo,
          end: now,
          step: '1m'
        }
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('query', 'up');
      expect(response.data).toHaveProperty('data');
    });

    it('should return 400 when missing required parameters', async () => {
      try {
        await axios.get(`${BASE_URL}/api/metrics/history`, {
          headers: {
            'Authorization': `Bearer ${validToken}`
          },
          params: {
            query: 'up'
            // Missing start and end
          }
        });
        fail('Should have thrown 400 error');
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toHaveProperty('success', false);
      }
    });
  });

  describe('Logs Endpoints', () => {
    it('should return 200 on /api/logs/container/:name with valid JWT', async () => {
      const response = await axios.get(
        `${BASE_URL}/api/logs/container/jobbingtrack-api-gateway`,
        {
          headers: {
            'Authorization': `Bearer ${validToken}`
          },
          params: {
            limit: 50
          }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('container');
      expect(response.data).toHaveProperty('logs');
    });

    it('should return 200 on /api/logs/all with valid JWT', async () => {
      const response = await axios.get(`${BASE_URL}/api/logs/all`, {
        headers: {
          'Authorization': `Bearer ${validToken}`
        },
        params: {
          limit: 100
        }
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('logs');
    });

    it('should return 401 on /api/logs without JWT', async () => {
      try {
        await axios.get(`${BASE_URL}/api/logs/all`);
        fail('Should have thrown 401 error');
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      try {
        await axios.get(`${BASE_URL}/api/non-existent-route`, {
          headers: {
            'Authorization': `Bearer ${validToken}`
          }
        });
        fail('Should have thrown 404 error');
      } catch (error) {
        expect(error.response.status).toBe(404);
        expect(error.response.data).toHaveProperty('success', false);
        expect(error.response.data).toHaveProperty('error');
      }
    });
  });
});
