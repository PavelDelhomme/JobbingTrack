const request = require('supertest');
const app = require('../../src/server');
const { exec } = require('child_process');
const util = require('util');

// Mock des utilitaires système
jest.mock('child_process');
jest.mock('../../src/utils/logger');

describe('Admin Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/admin/monitoring/performance', () => {
    test('devrait retourner les métriques de performance', async () => {
      const response = await request(app)
        .get('/api/v1/admin/monitoring/performance')
        .set('Authorization', 'Bearer mock-jwt-token-admin')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    test('devrait retourner 401 sans authentification', async () => {
      const response = await request(app)
        .get('/api/v1/admin/monitoring/performance')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/admin/monitoring/system', () => {
    test('devrait retourner les métriques système', async () => {
      const response = await request(app)
        .get('/api/v1/admin/monitoring/system')
        .set('Authorization', 'Bearer mock-jwt-token-admin')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('POST /api/v1/admin/playwright/run', () => {
    test('devrait exécuter les tests Playwright', async () => {
      const response = await request(app)
        .post('/api/v1/admin/playwright/run')
        .set('Authorization', 'Bearer mock-jwt-token-admin')
        .send({ testType: 'all' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('executionId');
    });
  });
});
