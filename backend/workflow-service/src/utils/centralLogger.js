const axios = require('axios');

const METRICS_SERVICE_URL = process.env.METRICS_SERVICE_URL || process.env.METRICS_AGGREGATOR_URL || 'http://jobbingtrack-metrics-aggregator:3014';
const SERVICE_NAME = process.env.SERVICE_NAME || process.env.npm_package_name || 'workflow-service';

class CentralLogger {
  constructor() {
    this.serviceName = SERVICE_NAME;
    this.metricsUrl = `${METRICS_SERVICE_URL}/api/v1/persistence/logs`;
    const inTest = process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID;
    this.enabled = !inTest && process.env.ENABLE_CENTRAL_LOGGING !== 'false';
    this.batchSize = parseInt(process.env.LOG_BATCH_SIZE, 10) || 10;
    this.batchInterval = parseInt(process.env.LOG_BATCH_INTERVAL, 10) || 5000;
    this.logBuffer = [];
    this.batchTimer = null;
    if (this.enabled) {
      this.startBatchTimer();
    }
  }

  startBatchTimer() {
    if (this.batchTimer) clearInterval(this.batchTimer);
    this.batchTimer = setInterval(() => this.flushLogs(), this.batchInterval);
    if (typeof this.batchTimer.unref === 'function') {
      this.batchTimer.unref();
    }
  }

  async flushLogs() {
    if (!this.enabled || this.logBuffer.length === 0) return;
    const logsToSend = [...this.logBuffer];
    this.logBuffer = [];
    try {
      await axios.post(this.metricsUrl, { logs: logsToSend }, { timeout: 5000 });
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('[CENTRAL_LOGGER] workflow-service:', error.message);
      }
    }
  }

  addLog(level, message, metadata = {}) {
    if (!this.enabled) return;
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
