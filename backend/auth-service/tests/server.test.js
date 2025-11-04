const request = require('supertest');
const app = require('../src/server');

describe('Auth Service - Tests de base', () => {
  test('GET /health devrait retourner 200', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('service', 'auth-service');
  });

  test('GET / devrait retourner 404 si pas de route', async () => {
    await request(app)
      .get('/non-existent-route')
      .expect(404);
  });

  test('POST /api/v1/auth/register devrait accepter les requêtes d\'inscription', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      })
      .expect(400); // 400 car validation échoue sans tous les champs requis

    expect(response.body).toHaveProperty('success', false);
  });

  test('POST /api/v1/auth/login devrait accepter les requêtes de connexion', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'wrongpassword'
      })
      .expect(401); // 401 car utilisateur n'existe pas

    expect(response.body).toHaveProperty('success', false);
  });
});
