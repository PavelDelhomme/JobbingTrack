const request = require('supertest');
const app = require('../src/server');

describe('Notification Service - Tests de base', () => {
  test('GET /health devrait retourner 200', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('service', 'notification-service');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('version');
    expect(response.body).toHaveProperty('environment');
  });

  test('GET / devrait retourner 404 si pas de route', async () => {
    await request(app)
      .get('/non-existent-route')
      .expect(404);
  });

  test('GET /api/v1/notifications devrait retourner des données mockées', async () => {
    const response = await request(app)
      .get('/api/v1/notifications')
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('notifications');
    expect(response.body).toHaveProperty('total');
  });

  test('OPTIONS /api/v1/notifications devrait retourner 204 pour CORS', async () => {
    const response = await request(app)
      .options('/api/v1/notifications')
      .expect(204);

    expect(response.status).toBe(204);
  });
});
