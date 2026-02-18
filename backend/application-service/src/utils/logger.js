const winston = require('winston');
const { filterP2021Errors, filterP2021InPrintf } = require('./logger-filter');

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
        centralLogger.addLog(level, info.message, {
          stackTrace: info.stack || (info.error && info.error.stack),
          ...info,
        });
      }
    }
    callback();
  }
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    filterP2021Errors(),
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
      )
    }),
    ...(centralLogger ? [new CentralLoggerTransport()] : [])
  ]
});

module.exports = logger;
