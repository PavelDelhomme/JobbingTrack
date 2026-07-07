const request = require('supertest');
const jwt = require('jsonwebtoken');
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
      .set('Origin', 'http://localhost:8080')
      .set('Access-Control-Request-Method', 'POST')
      .expect(200);

    // Vérifier que la requête OPTIONS fonctionne
    expect(response.status).toBe(200);
    expect(response.headers).toHaveProperty('access-control-allow-methods');
    // Selon l'origine et l'environnement, le serveur peut répondre soit avec ACAO explicite,
    // soit uniquement avec Vary: Origin.
    const hasExplicitOrigin = typeof response.headers['access-control-allow-origin'] === 'string';
    const varyHeader = String(response.headers.vary || '');
    expect(hasExplicitOrigin || varyHeader.includes('Origin')).toBe(true);
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

  test('GET /api/v1/public/release-info expose semver public', async () => {
    const response = await request(app)
      .get('/api/v1/public/release-info')
      .expect(200);

    expect(response.body).toHaveProperty('platformRelease');
    expect(response.body.api).toHaveProperty('version');
    expect(response.body.mobile).toHaveProperty('android');
    expect(response.body.mobile.android).toHaveProperty('minVersion');
  });

  test('POST /api/v1/auth/login en test retourne un JWT signé avec JWT_SECRET', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@jobbingtrack.test' })
      .expect(200);

    expect(response.body.token).toBeDefined();
    expect(response.body.token).not.toContain('mock-jwt-token');
    const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
    expect(decoded.email).toBe('admin@jobbingtrack.test');
    expect(decoded.role).toBe('SUPER_ADMIN');
  });
});
