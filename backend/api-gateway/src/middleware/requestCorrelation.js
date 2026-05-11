const crypto = require('crypto');
const { AsyncLocalStorage } = require('async_hooks');

const store = new AsyncLocalStorage();

/** Identifiants acceptés depuis le client (évite en-têtes arbitraires / CRLF). */
const SAFE_CORRELATION_ID = /^[a-zA-Z0-9._-]{8,128}$/;

function normalizeIncomingId(value) {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s || s.length > 128) return null;
  return SAFE_CORRELATION_ID.test(s) ? s : null;
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

/**
 * Attache `req.requestId` et `req.correlationId`, renvoie les en-têtes au client,
 * expose le contexte forensics via AsyncLocalStorage pour Winston (aligné microservices B6).
 */
function requestCorrelationMiddleware(req, res, next) {
  const fromRequest = normalizeIncomingId(req.get('X-Request-Id') || req.get('x-request-id'));
  const requestId = fromRequest || crypto.randomUUID();

  const fromCorrelation = normalizeIncomingId(req.get('X-Correlation-Id') || req.get('x-correlation-id'));
  const correlationId = fromCorrelation && fromCorrelation !== requestId ? fromCorrelation : requestId;

  req.requestId = requestId;
  req.correlationId = correlationId;

  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Correlation-Id', correlationId);

  const context = {
    requestId,
    correlationId,
    method: req.method,
    endpoint: req.originalUrl || req.url,
    protocol: req.protocol || (req.secure ? 'https' : 'http'),
    port: req.socket?.localPort ?? null,
    clientIp: inferClientIp(req),
  };

  store.run(context, next);
}

function getRequestContext() {
  return store.getStore() || null;
}

function forwardCorrelationHeaders(req) {
  if (!req || !req.requestId) return {};
  return {
    'X-Request-Id': req.requestId,
    'X-Correlation-Id': req.correlationId || req.requestId,
  };
}

module.exports = {
  requestCorrelationMiddleware,
  forwardCorrelationHeaders,
  getRequestContext,
};
