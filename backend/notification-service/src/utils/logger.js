const winston = require('winston');
const { filterP2021Errors, filterP2021InPrintf } = require("../../../shared/logger-filter");

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: filterP2021Errors(),
    winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        filterP2021Errors(),
        winston.format.colorize(),
        winston.format.simple(),
        filterP2021InPrintf
      format: filterP2021Errors(),
    winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

module.exports = logger;
