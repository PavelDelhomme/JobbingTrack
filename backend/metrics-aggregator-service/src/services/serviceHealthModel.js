function normalizeContainerName(name) {
  return String(name || '').replace(/^\//, '').trim();
}

function isContainerRunning(container) {
  if (container?.is_running === false) return false;
  if (container?.is_running === true) return true;
  const status = String(container?.status || container?.state || '').toLowerCase();
  return status === 'running' || status === 'restarting';
}

function classifyContainerHealth(container) {
  if (!isContainerRunning(container)) return 'stopped';

  const dockerHealth = String(
    container?.health_status ||
      container?.health?.status ||
      container?.health?.health_status_docker ||
      ''
  ).toLowerCase();
  const httpHealth = String(
    container?.health_status_http ||
      container?.health?.health_status_http ||
      container?.health?.http ||
      ''
  ).toLowerCase();

  if (container?.is_healthy === true) return 'healthy';
  if (dockerHealth === 'healthy' || dockerHealth === 'none' || dockerHealth === 'starting') {
    return 'healthy';
  }
  if (httpHealth === 'ok' || httpHealth === 'healthy') return 'healthy';
  return 'degraded';
}

function dedupeContainersByName(containers) {
  const byName = new Map();
  for (const container of containers || []) {
    const name = normalizeContainerName(container?.name || container?.Name || container?.containerName);
    if (!name) continue;
    const previous = byName.get(name);
    if (!previous || (isContainerRunning(container) && !isContainerRunning(previous))) {
      byName.set(name, { ...container, name });
    }
  }
  return Array.from(byName.values());
}

function summarizeContainersForBackoffice(containers) {
  const summary = { healthy: 0, degraded: 0, stopped: 0, running: 0, total: 0 };
  for (const container of dedupeContainersByName(containers)) {
    summary.total += 1;
    const bucket = classifyContainerHealth(container);
    if (bucket !== 'stopped') summary.running += 1;
    summary[bucket] += 1;
  }
  return summary;
}

function decorateContainerHealth(container) {
  const name = normalizeContainerName(container?.name || container?.Name || container?.containerName);
  const status = String(container?.status || container?.state || (container?.is_running ? 'running' : 'unknown'));
  const is_running = isContainerRunning(container);
  const health_status = String(
    container?.health_status ||
      container?.health?.status ||
      container?.health?.health_status_docker ||
      (is_running ? 'unknown' : 'stopped')
  ).toLowerCase();

  return {
    ...container,
    name,
    status,
    is_running,
    health_status,
    health_bucket: classifyContainerHealth({ ...container, name, status, is_running, health_status }),
  };
}

module.exports = {
  normalizeContainerName,
  isContainerRunning,
  classifyContainerHealth,
  dedupeContainersByName,
  summarizeContainersForBackoffice,
  decorateContainerHealth,
};
