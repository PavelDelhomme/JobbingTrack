/**
 * Logger centralisé pour envoyer les logs au service metrics-aggregator
 * 
 * Usage:
 * const logger = require('@shared/utils/centralLogger');
 * logger.error('Erreur critique', { userId: '123', stackTrace: error.stack });
 * logger.warn('Avertissement important', { service: 'auth-service' });
 * logger.info('Information'); // Ne sera PAS stocké (seuls ERROR/WARN/FATAL sont stockés)
 */

const axios = require('axios');

const METRICS_SERVICE_URL = process.env.METRICS_SERVICE_URL || process.env.METRICS_AGGREGATOR_URL || 'http://jobbingtrack-metrics-aggregator:3014';
const SERVICE_NAME = process.env.SERVICE_NAME || process.env.npm_package_name || 'unknown-service';

class CentralLogger {
  constructor() {
    this.serviceName = SERVICE_NAME;
    this.metricsUrl = `${METRICS_SERVICE_URL}/api/v1/persistence/logs`;
    this.enabled = process.env.ENABLE_CENTRAL_LOGGING !== 'false';
    this.batchSize = parseInt(process.env.LOG_BATCH_SIZE) || 10;
    this.batchInterval = parseInt(process.env.LOG_BATCH_INTERVAL) || 5000; // 5 secondes
    this.logBuffer = [];
    this.batchTimer = null;
    
    // Démarrer le timer de batch
    this.startBatchTimer();
  }

  /**
   * Démarrer le timer pour envoyer les logs par batch
   */
  startBatchTimer() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    
    this.batchTimer = setInterval(() => {
      this.flushLogs();
    }, this.batchInterval);
  }

  /**
   * Envoyer les logs en buffer
   */
  async flushLogs() {
    if (this.logBuffer.length === 0) {
      return;
    }

    const logsToSend = [...this.logBuffer];
    this.logBuffer = [];

    if (!this.enabled) {
      return;
    }

    try {
      await axios.post(this.metricsUrl, {
        logs: logsToSend,
      }, {
        timeout: 5000, // 5 secondes max
      });
    } catch (error) {
      // En cas d'erreur, ne pas bloquer l'application
      // Les logs sont perdus mais l'application continue
      console.error('[CENTRAL_LOGGER] Erreur envoi logs:', error.message);
    }
  }

  /**
   * Ajouter un log au buffer
   */
  addLog(level, message, metadata = {}) {
    const logEntry = {
      serviceName: this.serviceName,
      level,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      metadata: metadata.metadata || metadata,
      stackTrace: metadata.stackTrace || null,
      userId: metadata.userId || null,
      requestId: metadata.requestId || null,
      timestamp: new Date().toISOString(),
    };

    // Toujours logger localement
    const logMethod = level === 'ERROR' || level === 'FATAL' ? console.error : 
                      level === 'WARN' ? console.warn : console.log;
    logMethod(`[${this.serviceName}] [${level}] ${message}`, metadata);

    // Ajouter au buffer uniquement si ERROR, WARN ou FATAL
    if (['ERROR', 'WARN', 'FATAL'].includes(level)) {
      this.logBuffer.push(logEntry);

      // Envoyer immédiatement si le buffer est plein
      if (this.logBuffer.length >= this.batchSize) {
        this.flushLogs();
      }
    }
  }

  /**
   * Logger une erreur
   */
  error(message, metadata = {}) {
    this.addLog('ERROR', message, metadata);
  }

  /**
   * Logger un warning
   */
  warn(message, metadata = {}) {
    this.addLog('WARN', message, metadata);
  }

  /**
   * Logger une information (ne sera PAS stocké dans la DB)
   */
  info(message, metadata = {}) {
    this.addLog('INFO', message, metadata);
  }

  /**
   * Logger une erreur fatale
   */
  fatal(message, metadata = {}) {
    this.addLog('FATAL', message, metadata);
  }

  /**
   * Logger en debug (ne sera PAS stocké dans la DB)
   */
  debug(message, metadata = {}) {
    this.addLog('DEBUG', message, metadata);
  }

  /**
   * Forcer l'envoi immédiat des logs en buffer
   */
  async flush() {
    await this.flushLogs();
  }

  /**
   * Arrêter le logger (appelé lors de l'arrêt du service)
   */
  async shutdown() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
    await this.flushLogs();
  }
}

// Singleton
const logger = new CentralLogger();

// Gérer l'arrêt propre
process.on('SIGTERM', async () => {
  await logger.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await logger.shutdown();
  process.exit(0);
});

module.exports = logger;

