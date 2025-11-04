const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/index');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Génère un token JWT valide pour les tests
const generateToken = () => {
  return jwt.sign({ id: 1, email: 'redacted@example.invalid' }, JWT_SECRET, { expiresIn: '1h' });
};

describe('Metrics Aggregator API Tests', () => {
  let token;

  beforeAll(() => {
    token = generateToken();
  });

  describe('Health Check', () => {
    it('should return health status without auth', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('System Metrics', () => {
    it('should return system metrics with valid token', async () => {
      const response = await request(app)
        .get('/api/metrics/system')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('cpu_cores');
      expect(response.body.data).toHaveProperty('memory_total');
    });

    it('should reject without token', async () => {
      const response = await request(app).get('/api/metrics/system');
      
      expect(response.status).toBe(401);
    });
  });

  describe('Container Metrics', () => {
    it('should return all containers metrics', async () => {
      const response = await request(app)
        .get('/api/metrics/containers')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('cpu');
      expect(response.body.data).toHaveProperty('memory');
    });

    it('should return specific container metrics', async () => {
      const response = await request(app)
        .get('/api/metrics/container/backend-api')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.container).toBe('backend-api');
    });
  });

  describe('Logs', () => {
    it('should return container logs', async () => {
      const response = await request(app)
        .get('/api/logs/container/backend-api')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('logs');
    });
  });
});
