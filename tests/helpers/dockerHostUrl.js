'use strict';

/**
 * Remplace les noms d’hôte Docker par 127.0.0.1 pour Jest / Node lancés sur l’hôte
 * (évite ENOTFOUND api-gateway, monitoring-c, etc.).
 */

function normalizeGatewayUrlForHost(url) {
  const base = (url && String(url).trim()) || 'http://localhost:5002';
  try {
    const u = new URL(base);
    if (u.hostname === 'api-gateway') {
      // Ne pas réutiliser u.port (ex. 3000 = port interne Docker) : depuis l’hôte = port publié compose
      const hostPort = process.env.API_GATEWAY_PORT || '5002';
      return `http://127.0.0.1:${hostPort}`;
    }
  } catch (_) {
    /* ignore */
  }
  return base;
}

/** monitoring-c : depuis l’hôte, utiliser MONITORING_C_PORT (défaut 5098), pas le port interne 8015. */
function normalizeMonitoringCUrl(url) {
  const base = (url && String(url).trim()) || 'http://localhost:5098';
  try {
    const u = new URL(base);
    if (u.hostname === 'monitoring-c') {
      const hostPort = process.env.MONITORING_C_PORT || '5098';
      return `http://127.0.0.1:${hostPort}`;
    }
  } catch (_) {
    /* ignore */
  }
  return base;
}

function normalizeMetricsAggregatorUrl(url) {
  const defPort = process.env.METRICS_AGGREGATOR_PORT || '5004';
  const base = (url && String(url).trim()) || `http://127.0.0.1:${defPort}`;
  try {
    const u = new URL(base);
    if (
      u.hostname === 'jobbingtrack-metrics-aggregator' ||
      u.hostname === 'metrics-aggregator'
    ) {
      return `http://127.0.0.1:${defPort}`;
    }
  } catch (_) {
    /* ignore */
  }
  return base;
}

module.exports = {
  normalizeGatewayUrlForHost,
  normalizeMonitoringCUrl,
  normalizeMetricsAggregatorUrl,
};
