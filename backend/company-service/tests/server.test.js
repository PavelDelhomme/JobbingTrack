const request = require('supertest');
const app = require('../src/server');

describe('Company Service - Tests de base', () => {
  test('GET /health devrait retourner 200', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('service', 'company-service');
  });

  test('GET / devrait retourner 404 si pas de route', async () => {
    await request(app)
      .get('/non-existent-route')
      .expect(404);
  });

  test('POST /api/v1/companies devrait accepter les requêtes', async () => {
    const companyData = {
      name: 'Test Company',
      industry: 'Technology',
      size: 'STARTUP'
    };

    const response = await request(app)
      .post('/api/v1/companies')
      .send(companyData)
      .expect(401); // 401 car authentification requise

    expect(response.body).toHaveProperty('error');
  });

  test('GET /api/v1/companies/health devrait fonctionner sans auth', async () => {
    const response = await request(app)
      .get('/api/v1/companies/health')
      .expect(200);

    expect(response.body).toBeDefined();
  });
});
