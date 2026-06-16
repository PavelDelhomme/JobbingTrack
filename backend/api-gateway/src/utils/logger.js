const winston = require('winston');
const { getRequestContext } = require('../middleware/requestCorrelation');
const { pickCentralLogForensics } = require('../../../shared/utils/httpForensics');

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
        centralLogger.addLog(level, info.message, pickCentralLogForensics(info, ctx));
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
  if (info.httpStatus == null && info.upstreamHttpStatus != null) {
    info.httpStatus = info.upstreamHttpStatus;
  }
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
      )
    }),
    ...(centralLogger ? [new CentralLoggerTransport()] : [])
  ]
});

module.exports = logger;
