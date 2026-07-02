'use strict';

/**
 * Résolution centralisée des URLs API Gateway selon le contexte d'exécution.
 *
 * Trois perspectives :
 * - **internal** — trafic conteneur → conteneur (Compose, Portainer, réseau stack).
 *   Ex. `http://api-gateway:3000` (seul l'api-gateway expose un port hôte / URL publique).
 * - **host** — scripts Node, smokes ADB, Jest/Playwright lancés sur la machine (hors réseau Docker).
 *   Ex. `http://127.0.0.1:5002` (port publié `API_GATEWAY_PORT`).
 * - **public** — clients externes (navigateur HTTPS, mobile prod, OAuth redirect).
 *   Ex. `https://api.jobbingtrack.localhost:5443` ou `API_GATEWAY_PUBLIC_URL`.
 *
 * Variables (.env) :
 * - `API_GATEWAY_URL` — défaut **interne** pour les services dans la stack (compose).
 * - `API_GATEWAY_HOST_URL` — optionnel, URL forcée pour scripts hôte.
 * - `API_GATEWAY_INTERNAL_URL` — optionnel, URL interne explicite (Portainer / autre nom de service).
 * - `API_GATEWAY_PUBLIC_URL` — URL vue depuis l'extérieur.
 * - `API_GATEWAY_PORT` — port publié sur l'hôte (défaut 5002).
 * - `API_GATEWAY_INTERNAL_PORT` — port d'écoute dans le conteneur gateway (défaut 3000).
 * - `SMOKE_API_GATEWAY_URL` / `PLAYWRIGHT_API_GATEWAY_URL` — override tests (perspective host).
 */

const fs = require('fs');

const INTERNAL_GATEWAY_HOST =
  process.env.API_GATEWAY_SERVICE_HOST?.trim() || 'api-gateway';

function trimUrl(url) {
  return String(url || '').trim().replace(/\/$/, '');
}

function getPublishedGatewayPort() {
  return String(process.env.API_GATEWAY_PORT || '5002').trim();
}

function getInternalGatewayPort() {
  return String(process.env.API_GATEWAY_INTERNAL_PORT || '3000').trim();
}

function isRunningInContainer() {
  if (process.env.RUNNING_IN_DOCKER === '1') return true;
  if (process.env.KUBERNETES_SERVICE_HOST) return true;
  try {
    return fs.existsSync('/.dockerenv');
  } catch {
    return false;
  }
}

function isDockerInternalHostname(hostname) {
  if (!hostname) return false;
  const h = hostname.toLowerCase();
  return (
    h === 'api-gateway' ||
    h === 'jobbingtrack-api-gateway' ||
    h.endsWith('.internal')
  );
}

function defaultInternalGatewayUrl() {
  return `http://${INTERNAL_GATEWAY_HOST}:${getInternalGatewayPort()}`;
}

function defaultHostGatewayUrl() {
  return `http://127.0.0.1:${getPublishedGatewayPort()}`;
}

/**
 * Réécrit une URL « réseau Docker » vers le port publié sur l'hôte.
 */
function normalizeUrlForHost(rawUrl) {
  const base = trimUrl(rawUrl) || defaultHostGatewayUrl();
  try {
    const u = new URL(base);
    const pubPort = getPublishedGatewayPort();
    const intPort = getInternalGatewayPort();

    if (isDockerInternalHostname(u.hostname)) {
      return `http://127.0.0.1:${pubPort}`;
    }

    // localhost:3000 sur l'hôte alors que le port publié est 5002
    if (
      (u.hostname === 'localhost' || u.hostname === '127.0.0.1') &&
      (u.port === intPort || (!u.port && intPort === '80')) &&
      intPort !== pubPort
    ) {
      u.hostname = '127.0.0.1';
      u.port = pubPort;
      return trimUrl(u.toString());
    }
  } catch {
    return defaultHostGatewayUrl();
  }
  return base;
}

/** @deprecated alias historique tests/ — préférer normalizeUrlForHost */
function normalizeGatewayUrlForHost(url) {
  return normalizeUrlForHost(url);
}

