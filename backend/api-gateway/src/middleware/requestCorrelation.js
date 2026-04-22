const crypto = require('crypto');

/** Identifiants acceptés depuis le client (évite en-têtes arbitraires / CRLF). */
const SAFE_CORRELATION_ID = /^[a-zA-Z0-9._-]{8,128}$/;

function normalizeIncomingId(value) {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s || s.length > 128) return null;
  return SAFE_CORRELATION_ID.test(s) ? s : null;
}

/**
 * Attache `req.requestId` et `req.correlationId`, renvoie les en-têtes au client,
 * et fournit des en-têtes à recoller sur les appels sortants (axios) vers les microservices.
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
  next();
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
};
