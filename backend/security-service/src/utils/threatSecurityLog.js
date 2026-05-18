const crypto = require('crypto');

/**
 * Champs HTTP / corrélation pour les logs `network_threat_detected`.
 */
function buildThreatSecurityLogContext(req, overrides = {}) {
  const requestId =
    overrides.requestId ||
    req?.requestId ||
    req?.headers?.['x-request-id'] ||
    (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : null);

  return {
    endpoint:
      overrides.endpoint ??
      req?.originalUrl ??
      req?.url ??
      '/internal/network-threat',
    method: overrides.method ?? req?.method ?? 'DETECT',
    requestId: requestId || null,
    userAgent: overrides.userAgent ?? req?.get?.('User-Agent') ?? null,
    userId: overrides.userId ?? req?.user?.id ?? null,
    statusCode: overrides.statusCode ?? null,
  };
}

module.exports = { buildThreatSecurityLogContext };
