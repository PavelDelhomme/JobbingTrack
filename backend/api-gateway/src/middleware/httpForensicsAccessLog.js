const logger = require('../utils/logger');
const { buildHttpForensicsFromRequest } = require('../../../shared/utils/httpForensics');

const HEALTH_PATH_RE = /\/health(?:\?|$)/i;

function shouldSkipForensicsAccessLog(req, res) {
  if (res.locals?.skipHttpForensicsAccessLog) return true;
  const path = String(req.originalUrl || req.url || '');
  if (HEALTH_PATH_RE.test(path)) return true;
  return false;
}

/**
 * Journalise WARN avec contexte forensics complet pour les réponses HTTP >= minStatus.
 * Alimente aggregated_logs via central logger (corrélation fine).
 */
function httpForensicsAccessLogMiddleware(options = {}) {
  const minStatus = Number.isFinite(options.minStatus) ? options.minStatus : 400;

  return function httpForensicsAccessLog(req, res, next) {
    res.on('finish', () => {
      if (shouldSkipForensicsAccessLog(req, res)) return;
      const status = res.statusCode;
      if (!Number.isFinite(status) || status < minStatus) return;

      const upstreamService = res.locals?.upstreamServiceName || null;
      const upstreamStatus = res.locals?.upstreamHttpStatus ?? status;

      logger.warn(`Requête HTTP ${status}`, buildHttpForensicsFromRequest(req, {
        httpStatus: status,
        statusCode: status,
        upstreamHttpStatus: upstreamStatus,
        targetService: upstreamService,
        upstreamService,
        source: 'api-gateway-http-access',
      }));
    });
    next();
  };
}

module.exports = {
  httpForensicsAccessLogMiddleware,
  shouldSkipForensicsAccessLog,
};
