const jwt = require('jsonwebtoken');
const { authenticate } = require('../src/middlewares/auth.middleware');

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

function mockResponse() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('application-service auth middleware', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      JWT_SECRET: 'test-jwt-secret',
      DEV_AUTH_BYPASS_TOKEN: 'dev-env-bypass-token'
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('accepte uniquement le token bypass exact depuis DEV_AUTH_BYPASS_TOKEN', async () => {
    const req = { headers: { authorization: 'Bearer dev-env-bypass-token' } };
    const res = mockResponse();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual({
      id: 'dev_user_1',
      email: 'dev@jobbingtrack.com',
      role: 'USER'
    });
  });

  test('rejette un ancien token mock non déclaré dans l’environnement', async () => {
    const req = { headers: { authorization: 'Bearer mock-jwt-token-123' } };
    const res = mockResponse();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('accepte un JWT signé avec JWT_SECRET', async () => {
    const token = jwt.sign(
      { userId: 'user-1', email: 'user@jobbingtrack.test', role: 'USER' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockResponse();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual({
      id: 'user-1',
      email: 'user@jobbingtrack.test',
      role: 'USER'
    });
  });
});
