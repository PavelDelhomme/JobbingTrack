const {
  requestCorrelationMiddleware,
  forwardCorrelationHeaders,
} = require('../src/middleware/requestCorrelation');

describe('requestCorrelation (B6)', () => {
  test('génère un UUID si aucun en-tête', (done) => {
    const req = { get: () => undefined };
    const res = { setHeader: jest.fn() };
    requestCorrelationMiddleware(req, res, () => {
      expect(req.requestId).toMatch(/^[0-9a-f-]{36}$/i);
      expect(req.correlationId).toBe(req.requestId);
      expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', req.requestId);
      expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-Id', req.correlationId);
      done();
    });
  });

  test('accepte un X-Request-Id client valide', (done) => {
    const id = 'client-req-id-001';
    const req = { get: (h) => (h === 'X-Request-Id' ? id : undefined) };
    const res = { setHeader: jest.fn() };
    requestCorrelationMiddleware(req, res, () => {
      expect(req.requestId).toBe(id);
      done();
    });
  });

  test('rejette un id trop long / invalide', (done) => {
    const bad = 'x'.repeat(200);
    const req = { get: (h) => (h === 'X-Request-Id' ? bad : undefined) };
    const res = { setHeader: jest.fn() };
    requestCorrelationMiddleware(req, res, () => {
      expect(req.requestId).not.toBe(bad);
      expect(req.requestId.length).toBeLessThanOrEqual(36);
      done();
    });
  });

  test('forwardCorrelationHeaders', () => {
    expect(forwardCorrelationHeaders({})).toEqual({});
    expect(forwardCorrelationHeaders({ requestId: 'r1', correlationId: 'c1' })).toEqual({
      'X-Request-Id': 'r1',
      'X-Correlation-Id': 'c1',
    });
  });
});
