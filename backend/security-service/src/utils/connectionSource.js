const PORT_SERVICE_HINTS = {
  3000: 'api-gateway (3000)',
  3001: 'auth-service (3001)',
  3002: 'applications (3002)',
  3003: 'companies (3003)',
  3004: 'contacts (3004)',
  3005: 'interviews (3005)',
  3006: 'notifications (3006)',
  3007: 'dashboard (3007)',
  3008: 'calls / notification (3008)',
  3009: 'profile (3009)',
  3011: 'events (3011)',
  3012: 'followups (3012)',
  3013: 'workflow (3013)',
  3014: 'metrics-aggregator (3014)',
  3017: 'security-service (3017)',
  5432: 'postgres (5432)',
  6379: 'redis (6379)',
};

function normalizeIp(ip) {
  const value = String(ip || '').trim();
  if (value.startsWith('::ffff:')) return value.slice(7);
  return value;
}

function isPrivateIp(ip) {
  const value = normalizeIp(ip);
  if (!value) return false;
  if (value === '127.0.0.1' || value === '::1') return true;
  if (value.startsWith('10.') || value.startsWith('192.168.')) return true;
  const secondOctet = Number(value.split('.')[1]);
  return value.startsWith('172.') && secondOctet >= 16 && secondOctet <= 31;
}

function isUnresolvedRemoteIp(ip) {
  const value = normalizeIp(ip);
  return !value || value === '0.0.0.0' || value === '::' || value === 'undefined';
}

function resolveConnectionSource(conn = {}) {
  const remoteIp = normalizeIp(conn.remoteIp || conn.sourceIp);
  const localIp = normalizeIp(conn.localIp || conn.destIp);
  const localPort = Number(conn.localPort ?? conn.destPort ?? 0) || null;
  const remotePort = Number(conn.remotePort ?? conn.sourcePort ?? 0) || null;
  const containerName = String(conn.containerName || '').trim();
  const containerId = String(conn.containerId || '').trim();

  let sourceKind = 'unknown';
  let sourceLabel = 'Source inconnue';
  let sourceConfidence = 'low';
  let sourceDetail = null;

  if (isUnresolvedRemoteIp(remoteIp)) {
    sourceKind = 'ephemeral';
    sourceLabel = 'Port éphémère';
    sourceConfidence = 'low';
    sourceDetail = 'Adresse distante non résolue (0.0.0.0 / socket en écoute)';
  } else if (remoteIp === '127.0.0.1' || remoteIp === '::1') {
    sourceKind = 'local';
    sourceLabel = 'Localhost';
    sourceConfidence = 'high';
    sourceDetail = remoteIp;
  } else if (isPrivateIp(remoteIp)) {
    sourceKind = 'docker-internal';
    sourceLabel = 'Réseau Docker / interne';
    sourceConfidence = 'high';
    sourceDetail = remoteIp;
  } else {
    sourceKind = 'public';
    sourceLabel = 'IP publique';
    sourceConfidence = 'high';
    sourceDetail = remoteIp;
  }

  let destKind = 'unmapped';
  let destLabel = 'Non corrélé';
  let destConfidence = 'low';

  if (containerName && containerName.toLowerCase() !== 'unknown') {
    destKind = 'docker';
    destLabel = containerName;
    destConfidence = 'high';
  } else if (containerId) {
    destKind = 'docker';
    destLabel = `Conteneur ${containerId.slice(0, 12)}`;
    destConfidence = 'medium';
  } else if (localIp === '127.0.0.1' || localIp === '::1') {
    destKind = 'host-local';
    destLabel = 'Service local (loopback)';
    destConfidence = 'high';
  } else if (isPrivateIp(localIp)) {
    destKind = 'host-network';
    destLabel = 'Interface Docker / privée';
    destConfidence = 'medium';
  } else if (localPort && PORT_SERVICE_HINTS[localPort]) {
    destKind = 'service-hint';
    destLabel = PORT_SERVICE_HINTS[localPort];
    destConfidence = 'medium';
  } else if (remotePort && PORT_SERVICE_HINTS[remotePort]) {
    destKind = 'service-hint';
    destLabel = PORT_SERVICE_HINTS[remotePort];
    destConfidence = 'low';
  } else if (localPort) {
    destKind = 'port';
    destLabel = `Port local ${localPort}`;
    destConfidence = 'low';
  }

  return {
    remoteIp: remoteIp || null,
    localIp: localIp || null,
    localPort,
    remotePort,
    protocol: conn.protocol || 'TCP',
    state: conn.state || null,
    containerName: containerName || null,
    containerId: containerId || null,
    source: {
      kind: sourceKind,
      label: sourceLabel,
      confidence: sourceConfidence,
      detail: sourceDetail,
      ip: isUnresolvedRemoteIp(remoteIp) ? null : remoteIp,
    },
    destination: {
      kind: destKind,
      label: destLabel,
      confidence: destConfidence,
      port: localPort,
    },
    serviceLabel: destLabel,
  };
}

function resolveContainerLabel(conn = {}) {
  return resolveConnectionSource(conn).destination.label;
}

function bucketConnectionCorrelation(conn = {}) {
  const destKind = resolveConnectionSource(conn).destination.kind;
  if (destKind === 'unmapped' || destKind === 'port') return 'unmapped';
  if (destKind === 'host-local' || destKind === 'host-network' || destKind === 'service-hint') {
    return 'hostLayer';
  }
  return 'dockerNamed';
}

module.exports = {
  PORT_SERVICE_HINTS,
  normalizeIp,
  isPrivateIp,
  resolveConnectionSource,
  resolveContainerLabel,
  bucketConnectionCorrelation,
};
