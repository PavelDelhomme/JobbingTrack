const axios = require('axios');

/**
 * Collecte les métriques depuis cAdvisor
 */
async function collect(cadvisorUrl) {
  const containerMetrics = new Map();

  try {
    // Récupérer les stats de tous les conteneurs
    const response = await axios.get(`${cadvisorUrl}/api/v2.0/stats`, {
      params: {
        type: 'docker',
        count: 1, // Dernière mesure uniquement
        recursive: true
      },
      timeout: 5000
    });

    const stats = response.data;

    // Parser les stats de chaque conteneur
    for (const [containerPath, containerStats] of Object.entries(stats)) {
      // Extraire l'ID du conteneur
      const pathParts = containerPath.split('/');
      const containerId = pathParts[pathParts.length - 1];

      if (!containerId || containerId === 'docker' || containerStats.length === 0) {
        continue;
      }

      const latestStat = containerStats[containerStats.length - 1];

      // Calculer les métriques
      const metrics = {
        id: containerId.substring(0, 12),
        name: await getContainerName(containerId),
        cpu: calculateCPU(latestStat),
        memory: calculateMemory(latestStat),
        network: calculateNetwork(latestStat),
        timestamp: latestStat.timestamp
      };

      containerMetrics.set(metrics.id, metrics);
    }

    return containerMetrics;
  } catch (err) {
    throw new Error(`Erreur collecte cAdvisor: ${err.message}`);
  }
}

/**
 * Calcul du CPU en pourcentage
 */
function calculateCPU(stats) {
  const cpuStats = stats.cpu;

  if (!cpuStats || !cpuStats.usage) {
    return { percent: 0, cores: 0 };
  }

  const cpuDelta = cpuStats.usage.total;
  const systemDelta = cpuStats.system_cpu_usage || cpuStats.system || 0;
  const numberOfCores = cpuStats.usage.per_cpu_usage ? cpuStats.usage.per_cpu_usage.length : 1;

  let cpuPercent = 0;
  if (systemDelta > 0 && cpuDelta > 0) {
    cpuPercent = (cpuDelta / systemDelta) * numberOfCores * 100.0;
  }

  return {
    percent: parseFloat(cpuPercent.toFixed(2)),
    cores: numberOfCores,
    usage: cpuDelta,
    system: systemDelta
  };
}

/**
 * Calcul de la mémoire
 */
function calculateMemory(stats) {
  const memory = stats.memory;

  if (!memory) {
    return { usage: 0, limit: 0, percent: 0 };
  }

  const usage = memory.usage || 0;
  const limit = memory.container_data?.memory_limit || memory.limit || 0;
  const workingSet = memory.working_set || usage;

  const percent = limit > 0 ? (workingSet / limit) * 100 : 0;

  return {
    usage: Math.round(workingSet / 1024 / 1024), // MB
    limit: Math.round(limit / 1024 / 1024), // MB
    percent: parseFloat(percent.toFixed(2)),
    rss: Math.round((memory.rss || 0) / 1024 / 1024), // MB
    cache: Math.round((memory.cache || 0) / 1024 / 1024) // MB
  };
}

/**
 * Calcul du réseau
 */
function calculateNetwork(stats) {
  const network = stats.network;

  if (!network || !network.interfaces) {
    return { rxBytes: 0, txBytes: 0, rxPackets: 0, txPackets: 0 };
  }

  let totalRx = 0;
  let totalTx = 0;
  let totalRxPackets = 0;
  let totalTxPackets = 0;

  network.interfaces.forEach(iface => {
    totalRx += iface.rx_bytes || 0;
    totalTx += iface.tx_bytes || 0;
    totalRxPackets += iface.rx_packets || 0;
    totalTxPackets += iface.tx_packets || 0;
  });

  return {
    rxBytes: Math.round(totalRx / 1024 / 1024), // MB
    txBytes: Math.round(totalTx / 1024 / 1024), // MB
    rxPackets: totalRxPackets,
    txPackets: totalTxPackets
  };
}

/**
 * Récupère le nom du conteneur depuis Docker
 */
async function getContainerName(containerId) {
  try {
    const Docker = require('dockerode');
    const docker = new Docker({ socketPath: '/var/run/docker.sock' });
    const container = docker.getContainer(containerId);
    const info = await container.inspect();
    return info.Name.replace('/', '');
  } catch (err) {
    return containerId.substring(0, 12);
  }
}

module.exports = { collect };
