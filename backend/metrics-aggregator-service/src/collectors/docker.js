const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

/**
 * Collecte via Docker Stats API (fallback si cAdvisor indisponible)
 */
async function collect() {
  const containerMetrics = new Map();

  try {
    const containers = await docker.listContainers();

    for (const containerInfo of containers) {
      try {
        const container = docker.getContainer(containerInfo.Id);
        const stats = await container.stats({ stream: false });

        const metrics = {
          id: containerInfo.Id.substring(0, 12),
          name: containerInfo.Names[0].replace('/', ''),
          cpu: calculateCPU(stats),
          memory: calculateMemory(stats),
          network: calculateNetwork(stats),
          timestamp: new Date().toISOString()
        };

        containerMetrics.set(metrics.id, metrics);
      } catch (err) {
        console.error(`Erreur stats ${containerInfo.Names[0]}:`, err.message);
      }
    }

    return containerMetrics;
  } catch (err) {
    throw new Error(`Erreur Docker API: ${err.message}`);
  }
}

function calculateCPU(stats) {
  const cpuDelta = stats.cpu_stats.cpu_usage.total_usage -
                   (stats.precpu_stats.cpu_usage?.total_usage || 0);
  const systemDelta = stats.cpu_stats.system_cpu_usage -
                      (stats.precpu_stats.system_cpu_usage || 0);
  const numberOfCores = stats.cpu_stats.online_cpus || 1;

  let cpuPercent = 0;
  if (systemDelta > 0 && cpuDelta > 0) {
    cpuPercent = (cpuDelta / systemDelta) * numberOfCores * 100.0;
  }

  return {
    percent: parseFloat(cpuPercent.toFixed(2)),
    cores: numberOfCores
  };
}

function calculateMemory(stats) {
  const usage = stats.memory_stats.usage || 0;
  const limit = stats.memory_stats.limit || 0;
  const percent = limit > 0 ? (usage / limit) * 100 : 0;

  return {
    usage: Math.round(usage / 1024 / 1024),
    limit: Math.round(limit / 1024 / 1024),
    percent: parseFloat(percent.toFixed(2))
  };
}

function calculateNetwork(stats) {
  let rxBytes = 0;
  let txBytes = 0;

  if (stats.networks) {
    Object.values(stats.networks).forEach(net => {
      rxBytes += net.rx_bytes || 0;
      txBytes += net.tx_bytes || 0;
    });
  }

  return {
    rxBytes: Math.round(rxBytes / 1024 / 1024),
    txBytes: Math.round(txBytes / 1024 / 1024)
  };
}

module.exports = { collect };
