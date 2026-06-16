/**
 * Champs forensics HTTP standardisés pour central logging / corrélation fine.
 */

function inferClientIpFromRequest(req) {
  if (!req) return null;
  if (typeof req.get === 'function') {
    const xff = req.get('x-forwarded-for');
    if (xff) {
      const first = String(xff).split(',')[0].trim();
      if (first) return first;
    }
  }
  return req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || null;
}

function buildHttpForensicsFromRequest(req, extra = {}) {
  if (!req) return { ...extra };
  const protocol = req.protocol || (req.secure ? 'https' : 'http');
  const endpoint = req.originalUrl || req.url || null;
  const status =
    extra.httpStatus ??
    extra.statusCode ??
    extra.upstreamHttpStatus ??
    null;

  return {
    requestId: req.requestId || extra.requestId || null,
    correlationId: req.correlationId || extra.correlationId || null,
    method: req.method || extra.method || null,
    endpoint,
    originalUrl: endpoint,
    protocol: extra.protocol || protocol,
    port: extra.port ?? req.socket?.localPort ?? req.connection?.localPort ?? null,
    clientIp: extra.clientIp || inferClientIpFromRequest(req),
    httpStatus: status,
    statusCode: status,
    ...extra,
  };
}

function pickCentralLogForensics(info = {}, ctx = {}) {
  const httpStatus =
    info.httpStatus ??
    info.statusCode ??
    info.upstreamHttpStatus ??
    ctx.httpStatus ??
    null;

  return {
    requestId: info.requestId || ctx.requestId || null,
    correlationId: info.correlationId || ctx.correlationId || null,
    endpoint: info.endpoint || info.originalUrl || ctx.endpoint || null,
    originalUrl: info.originalUrl || info.endpoint || ctx.endpoint || null,
    method: info.method || info.httpMethod || ctx.method || null,
    protocol: info.protocol || ctx.protocol || null,
    port: info.port ?? ctx.port ?? null,
    clientIp: info.clientIp || info.ip || ctx.clientIp || null,
    httpStatus,
    statusCode: httpStatus,
    upstreamHttpStatus: info.upstreamHttpStatus ?? httpStatus,
    targetService: info.targetService || info.upstreamService || info.serviceName || null,
    stackTrace: info.stack || (info.error && info.error.stack) || null,
  };
}

module.exports = {
  inferClientIpFromRequest,
  buildHttpForensicsFromRequest,
  pickCentralLogForensics,
};
