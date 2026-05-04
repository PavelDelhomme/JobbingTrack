const crypto = require('crypto');
const { AsyncLocalStorage } = require('async_hooks');

const store = new AsyncLocalStorage();
const SAFE_ID = /^[a-zA-Z0-9._-]{8,128}$/;

function normalizeIncomingId(value) {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s || s.length > 128) return null;
  return SAFE_ID.test(s) ? s : null;
}

function inferClientIp(req) {
  if (!req.get) return req.ip || req.socket?.remoteAddress || null;
  const xff = req.get('x-forwarded-for');
  if (xff) {
    const first = String(xff).split(',')[0].trim();
    if (first) return first;
  }
  return req.ip || req.socket?.remoteAddress || null;
}

function requestContextMiddleware(req, res, next) {
  const requestId = normalizeIncomingId(req.get('X-Request-Id') || req.get('x-request-id')) || crypto.randomUUID();
  const rawCorr = normalizeIncomingId(req.get('X-Correlation-Id') || req.get('x-correlation-id'));
  const correlationId = rawCorr && rawCorr !== requestId ? rawCorr : requestId;

  const context = {
    requestId,
    correlationId,
    method: req.method,
    endpoint: req.originalUrl || req.url,
    protocol: req.protocol || (req.secure ? 'https' : 'http'),
    port: req.socket?.localPort ?? null,
    clientIp: inferClientIp(req),
  };

  req.requestId = requestId;
  req.correlationId = correlationId;
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Correlation-Id', correlationId);

  store.run(context, next);
}

function getRequestContext() {
  return store.getStore() || null;
}

module.exports = {
  requestContextMiddleware,
  getRequestContext,
};
