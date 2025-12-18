const winston = require('winston');

// Filtre pour ignorer les warnings P2021 (table non trouvée) en développement
const filterP2021Warnings = winston.format((info) => {
  // En développement, ignorer les warnings sur la table Deployment non trouvée
  if (process.env.NODE_ENV === 'development' && info.level === 'warn') {
    if (info.message && typeof info.message === 'string') {
      const message = info.message.toLowerCase();
      if (message.includes('table deployment non trouvée') ||
          message.includes('table deployment non disponible') ||
          message.includes('p2021') ||
          message.includes('does not exist')) {
        return false; // Ne pas logger
      }
    }
  }
  return info;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    filterP2021Warnings(), // Filtrer les warnings P2021
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'deployment-service' },
  transports: [
    // Écrire tous les logs avec niveau 'error' et inférieur dans error.log
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    // Écrire tous les logs dans combined.log
    new winston.transports.File({
      filename: 'logs/combined.log',
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
      filterP2021Warnings(), // Filtrer aussi dans la console
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
        // Ne pas afficher les warnings P2021
        if (level === 'warn' && message && typeof message === 'string') {
          const msg = message.toLowerCase();
          if (msg.includes('table deployment non trouvée') ||
              msg.includes('table deployment non disponible') ||
              msg.includes('p2021') ||
              msg.includes('does not exist')) {
            return ''; // Ne pas afficher
          }
        }
        let metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
      })
    )
  }));
}

module.exports = { logger };
