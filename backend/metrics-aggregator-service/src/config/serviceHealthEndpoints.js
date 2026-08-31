/**
 * Source unique des ports/chemins de sonde HTTP pour les services JobbingTrack.
 * Les sondes depuis metrics-aggregator utilisent le **nom de service Compose**
 * (réseau interne : `api-gateway`, `auth-service`, …), pas le `container_name`
 * Portainer (`jobbingtrack-preprod-api-gateway`).
 *
 * STACK_SLUG (ex. jobbingtrack-preprod / jobbingtrack-prod / jobbingtrack) sert
 * uniquement aux clés affichées / matching conteneurs Docker.
 */
const SERVICE_HEALTH_DEFS = {
  'api-gateway': { port: 3000, path: '/api/v1/health' },
  'auth-service': { port: 3001, path: '/api/v1/auth/health' },
  'application-service': { port: 3002, path: '/api/v1/applications/health' },
  'company-service': { port: 3003, path: '/api/v1/companies/health' },
  'contact-service': { port: 3004, path: '/api/v1/contacts/health' },
  'interview-service': { port: 3005, path: '/api/v1/interviews/health' },
  'call-service': { port: 3008, path: '/api/v1/calls/health' },
  'event-service': { port: 3011, path: '/api/v1/events/health' },
  'followup-service': { port: 3012, path: '/api/v1/followups/health' },
  'profile-service': { port: 3009, path: '/health' },
  'notification-service': { port: 3008, path: '/health' },
  'workflow-service': { port: 3013, path: '/health' },
  'dashboard-service': { port: 3000, path: '/api/v1/dashboard/health' },
  'metrics-aggregator': { port: 3014, path: '/api/v1/health' },
  'deployment-service': { port: 3016, path: '/health' },
  'security-service': { port: 3017, path: '/health' },
  'monitoring-agent-rs': { port: 8015, path: '/health' },
  'log-collector-rs': { port: 3019, path: '/health' },
  'frontend': { port: 3000, path: '/health' },
  'postgres': { type: 'database', port: 5432 },
  'redis': { type: 'cache', port: 6379 },
};

/** @deprecated alias — clés historiques `jobbingtrack-*` (dev local sans STACK_SLUG). */
const SERVICE_HEALTH_ENDPOINTS = Object.fromEntries(
  Object.entries(SERVICE_HEALTH_DEFS).map(([svc, cfg]) => [`jobbingtrack-${svc}`, cfg]),
);

function resolveStackSlug() {
  const raw = (
    process.env.STACK_SLUG
    || process.env.METRICS_STACK_SLUG
    || process.env.COMPOSE_PROJECT_NAME
    || 'jobbingtrack'
  ).trim();
  return raw.replace(/\/+$/, '') || 'jobbingtrack';
}

function isNonHttpProbe(config) {
  return config?.type === 'database' || config?.type === 'cache';
}

/**
 * Map clé affichée → config. Clés = `${STACK_SLUG}-${service}` (ex. jobbingtrack-prod-api-gateway).
 */
function buildKnownServicesMap() {
  const slug = resolveStackSlug();
  const out = {};
  for (const [composeService, cfg] of Object.entries(SERVICE_HEALTH_DEFS)) {
    const name = `${slug}-${composeService}`;
    out[name] = {
      port: cfg.port,
      healthPath: cfg.path || '/health',
      composeService,
      ...(cfg.type ? { type: cfg.type } : {}),
    };
  }
  return out;
}

/**
 * Hôte DNS Docker pour la sonde HTTP : nom de service Compose sur le réseau de la stack.
 */
function resolveProbeHost(containerOrServiceName, knownMap) {
  if (process.env.METRICS_HTTP_PROBE_USE_LOCALHOST === 'true') {
    return 'localhost';
  }
  const map = knownMap || buildKnownServicesMap();
  const known = map[containerOrServiceName];
  if (known?.composeService) return known.composeService;

  const slug = resolveStackSlug();
  if (containerOrServiceName.startsWith(`${slug}-`)) {
    return containerOrServiceName.slice(slug.length + 1);
  }
  if (containerOrServiceName.startsWith('jobbingtrack-')) {
    return containerOrServiceName.slice('jobbingtrack-'.length);
  }
  return containerOrServiceName;
}

module.exports = {
  SERVICE_HEALTH_DEFS,
  SERVICE_HEALTH_ENDPOINTS,
  resolveStackSlug,
  isNonHttpProbe,
  buildKnownServicesMap,
  resolveProbeHost,
};
