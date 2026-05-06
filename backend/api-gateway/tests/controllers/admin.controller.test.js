const request = require('supertest');
const app = require('../../src/server');
const os = require('os');
const fs = require('fs');
const path = require('path');

describe('Admin Controller - Tests avec données système réelles', () => {
  describe('GET /api/v1/auth/login', () => {
    test('devrait retourner une réponse de connexion', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('fallback', true);
    });
  });

  describe('GET /api/v1/auth/profile', () => {
    test('devrait retourner le profil utilisateur', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', 'admin@jobbingtrack.com');
      expect(response.body.user).toHaveProperty('role', 'SUPER_ADMIN');
      expect(response.body).toHaveProperty('fallback', true);
    });
  });

  describe('GET /api/v1/users/customization', () => {
    test('devrait retourner la personnalisation utilisateur', async () => {
      const response = await request(app)
        .get('/api/v1/users/customization')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('customization');
      expect(response.body.customization).toHaveProperty('theme', 'light');
      expect(response.body.customization).toHaveProperty('language', 'fr');
      expect(response.body).toHaveProperty('fallback', true);
    });
  });

  describe('PUT /api/v1/users/customization', () => {
    test('devrait sauvegarder la personnalisation utilisateur', async () => {
      const response = await request(app)
        .put('/api/v1/users/customization')
        .send({
          theme: 'dark',
          language: 'en',
          notifications: {
            email: false,
            push: true
          }
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('customization');
      expect(response.body.customization).toHaveProperty('theme', 'dark');
      expect(response.body.customization).toHaveProperty('language', 'en');
    });
  });

  describe('GET /api/v1/services/:serviceName/logs', () => {
    test('devrait retourner les logs service dans le mode fallback de test', async () => {
      const response = await request(app)
        .get('/api/v1/services/api-gateway/logs')
        .set('Authorization', 'Bearer mock-ci-token')
        .query({ lines: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('serviceName', 'api-gateway');
      expect(response.body).toHaveProperty('source', 'test-fixture');
      expect(response.body).toHaveProperty('lines');
      expect(Array.isArray(response.body.lines)).toBe(true);
    });
  });

  describe('POST /api/v1/services/:serviceName/restart', () => {
    test('devrait redémarrer un service', async () => {
      const response = await request(app)
        .post('/api/v1/services/api-gateway/restart')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('serviceName', 'api-gateway');
      expect(response.body).toHaveProperty('action', 'restart');
      expect(response.body).toHaveProperty('fallback', true);
    });
  });

  describe('POST /api/v1/services/:serviceName/start', () => {
    test('devrait démarrer un service', async () => {
      const response = await request(app)
        .post('/api/v1/services/api-gateway/start')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('serviceName', 'api-gateway');
      expect(response.body).toHaveProperty('action', 'start');
      expect(response.body).toHaveProperty('fallback', true);
    });
  });

  describe('POST /api/v1/services/:serviceName/stop', () => {
    test('devrait arrêter un service', async () => {
      const response = await request(app)
        .post('/api/v1/services/api-gateway/stop')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('serviceName', 'api-gateway');
      expect(response.body).toHaveProperty('action', 'stop');
      expect(response.body).toHaveProperty('fallback', true);
    });
  });
});
