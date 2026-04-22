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

  test('GET /health expose X-Request-Id et X-Correlation-Id (B6)', async () => {
    const response = await request(app).get('/health').expect(200);
    expect(response.headers['x-request-id']).toBeDefined();
    expect(response.headers['x-correlation-id']).toBeDefined();
    expect(String(response.headers['x-request-id']).length).toBeGreaterThanOrEqual(8);
    expect(response.headers['x-request-id']).toBe(response.headers['x-correlation-id']);
  });

  test('X-Request-Id client valide est conservé', async () => {
    const id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const response = await request(app)
      .get('/health')
      .set('X-Request-Id', id)
      .expect(200);
    expect(response.headers['x-request-id']).toBe(id);
  });
});
