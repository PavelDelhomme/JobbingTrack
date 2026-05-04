const winston = require('winston');
const { getRequestContext } = require('./requestContext');

let centralLogger;
try {
  centralLogger = require('./centralLogger');
} catch (e) {
  centralLogger = null;
}

class CentralLoggerTransport extends winston.Transport {
  log(info, callback) {
    setImmediate(() => this.emit('logged', info));
    if (centralLogger && ['error', 'warn'].includes(info.level)) {
      const level = info.level.toUpperCase();
      if (level === 'ERROR' || level === 'WARN' || level === 'FATAL') {
        const ctx = getRequestContext() || {};
        centralLogger.addLog(level, info.message, {
          stackTrace: info.stack || (info.error && info.error.stack),
          requestId: info.requestId || ctx.requestId || null,
          correlationId: info.correlationId || ctx.correlationId || null,
          endpoint: info.endpoint || ctx.endpoint || null,
          method: info.method || ctx.method || null,
          protocol: info.protocol || ctx.protocol || null,
          port: info.port ?? ctx.port ?? null,
          clientIp: info.clientIp || ctx.clientIp || null,
          httpStatus: info.httpStatus ?? info.statusCode ?? null,
          ...info,
        });
      }
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
  if (info.port == null && ctx.port != null) info.port = ctx.port;
  info.clientIp = info.clientIp || ctx.clientIp || null;
  return info;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    attachRequestContextFormat(),
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        attachRequestContextFormat(),
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    ...(centralLogger ? [new CentralLoggerTransport()] : []),
  ],
});

module.exports = logger;
