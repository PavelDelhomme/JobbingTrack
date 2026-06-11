/**
 * Source unique des ports/chemins de sonde HTTP pour les services JobbingTrack.
 * Les sondes depuis metrics-aggregator utilisent le nom de conteneur Docker (réseau interne),
 * pas les ports mappés sur l'hôte (800x).
 */
const SERVICE_HEALTH_ENDPOINTS = {
  'jobbingtrack-api-gateway': { port: 3000, path: '/api/v1/health' },
  'jobbingtrack-auth-service': { port: 3001, path: '/api/v1/auth/health' },
  'jobbingtrack-application-service': { port: 3002, path: '/api/v1/applications/health' },
  'jobbingtrack-company-service': { port: 3003, path: '/api/v1/companies/health' },
  'jobbingtrack-contact-service': { port: 3004, path: '/api/v1/contacts/health' },
  'jobbingtrack-interview-service': { port: 3005, path: '/api/v1/interviews/health' },
  'jobbingtrack-call-service': { port: 3008, path: '/api/v1/calls/health' },
  'jobbingtrack-event-service': { port: 3011, path: '/api/v1/events/health' },
  'jobbingtrack-followup-service': { port: 3012, path: '/api/v1/followups/health' },
  'jobbingtrack-profile-service': { port: 3009, path: '/health' },
  'jobbingtrack-notification-service': { port: 3008, path: '/health' },
  'jobbingtrack-workflow-service': { port: 3013, path: '/health' },
  'jobbingtrack-dashboard-service': { port: 3000, path: '/api/v1/dashboard/health' },
  'jobbingtrack-metrics-aggregator': { port: 3014, path: '/api/v1/health' },
  'jobbingtrack-deployment-service': { port: 3016, path: '/health' },
  'jobbingtrack-security-service': { port: 3017, path: '/health' },
  'jobbingtrack-monitoring-agent-rs': { port: 8015, path: '/health' },
  'jobbingtrack-log-collector-rs': { port: 3019, path: '/health' },
  'jobbingtrack-frontend': { port: 3000, path: '/health' },
  'jobbingtrack-postgres': { type: 'database', port: 5432 },
  'jobbingtrack-redis': { type: 'cache', port: 6379 },
  'jobbingtrack-cadvisor': { type: 'monitoring', port: 8080, path: '/' },
  'jobbingtrack-prometheus': { type: 'monitoring', port: 9090, path: '/' },
};

function isNonHttpProbe(config) {
  return config?.type === 'database' || config?.type === 'cache';
}

function buildKnownServicesMap() {
  const out = {};
  for (const [name, cfg] of Object.entries(SERVICE_HEALTH_ENDPOINTS)) {
    out[name] = {
      port: cfg.port,
      healthPath: cfg.path || '/health',
      ...(cfg.type ? { type: cfg.type } : {}),
    };
  }
  return out;
}

function resolveProbeHost(containerName) {
  return process.env.METRICS_HTTP_PROBE_USE_LOCALHOST === 'true'
    ? 'localhost'
    : containerName;
}

module.exports = {
  SERVICE_HEALTH_ENDPOINTS,
  isNonHttpProbe,
  buildKnownServicesMap,
  resolveProbeHost,
};
