const request = require('supertest');
const app = require('../src/server');

describe('Profile Service - Tests de base', () => {
  test('GET /health devrait retourner 200', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('service', 'profile-service');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('version');
  });

  test('GET / devrait retourner 404 si pas de route', async () => {
    await request(app)
      .get('/non-existent-route')
      .expect(404);
  });

  test('GET /api/v1/profile-service devrait retourner des données mockées', async () => {
    const response = await request(app)
      .get('/api/v1/profile-service')
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('profile');
    expect(response.body.profile).toHaveProperty('profiles');
  });

  test('OPTIONS /api/v1/profile-service devrait retourner 204 pour CORS', async () => {
    const response = await request(app)
      .options('/api/v1/profile-service')
      .expect(204);

    expect(response.status).toBe(204);
  });
});
