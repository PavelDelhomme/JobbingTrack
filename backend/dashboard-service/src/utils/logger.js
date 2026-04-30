const winston = require('winston');
const { filterP2021Errors, filterP2021InPrintf } = require('./logger-filter');
const { getRequestContext } = require('./requestContext');
const centralLogger = require('./centralLogger');

class CentralLoggerTransport extends winston.Transport {
  log(info, callback) {
    setImmediate(() => this.emit('logged', info));
    if (['error', 'warn'].includes(info.level)) {
      const level = info.level.toUpperCase();
      centralLogger.addLog(level, info.message, {
        stackTrace: info.stack || (info.error && info.error.stack),
        requestId: info.requestId || null,
        correlationId: info.correlationId || null,
        endpoint: info.endpoint || null,
        method: info.method || null,
        protocol: info.protocol || null,
        port: info.port || null,
        clientIp: info.clientIp || null,
        ...info,
      });
    }
    callback();
  }
}

const attachRequestContextFormat = winston.format((info) => {
  const ctx = getRequestContext();
  if (!ctx) return info;
  info.requestId = info.requestId || ctx.requestId || null;
  info.correlationId = info.correlationId || ctx.correlationId || null;
  info.endpoint = info.endpoint || ctx.endpoint || null;
  info.method = info.method || ctx.method || null;
  info.protocol = info.protocol || ctx.protocol || null;
  info.port = info.port || ctx.port || null;
  info.clientIp = info.clientIp || ctx.clientIp || null;
  return info;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    filterP2021Errors(), // Filtrer les erreurs P2021
    attachRequestContextFormat(),
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        filterP2021Errors(), // Filtrer aussi dans la console
        winston.format.colorize(),
        winston.format.simple(),
        filterP2021InPrintf // Filtrer dans printf
      )
    }),
    new CentralLoggerTransport()
  ]
});

module.exports = logger;
