jest.mock('../src/services/securityScheduler', () => ({
  start: jest.fn(),
  stop: jest.fn(),
}));

jest.mock('../src/config/database', () => {
  const prisma = {
    $queryRaw: jest.fn().mockResolvedValue([{ exists: true }]),
    $connect: jest.fn().mockResolvedValue(),
    securityLog: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    networkThreat: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    auditLog: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
  };
  return {
    prisma,
    initializeDatabase: jest.fn().mockResolvedValue(),
    checkTableExists: jest.fn().mockResolvedValue(true),
    clearTableExistsCache: jest.fn(),
    isTableNotFoundError: jest.fn(() => false),
    handleTableNotFoundError: jest.fn(() => false),
  };
});

const request = require('supertest');
const app = require('../src/server');

describe('Security Service - Tests de base', () => {
  test('GET /health devrait retourner 200', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('service', 'security-service');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('version');
  });

  test('GET / devrait retourner 404 si pas de route', async () => {
    await request(app)
      .get('/non-existent-route')
      .expect(404);
  });

  test('GET /api/v1/security/logs devrait retourner des logs de sécurité', async () => {
    const response = await request(app)
      .get('/api/v1/security/logs')
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body).toHaveProperty('pagination');
  });

  test('OPTIONS /api/v1/security/logs devrait retourner 204 pour CORS', async () => {
    const response = await request(app)
      .options('/api/v1/security/logs')
      .expect(204);

    expect(response.status).toBe(204);
  });
});
