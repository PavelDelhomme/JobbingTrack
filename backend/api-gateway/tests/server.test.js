const request = require('supertest');
const app = require('../src/server');

describe('API Gateway - Tests de base', () => {
  test('GET /health devrait retourner 200', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'OK');
  });

  test('GET / devrait retourner 404 si pas de route', async () => {
    await request(app)
      .get('/non-existent-route')
      .expect(404);
  });

  test('CORS headers devraient être présents', async () => {
    const response = await request(app)
      .options('/api/v1/auth/login')
      .expect(200);

    // Vérifier que la requête OPTIONS fonctionne
    expect(response.status).toBe(200);
    expect(response.headers).toHaveProperty('access-control-allow-origin');
    expect(response.headers).toHaveProperty('access-control-allow-methods');
  });
});
