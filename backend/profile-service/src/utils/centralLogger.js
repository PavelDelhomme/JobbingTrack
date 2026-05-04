const axios = require('axios');

const METRICS_SERVICE_URL = process.env.METRICS_SERVICE_URL || process.env.METRICS_AGGREGATOR_URL || 'http://jobbingtrack-metrics-aggregator:3014';
const SERVICE_NAME = process.env.SERVICE_NAME || process.env.npm_package_name || 'profile-service';

class CentralLogger {
  constructor() {
    this.serviceName = SERVICE_NAME;
    this.metricsUrl = `${METRICS_SERVICE_URL}/api/v1/persistence/logs`;
    this.enabled = process.env.ENABLE_CENTRAL_LOGGING !== 'false';
    this.batchSize = parseInt(process.env.LOG_BATCH_SIZE, 10) || 10;
    this.batchInterval = parseInt(process.env.LOG_BATCH_INTERVAL, 10) || 5000;
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
      await axios.post(this.metricsUrl, { logs: logsToSend }, { timeout: 5000 });
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
}

module.exports = new CentralLogger();
