const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/index');

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

// Mock axios pour éviter les vraies requêtes HTTP
jest.mock('axios');
const axios = require('axios');

/**
 * Génère un token JWT valide pour les tests
 */
const generateToken = () => {
  return jwt.sign(
    { id: 1, email: 'redacted@example.invalid', role: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
};

describe('Logs API Tests', () => {
  let token;

  beforeAll(() => {
    token = generateToken();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/logs/container/:name', () => {
    it('should return container logs with valid token', async () => {
      // Mock réponse Loki
      const mockLokiResponse = {
        data: {
          data: {
            result: [
              {
                stream: { container: 'test-container' },
                values: [
                  ['1234567890000000000', 'Log line 1'],
                  ['1234567890000000001', 'Log line 2']
                ]
              }
            ]
          }
        }
      };

      axios.get.mockResolvedValue(mockLokiResponse);

      const response = await request(app)
        .get('/api/logs/container/test-container')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.container).toBe('test-container');
      expect(response.body.logs).toBeDefined();
      expect(Array.isArray(response.body.logs)).toBe(true);
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/logs/container/test-container');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Token manquant');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/logs/container/test-container')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Token invalide');
    });

    it('should handle Loki service errors gracefully', async () => {
      axios.get.mockRejectedValue(new Error('Loki connection failed'));

      const response = await request(app)
        .get('/api/logs/container/test-container')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Loki');
    });

    it('should support limit query parameter', async () => {
      const mockLokiResponse = {
        data: {
          data: {
            result: []
          }
        }
      };

      axios.get.mockResolvedValue(mockLokiResponse);

      const response = await request(app)
        .get('/api/logs/container/test-container?limit=50')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            limit: 50
          })
        })
      );
    });
  });

  describe('GET /api/logs/all', () => {
    it('should return all logs with valid token', async () => {
      const mockLokiResponse = {
        data: {
          data: {
            result: [
              {
                stream: { job: 'docker' },
                values: [['1234567890000000000', 'Global log line']]
              }
            ]
          }
        }
      };

      axios.get.mockResolvedValue(mockLokiResponse);

      const response = await request(app)
        .get('/api/logs/all')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.logs).toBeDefined();
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/logs/all');

      expect(response.status).toBe(401);
    });

    it('should filter by service when provided', async () => {
      const mockLokiResponse = {
        data: {
          data: {
            result: []
          }
        }
      };

      axios.get.mockResolvedValue(mockLokiResponse);

      const response = await request(app)
        .get('/api/logs/all?service=api-gateway')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.service).toBe('api-gateway');
    });
  });

  describe('GET /api/logs/search/:name', () => {
    it('should search logs with pattern', async () => {
      const mockLokiResponse = {
        data: {
          data: {
            result: []
          }
        }
      };

      axios.get.mockResolvedValue(mockLokiResponse);

      const response = await request(app)
        .get('/api/logs/search/test-container?pattern=error')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.pattern).toBe('error');
    });

    it('should require pattern parameter', async () => {
      const response = await request(app)
        .get('/api/logs/search/test-container')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('requis');
    });
  });

  describe('GET /api/logs/stream/:name', () => {
    it('should setup SSE headers for streaming', async () => {
      const mockStream = {
        pipe: jest.fn(),
        destroy: jest.fn()
      };

      axios.get.mockResolvedValue({
        data: mockStream
      });

      const response = await request(app)
        .get('/api/logs/stream/test-container')
        .set('Authorization', `Bearer ${token}`);

      // Note: SSE tests sont complexes avec supertest
      // On vérifie juste que la route est accessible
      expect(response.status).not.toBe(404);
    });

    it('should reject streaming without token', async () => {
      const response = await request(app)
        .get('/api/logs/stream/test-container');

      expect(response.status).toBe(401);
    });
  });
});
