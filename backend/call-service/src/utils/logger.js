const winston = require('winston');
const { filterP2021Errors, filterP2021InPrintf } = require('./logger-filter');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    filterP2021Errors(), // Filtrer les erreurs P2021
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
    })
  ]
});

module.exports = logger;