/**
 * @param {{ perspective?: 'auto' | 'host' | 'internal' | 'public' }} [options]
 */
function resolveGatewayUrl(options = {}) {
  const perspective = options.perspective || 'auto';

  if (perspective === 'public') {
    return trimUrl(
      process.env.API_GATEWAY_PUBLIC_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        process.env.NEXT_PUBLIC_API_GATEWAY_URL ||
        defaultHostGatewayUrl(),
    );
  }

  if (perspective === 'internal') {
    return trimUrl(
      process.env.API_GATEWAY_INTERNAL_URL ||
        process.env.API_GATEWAY_URL ||
        defaultInternalGatewayUrl(),
    );
  }

  if (perspective === 'host') {
    const smokeOverride = trimUrl(process.env.SMOKE_API_GATEWAY_URL);
    if (smokeOverride) return smokeOverride;
    const playwrightOverride = trimUrl(process.env.PLAYWRIGHT_API_GATEWAY_URL);
    if (playwrightOverride) return playwrightOverride;
    if (process.env.API_GATEWAY_HOST_URL?.trim()) {
      return trimUrl(process.env.API_GATEWAY_HOST_URL);
    }
    const raw =
      process.env.API_GATEWAY_URL ||
      process.env.API_URL ||
      defaultHostGatewayUrl();
    return normalizeUrlForHost(raw);
  }

  // auto
  if (isRunningInContainer()) {
    return resolveGatewayUrl({ perspective: 'internal' });
  }
  return resolveGatewayUrl({ perspective: 'host' });
}

/**
 * Sur l'hôte : aligne `API_GATEWAY_URL` / `API_URL` pour les sous-processus (smokes, spawn).
 * Dans un conteneur : ne modifie rien (réseau interne conservé).
 */
function applyRuntimeGatewayEnv() {
  if (isRunningInContainer()) return resolveGatewayUrl({ perspective: 'internal' });
  const hostUrl = resolveGatewayUrl({ perspective: 'host' });
  process.env.API_GATEWAY_URL = hostUrl;
  const apiUrl = process.env.API_URL?.trim();
  if (!apiUrl) {
    process.env.API_URL = hostUrl;
  } else {
    try {
      const parsed = new URL(apiUrl);
      if (isDockerInternalHostname(parsed.hostname)) {
        process.env.API_URL = hostUrl;
      }
    } catch {
      process.env.API_URL = hostUrl;
    }
  }
  return hostUrl;
}

module.exports = {
  INTERNAL_GATEWAY_HOST,
  isRunningInContainer,
  isDockerInternalHostname,
  getPublishedGatewayPort,
  getInternalGatewayPort,
  defaultInternalGatewayUrl,
  defaultHostGatewayUrl,
  normalizeUrlForHost,
  normalizeGatewayUrlForHost,
  normalizeMonitoringCUrl,
  normalizeMetricsAggregatorUrl,
  resolveGatewayUrl,
  applyRuntimeGatewayEnv,
};

function normalizeMonitoringCUrl(url) {
  const base = trimUrl(url) || `http://127.0.0.1:${process.env.MONITORING_C_PORT || '5098'}`;
  try {
    const u = new URL(base);
    if (u.hostname === 'monitoring-c') {
      return `http://127.0.0.1:${process.env.MONITORING_C_PORT || '5098'}`;
    }
  } catch {
    /* ignore */
  }
  return base;
}

function normalizeMetricsAggregatorUrl(url) {
  const defPort = process.env.METRICS_AGGREGATOR_PORT || '5004';
  const base = trimUrl(url) || `http://127.0.0.1:${defPort}`;
  try {
    const u = new URL(base);
    if (
      u.hostname === 'jobbingtrack-metrics-aggregator' ||
      u.hostname === 'metrics-aggregator'
    ) {
      return `http://127.0.0.1:${defPort}`;
    }
  } catch {
    /* ignore */
  }
  return base;
}
