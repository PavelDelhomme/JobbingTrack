const winston = require('winston');
const { getRequestContext } = require('./requestContext');

let centralLogger;
try {
  centralLogger = require('./centralLogger');
} catch (e) {
  centralLogger = null;
}

const filterP2021Warnings = winston.format((info) => {
  if (process.env.NODE_ENV === 'development' && info.level === 'warn') {
    if (info.message && typeof info.message === 'string') {
      const message = info.message.toLowerCase();
      if (message.includes('table deployment non trouvée') ||
          message.includes('table deployment non disponible') ||
          message.includes('p2021') ||
          message.includes('does not exist')) {
        return false;
      }
    }
  }
  return info;
});

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
          port: info.port || ctx.port || null,
          clientIp: info.clientIp || ctx.clientIp || null,
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
  info.port = info.port || ctx.port || null;
  info.clientIp = info.clientIp || ctx.clientIp || null;
  return info;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    filterP2021Warnings(),
    attachRequestContextFormat(),
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'deployment-service' },
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(
        filterP2021Warnings(),
        attachRequestContextFormat(),
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.combine(
        filterP2021Warnings(),
        attachRequestContextFormat(),
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      filterP2021Warnings(),
      attachRequestContextFormat(),
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
        if (level === 'warn' && message && typeof message === 'string') {
          const msg = message.toLowerCase();
          if (msg.includes('table deployment non trouvée') ||
              msg.includes('table deployment non disponible') ||
              msg.includes('p2021') ||
              msg.includes('does not exist')) {
            return '';
          }
        }
        let metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
      })
    )
  }));
}

if (centralLogger) {
  logger.add(new CentralLoggerTransport());
}

module.exports = { logger };
