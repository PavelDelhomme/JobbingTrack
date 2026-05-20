const dockerService = require('../src/services/docker.service');
const {
  classifyContainerHealth,
  dedupeContainersByName,
  isContainerRunning,
  summarizeContainersForBackoffice,
} = require('../src/services/serviceHealthModel');

describe('serviceHealthModel', () => {
  it('classe running healthy, degraded/unknown et stopped', () => {
    expect(isContainerRunning({ status: 'running' })).toBe(true);
    expect(isContainerRunning({ is_running: false, status: 'running' })).toBe(false);

    expect(classifyContainerHealth({ status: 'running', health_status: 'healthy' })).toBe('healthy');
    expect(classifyContainerHealth({ status: 'running', health_status: 'starting' })).toBe('healthy');
    expect(classifyContainerHealth({ status: 'running', health_status: 'none' })).toBe('healthy');
    expect(classifyContainerHealth({ status: 'running', health_status: 'unknown' })).toBe('degraded');
    expect(classifyContainerHealth({ status: 'running', health: { health_status_http: 'degraded' } })).toBe('degraded');
    expect(classifyContainerHealth({ status: 'exited', health_status: 'healthy' })).toBe('stopped');
  });

  it('déduplique les conteneurs par nom en préférant le running', () => {
    const rows = dedupeContainersByName([
      { name: '/jobbingtrack-api-gateway', status: 'exited', is_running: false },
      { name: 'jobbingtrack-api-gateway', status: 'running', is_running: true },
      { name: 'jobbingtrack-auth-service', status: 'running', health_status: 'unknown' },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.name === 'jobbingtrack-api-gateway').is_running).toBe(true);
  });

  it('résume les états pour le backoffice sans transformer unknown actif en stopped', () => {
    const summary = summarizeContainersForBackoffice([
      { name: 'jobbingtrack-api-gateway', status: 'running', health_status: 'healthy' },
      { name: 'jobbingtrack-auth-service', status: 'running', health_status: 'unknown' },
      { name: 'jobbingtrack-old-worker', status: 'exited', health_status: 'healthy' },
    ]);

    expect(summary).toEqual({
      healthy: 1,
      degraded: 1,
      stopped: 1,
      running: 2,
      total: 3,
    });
  });

  it('expose les champs santé dans formatStatsForAPI', () => {
    const payload = dockerService.formatStatsForAPI([
      {
        name: 'jobbingtrack-api-gateway',
        status: 'running',
        health_status: 'unknown',
        cpu_percent: 12,
        memory_usage: 100,
        memory_limit: 200,
        memory_percent: 50,
        network_rx: 1,
        network_tx: 2,
        block_read: 3,
        block_write: 4,
        pids: 5,
      },
    ]);

    expect(payload.success).toBe(true);
    expect(payload.health_summary).toMatchObject({ degraded: 1, running: 1, stopped: 0 });
    expect(payload.containers[0]).toMatchObject({
      name: 'jobbingtrack-api-gateway',
      status: 'running',
      is_running: true,
      health_status: 'unknown',
      health_bucket: 'degraded',
    });
  });
});
