const { wafCheck, isIpInCidr } = require('../src/middleware/waf');

function mockResponse() {
  const res = {};
  res.headers = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.set = jest.fn((headers) => {
    res.headers = { ...res.headers, ...headers };
    return res;
  });
  return res;
}

describe('WAF - trafic interne vs externe', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.WAF_INTERNAL_BYPASS_ENABLED = 'true';
    process.env.WAF_INTERNAL_BYPASS_CIDRS = '127.0.0.0/8,172.16.0.0/12,10.0.0.0/8';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('reconnaît les CIDR internes Docker/localhost', () => {
    expect(isIpInCidr('127.0.0.1', '127.0.0.0/8')).toBe(true);
    expect(isIpInCidr('172.20.0.12', '172.16.0.0/12')).toBe(true);
    expect(isIpInCidr('10.0.0.102', '10.0.0.0/8')).toBe(true);
    expect(isIpInCidr('8.8.8.8', '172.16.0.0/12')).toBe(false);
  });

  test('bypass le trafic interne même si le payload ressemble à une attaque', async () => {
    const req = {
      ip: '172.20.0.12',
      connection: {},
      socket: {},
      method: 'GET',
      url: '/api/v1/companies?search=union select * from users',
      headers: {},
      body: {},
      get: jest.fn((name) => (name === 'User-Agent' ? 'axios/1.6.0' : undefined))
    };
    const res = mockResponse();
    const next = jest.fn();

    await wafCheck(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.headers['X-WAF-Status']).toBe('BYPASSED_INTERNAL');
    expect(res.headers['X-OWASP-Protection']).toBe('BYPASSED_FOR_INTERNAL_TRAFFIC');
  });

  test('bloque le trafic externe malveillant', async () => {
    const req = {
      ip: '8.8.8.8',
      connection: {},
      socket: {},
      method: 'GET',
      url: '/api/v1/companies?search=union select * from users',
      headers: {},
      body: {},
      get: jest.fn((name) => (name === 'User-Agent' ? 'curl/8.0' : undefined))
    };
    const res = mockResponse();
    const next = jest.fn();

    await wafCheck(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: 'WAF_BLOCKED'
      })
    );
  });

  test('peut désactiver le bypass interne pour un test prod-like strict', async () => {
    process.env.WAF_INTERNAL_BYPASS_ENABLED = 'false';
    const req = {
      ip: '172.20.0.12',
      connection: {},
      socket: {},
      method: 'GET',
      url: '/api/v1/companies?search=union select * from users',
      headers: {},
      body: {},
      get: jest.fn((name) => (name === 'User-Agent' ? 'axios/1.6.0' : undefined))
    };
    const res = mockResponse();
    const next = jest.fn();

    await wafCheck(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
