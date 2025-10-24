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

  describe('POST /api/v1/admin/restart-service', () => {
    test('devrait redémarrer un service avec succès', async () => {
      // Mock de l'exécution réussie
      exec.mockImplementation((command, callback) => {
        callback(null, { stdout: 'Service restarted successfully', stderr: '' });
      });

      const response = await request(app)
        .post('/api/v1/admin/restart-service')
        .set('Authorization', 'Bearer mock-admin-token')
        .send({ serviceName: 'api-gateway' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(exec).toHaveBeenCalledWith(
        'docker restart jobbingtrack-api-gateway',
        expect.any(Function)
      );
    });

    test('devrait retourner 400 si serviceName manquant', async () => {
      const response = await request(app)
        .post('/api/v1/admin/restart-service')
        .set('Authorization', 'Bearer mock-admin-token')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    test('devrait retourner 403 si utilisateur non admin', async () => {
      const response = await request(app)
        .post('/api/v1/admin/restart-service')
        .set('Authorization', 'Bearer mock-user-token')
        .send({ serviceName: 'api-gateway' })
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    test('devrait gérer les erreurs Docker', async () => {
      // Mock de l'exécution en erreur
      exec.mockImplementation((command, callback) => {
        callback(new Error('Docker command failed'), null);
      });

      const response = await request(app)
        .post('/api/v1/admin/restart-service')
        .set('Authorization', 'Bearer mock-admin-token')
        .send({ serviceName: 'api-gateway' })
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/admin/system-status', () => {
    test('devrait retourner le statut système', async () => {
      // Mock des exécutions réussies
      exec.mockImplementation((command, callback) => {
        if (command.includes('docker ps')) {
          callback(null, { stdout: 'mock docker ps output', stderr: '' });
        } else if (command.includes('df -h')) {
          callback(null, { stdout: 'mock df output', stderr: '' });
        } else {
          callback(null, { stdout: 'mock uptime output', stderr: '' });
        }
      });

      const response = await request(app)
        .get('/api/v1/admin/system-status')
        .set('Authorization', 'Bearer mock-admin-token')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('docker');
      expect(response.body.data).toHaveProperty('disk');
      expect(response.body.data).toHaveProperty('uptime');
    });
  });

  describe('POST /api/v1/admin/cleanup', () => {
    test('devrait exécuter le nettoyage', async () => {
      exec.mockImplementation((command, callback) => {
        callback(null, { stdout: 'Cleanup completed', stderr: '' });
      });

      const response = await request(app)
        .post('/api/v1/admin/cleanup')
        .set('Authorization', 'Bearer mock-admin-token')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(exec).toHaveBeenCalledWith(
        'docker system prune -f',
        expect.any(Function)
      );
    });
  });
});
