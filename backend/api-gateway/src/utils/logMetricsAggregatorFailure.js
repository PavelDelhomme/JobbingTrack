/**
 * Logs gateway quand jobbingtrack-metrics-aggregator est injoignable.
 * Erreurs transitoires (timeout, ECONNREFUSED au redémarrage, etc.) → warn + hint explicite.
 */
function isTransientMetricsError(err) {
  if (!err) return false;
  const code = err.code;
  const msg = String(err.message || '');
  if (code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'ECONNRESET' || code === 'EPIPE') {
    return true;
  }
  if (/timeout|ECONNREFUSED|socket hang up/i.test(msg)) {
    return true;
  }
  return false;
}

function logMetricsAggregatorFailure(logger, metricsError, extra = {}) {
  const metricsServiceUrl = process.env.METRICS_SERVICE_URL || 'http://jobbingtrack-metrics-aggregator:3014';
  const transient = isTransientMetricsError(metricsError);
  const payload = {
    ...extra,
    error: metricsError.message,
    code: metricsError.code,
    url: metricsServiceUrl,
    timestamp: new Date().toISOString(),
    transient,
    hint: transient
      ? 'Souvent normal après redémarrage Docker, pendant make db-push-all (metrics-aggregator est relancé), ou cold start ; réessayez sous peu.'
      : 'Vérifier que jobbingtrack-metrics-aggregator est UP et joignable depuis la gateway.',
  };
  if (transient) {
    logger.warn('Métriques agrégateur indisponibles (transitoire)', payload);
  } else {
    logger.error('Service de métriques non disponible', payload);
  }
}

module.exports = {
  isTransientMetricsError,
  logMetricsAggregatorFailure,
};
