/**
 * Logger centralisé vers metrics-aggregator (copie depuis backend/shared/utils/centralLogger.js)
 * Envoie ERROR/WARN/FATAL au metrics-aggregator pour persistance.
 */
const axios = require('axios');

const METRICS_SERVICE_URL = process.env.METRICS_SERVICE_URL || process.env.METRICS_AGGREGATOR_URL || 'http://jobbingtrack-metrics-aggregator:3014';
const METRICS_API_KEY = process.env.METRICS_API_KEY;
const SERVICE_NAME = process.env.SERVICE_NAME || process.env.npm_package_name || 'auth-service';

class CentralLogger {
  constructor() {
    this.serviceName = SERVICE_NAME;
    this.metricsUrl = `${METRICS_SERVICE_URL}/api/v1/persistence/logs`;
    this.enabled = process.env.ENABLE_CENTRAL_LOGGING !== 'false';
    this.batchSize = parseInt(process.env.LOG_BATCH_SIZE) || 10;
    this.batchInterval = parseInt(process.env.LOG_BATCH_INTERVAL) || 5000;
    this.logBuffer = [];
    this.batchTimer = null;
    this.startBatchTimer();
  }

  startBatchTimer() {
    if (this.batchTimer) clearInterval(this.batchTimer);
    this.batchTimer = setInterval(() => this.flushLogs(), this.batchInterval);
  }

  async flushLogs() {
    if (this.logBuffer.length === 0) return;
    const logsToSend = [...this.logBuffer];
    this.logBuffer = [];
    if (!this.enabled) return;
    try {
      await axios.post(this.metricsUrl, { logs: logsToSend }, {
        timeout: 5000,
        headers: METRICS_API_KEY ? { 'X-API-Key': METRICS_API_KEY } : undefined,
      });
    } catch (error) {
      console.error('[CENTRAL_LOGGER] Erreur envoi logs:', error.message);
    }
  }

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
    if (['ERROR', 'WARN', 'FATAL'].includes(level)) {
      this.logBuffer.push(logEntry);
      if (this.logBuffer.length >= this.batchSize) this.flushLogs();
    }
  }

  error(message, metadata = {}) { this.addLog('ERROR', message, metadata); }
  warn(message, metadata = {}) { this.addLog('WARN', message, metadata); }
  fatal(message, metadata = {}) { this.addLog('FATAL', message, metadata); }
  async flush() { await this.flushLogs(); }
}

const logger = new CentralLogger();
module.exports = logger;
