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
  critical: 0 // critical est au même niveau que error (0 = plus important)
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'blue',
  silly: 'grey',
  critical: 'red'
};

winston.addColors(colors);

const logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'security-service' },
  transports: [
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
  ],
});

// Si nous ne sommes pas en production, ajouter également la sortie console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
        let metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
      })
    )
  }));
}

// Fonction pour logger les événements de sécurité
function logSecurityEvent(level, category, eventType, message, metadata = {}) {
  const logEntry = {
    timestamp: new Date(),
    level,
    category,
    eventType,
    message,
    ...metadata
  };

  logger.log(level, message, {
    category,
    eventType,
    ...metadata
  });

  return logEntry;
}

module.exports = {
  logger,
  logSecurityEvent
};
