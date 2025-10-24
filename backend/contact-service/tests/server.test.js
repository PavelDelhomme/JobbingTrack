const request = require('supertest');
const app = require('../src/server');

describe('Contact Service - Tests de base', () => {
  test('GET /health devrait retourner 200', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('service', 'contact-service');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('version');
  });

  test('GET / devrait retourner 404 si pas de route', async () => {
    await request(app)
      .get('/non-existent-route')
      .expect(404);
  });

  test('GET /api/v1/contacts devrait retourner des données mockées', async () => {
    const response = await request(app)
      .get('/api/v1/contacts')
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('contacts');
    expect(response.body).toHaveProperty('total');
  });

  test('OPTIONS /api/v1/contacts devrait retourner 204 pour CORS', async () => {
    const response = await request(app)
      .options('/api/v1/contacts')
      .expect(204); // Le serveur retourne 204 pour OPTIONS

    // Vérifier seulement que la requête OPTIONS fonctionne
    expect(response.status).toBe(204);
  });
});
