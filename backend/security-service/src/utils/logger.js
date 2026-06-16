const winston = require('winston');
const path = require('path');

// Définir les niveaux de log personnalisés incluant "critical"
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
  critical: 0, // même priorité que error
  // Niveaux métier (évite « Unknown logger level: high » si une meta fuit vers Winston)
  high: 1,
  medium: 2,
  low: 3
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'blue',
  silly: 'grey',
  critical: 'red',
  high: 'yellow',
  medium: 'green',
  low: 'grey'
};

winston.addColors(colors);

// Importer le filtre partagé
const { filterP2021Errors, filterP2021InPrintf } = require('./logger-filter');
const { getRequestContext } = require('./requestContext');

let centralLogger;
try {
  centralLogger = require('./centralLogger');
} catch (e) {
  centralLogger = null;
}

function metadataHasMinimalHttpForensics(payload = {}) {
  return Boolean(
    payload.requestId &&
    (payload.method || payload.httpMethod) &&
    (payload.endpoint || payload.originalUrl) &&
    (payload.clientIp || payload.sourceIP || payload.ip) &&
    (payload.httpStatus != null || payload.statusCode != null) &&
    payload.protocol &&
    payload.port != null
  );
}

class CentralLoggerTransport extends winston.Transport {
  log(info, callback) {
    setImmediate(() => this.emit('logged', info));
    if (centralLogger && ['error', 'warn'].includes(info.level)) {
      const level = info.level.toUpperCase();
      if (level === 'ERROR' || level === 'WARN' || level === 'FATAL') {
        const ctx = getRequestContext() || {};
        const eventType = String(info.eventType || '').toLowerCase();
        const category = String(info.category || '').toLowerCase();
        const source = String(info.source || '').toLowerCase();
        const isAnalyzerAggregate =
          eventType === 'security_alert_created' &&
          (category === 'threat_analysis' || source === 'security-analyzer');
        const forensicsPayload = { ...ctx, ...info };
        if (isAnalyzerAggregate && !metadataHasMinimalHttpForensics(forensicsPayload)) {
          callback();
          return;
        }
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

const transports = [
  // Logs de sécurité séparés
  new winston.transports.File({
      filename: path.join(__dirname, '../../logs/security.log'),
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    // Erreurs de sécurité uniquement
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/security-errors.log'),
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
  // Logs généraux
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/combined.log'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
];
if (centralLogger) {
  transports.push(new CentralLoggerTransport());
}

const logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    filterP2021Errors(),
    attachRequestContextFormat(),
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'security-service' },
  transports,
});

// Si nous ne sommes pas en production, ajouter également la sortie console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      filterP2021Errors(), // Filtrer aussi dans la console
      winston.format.colorize(),
      winston.format.simple(),
      filterP2021InPrintf, // Filtrer dans printf
      winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
        // Filtrer les erreurs P2021 dans le printf aussi
        if (process.env.NODE_ENV === 'development') {
          const msg = (message || '').toLowerCase();
          if (msg.includes('p2021') || 
              msg.includes('does not exist') || 
              msg.includes('security_metrics') ||
              msg.includes('table') && msg.includes('not exist') ||
              msg.includes('invalid') && msg.includes('invocation')) {
            return ''; // Ne pas afficher
          }
          
          // Vérifier dans meta
          const metaStr = JSON.stringify(meta).toLowerCase();
          if (metaStr.includes('p2021') || 
              metaStr.includes('does not exist') ||
              metaStr.includes('security_metrics') ||
              metaStr.includes('prismaclientknownrequesterror')) {
            return ''; // Ne pas afficher
          }
          
          if (meta && (meta.code === 'P2021' || (meta.error && meta.error.code === 'P2021'))) {
            return ''; // Ne pas afficher
          }
        }
        let metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
      })
    )
  }));
}

/**
 * Winston ne connaît pas les niveaux métier (high, medium, low) — normaliser vers les niveaux déclarés.
 */
function toWinstonLevel(level) {
  if (!level || typeof level !== 'string') return 'info';
  const map = {
    critical: 'error',
    high: 'warn',
    medium: 'info',
    low: 'info',
    error: 'error',
    warning: 'warn',
    warn: 'warn',
    info: 'info',
    http: 'http',
    verbose: 'verbose',
    debug: 'debug',
    silly: 'silly'
  };
  const normalized = map[level.toLowerCase()] || level;
  return logger.levels && logger.levels[normalized] !== undefined ? normalized : 'info';
}

// Fonction pour logger les événements de sécurité
function logSecurityEvent(level, category, eventType, message, metadata = {}) {
  const ctx = getRequestContext() || {};
  const logEntry = {
    timestamp: new Date(),
    level,
    category,
    eventType,
    message,
    requestId: metadata.requestId || ctx.requestId || null,
    correlationId: metadata.correlationId || ctx.correlationId || null,
    endpoint: metadata.endpoint || ctx.endpoint || null,
    method: metadata.method || ctx.method || null,
    protocol: metadata.protocol || ctx.protocol || null,
    port: metadata.port || ctx.port || null,
    clientIp: metadata.clientIp || ctx.clientIp || null,
    ...metadata
  };

  const winstonLevel = toWinstonLevel(level);
  // Winston utilise la clé réservée "level" dans les métadonnées → "Unknown logger level: high"
  const safeMeta = { ...(metadata || {}) };
  if ('level' in safeMeta) {
    safeMeta.eventLevel = safeMeta.level;
    delete safeMeta.level;
  }
  logger.log(winstonLevel, message, {
    category,
    eventType,
    requestId: logEntry.requestId,
    correlationId: logEntry.correlationId,
    endpoint: logEntry.endpoint,
    method: logEntry.method,
    protocol: logEntry.protocol,
    port: logEntry.port,
    clientIp: logEntry.clientIp,
    httpStatus: safeMeta.httpStatus ?? safeMeta.statusCode ?? null,
    statusCode: safeMeta.statusCode ?? safeMeta.httpStatus ?? null,
    ...safeMeta,
  });

  return logEntry;
}

module.exports = {
  logger,
  logSecurityEvent
};
