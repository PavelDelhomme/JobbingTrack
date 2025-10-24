const os = require('os');

/**
 * Collecte les métriques système globales
 */
async function collect() {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  // Calcul CPU moyen
  let totalIdle = 0;
  let totalTick = 0;

  cpus.forEach(cpu => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });

  const idle = totalIdle / cpus.length;
  const total = totalTick / cpus.length;
  const cpuPercent = 100 - ~~(100 * idle / total);

  return {
    cpu: {
      percent: cpuPercent,
      cores: cpus.length,
      model: cpus[0].model
    },
    memory: {
      total: Math.round(totalMem / 1024 / 1024), // MB
      used: Math.round(usedMem / 1024 / 1024),
      free: Math.round(freeMem / 1024 / 1024),
      percent: parseFloat(((usedMem / totalMem) * 100).toFixed(2))
    },
    uptime: os.uptime(),
    platform: os.platform(),
    hostname: os.hostname()
  };
}

module.exports = { collect };
