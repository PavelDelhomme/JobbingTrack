/**
 * Réponse liste services quand metrics-aggregator est down (évite 503 sur /api/v1/services).
 */
function buildFallbackServicesPayload() {
  const fallbackServices = [
    {
      name: 'api-gateway',
      status: 'running',
      port: 3000,
      url: 'http://localhost:3000',
      health: 'degraded',
      version: '1.0.0',
      environment: 'development',
      type: 'api-gateway',
      dataSource: 'fallback',
      lastCheck: new Date().toISOString(),
      responseTime: 'N/A',
    },
    {
      name: 'auth-service',
      status: 'running',
      port: 3001,
      url: 'http://localhost:3001',
      health: 'degraded',
      version: '1.0.0',
      environment: 'development',
      type: 'auth',
      dataSource: 'fallback',
      lastCheck: new Date().toISOString(),
      responseTime: 'N/A',
    },
    {
      name: 'frontend',
      status: 'running',
      port: 8080,
      url: 'http://localhost:8080',
      health: 'degraded',
      version: '1.0.0',
      environment: 'development',
      type: 'frontend',
      dataSource: 'fallback',
      lastCheck: new Date().toISOString(),
      responseTime: 'N/A',
    },
  ];

  return {
    success: true,
    services: fallbackServices,
    total: fallbackServices.length,
    running: fallbackServices.filter((s) => s.status === 'running').length,
    dataSource: 'fallback',
    fallback: true,
    metricsUnavailable: true,
    message:
      'Liste partielle (fallback) — monitoring Docker indisponible momentanément ; les services peuvent être pourtant UP.',
    timestamp: new Date().toISOString(),
  };
}

module.exports = { buildFallbackServicesPayload };
