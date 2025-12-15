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

// Importer le filtre partagé
let filterP2021Errors, filterP2021InPrintf;
try {
  const sharedFilter = require('../../../shared/logger-filter');
  filterP2021Errors = sharedFilter.filterP2021Errors;
  filterP2021InPrintf = sharedFilter.filterP2021InPrintf;
} catch (e) {
  // Fallback si le filtre partagé n'est pas disponible
  filterP2021Errors = winston.format((info) => {
  // En développement, ignorer TOUTES les erreurs P2021 (table non trouvée)
  if (process.env.NODE_ENV === 'development') {
    // Vérifier dans le message
    if (info.message && typeof info.message === 'string') {
      const message = info.message.toLowerCase();
      if (message.includes('p2021') || 
          message.includes('does not exist') ||
          message.includes('security_metrics') ||
          message.includes('table') && message.includes('not exist') ||
          message.includes('table') && message.includes('does not exist') ||
          message.includes('invalid') && message.includes('invocation')) {
        return false; // Ne pas logger
      }
    }
    
    // Vérifier dans les métadonnées
    if (info.meta) {
      if (info.meta.code === 'P2021' || 
          (info.meta.table && (info.meta.table.includes('security_metrics') || info.meta.table.includes('User') || info.meta.table.includes('Company') || info.meta.table.includes('Application'))) ||
          (typeof info.meta === 'string' && info.meta.includes('does not exist'))) {
        return false; // Ne pas logger
      }
    }
    
    // Vérifier dans l'erreur
    if (info.error) {
      if (info.error.code === 'P2021' || 
          (info.error.message && info.error.message.includes('does not exist')) ||
          (info.error.meta && info.error.meta.code === 'P2021')) {
        return false; // Ne pas logger
      }
    }
    
    // Vérifier le code directement
    if (info.code === 'P2021') {
      return false; // Ne pas logger
    }
    
    // Vérifier dans la stack trace
    if (info.stack && typeof info.stack === 'string') {
      const stack = info.stack.toLowerCase();
      if (stack.includes('p2021') || 
          stack.includes('does not exist') ||
          stack.includes('security_metrics') ||
          stack.includes('prismaclientknownrequesterror')) {
        return false; // Ne pas logger
      }
    }
  }
  return info;
});

const logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    filterP2021Errors(),
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
      filterP2021Errors(), // Filtrer aussi dans la console
      winston.format.colorize(),
      winston.format.simple(),
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
