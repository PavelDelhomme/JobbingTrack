const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });
const { normalizeDockerMemoryBytes } = require('./memoryBudget');

/**
 * Service de collecte des logs Docker
 */
class DockerLogsService {
  
  /**
   * Récupérer les logs d'un conteneur
   */
  async getContainerLogs(containerName, options = {}) {
    try {
      const {
        since = 0, // timestamp ou durée (ex: '1h')
        until = Math.floor(Date.now() / 1000),
        tail = 100,
        timestamps = true,
        stdout = true,
        stderr = true,
      } = options;

      // Trouver le conteneur
      const containers = await docker.listContainers({ all: true });
      const containerInfo = containers.find(c => 
        c.Names.some(name => name.includes(containerName))
      );

      if (!containerInfo) {
        throw new Error(`Conteneur non trouvé: ${containerName}`);
      }

      const container = docker.getContainer(containerInfo.Id);
      
      // Récupérer les logs
      const logs = await container.logs({
        stdout,
        stderr,
        timestamps,
        since,
        until,
        tail,
      });

      // Parser les logs Docker
      const parsedLogs = this.parseDockerLogs(logs, containerInfo.Names[0]);
      
      return parsedLogs;
    } catch (error) {
      console.error(`[DOCKER-LOGS] Erreur récupération logs ${containerName}:`, error.message);
      throw error;
    }
  }

  /**
   * Récupérer les logs de tous les conteneurs JobbingTrack
   */
  async getAllJobbingTrackLogs(options = {}) {
    try {
      const containers = await docker.listContainers({ all: false });
      const jobbingtrackContainers = containers.filter(c =>
        c.Names.some(name => name.toLowerCase().includes('jobbingtrack'))
      );

      const allLogs = {};

      for (const containerInfo of jobbingtrackContainers) {
        const containerName = containerInfo.Names[0].replace(/^\//, '');
        
        try {
          const logs = await this.getContainerLogs(containerName, options);
          allLogs[containerName] = logs;
        } catch (error) {
          console.error(`[DOCKER-LOGS] Échec récupération logs ${containerName}`);
          allLogs[containerName] = [];
        }
      }

      return allLogs;
    } catch (error) {
      console.error('[DOCKER-LOGS] Erreur récupération logs globaux:', error.message);
      throw error;
    }
  }

  /**
   * Parser les logs bruts Docker
   * Les logs Docker ont un format spécial avec headers
   */
  parseDockerLogs(buffer, containerName) {
    const logs = [];
    let offset = 0;

    while (offset < buffer.length) {
      // Docker log format: [header 8 bytes][payload]
      // header[0] = stream type (1=stdout, 2=stderr)
      // header[4-7] = size (big-endian)
      
      if (offset + 8 > buffer.length) break;

      const header = buffer.slice(offset, offset + 8);
      const streamType = header[0]; // 1 = stdout, 2 = stderr
      const size = header.readUInt32BE(4);
      
      offset += 8;
      
      if (offset + size > buffer.length) break;
      
      const payload = buffer.slice(offset, offset + size).toString('utf8');
      offset += size;

      // Extraire timestamp si présent
      const timestampMatch = payload.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s+(.*)$/);
      
      let timestamp = new Date();
      let logMessage = payload.trim();
      
      if (timestampMatch) {
        timestamp = new Date(timestampMatch[1]);
        logMessage = timestampMatch[2];
      }

      logs.push({
        timestamp,
        containerName,
        stream: streamType === 1 ? 'stdout' : 'stderr',
        log: logMessage,
      });
    }

    return logs;
  }

  /**
   * Stream des logs en temps réel
   */
  async streamContainerLogs(containerName, callback) {
    try {
      const containers = await docker.listContainers({ all: false });
      const containerInfo = containers.find(c => 
        c.Names.some(name => name.includes(containerName))
      );

      if (!containerInfo) {
        throw new Error(`Conteneur non trouvé: ${containerName}`);
      }

      const container = docker.getContainer(containerInfo.Id);
      
      const logStream = await container.logs({
        follow: true,
        stdout: true,
        stderr: true,
        timestamps: true,
      });

      let buffer = Buffer.alloc(0);

      logStream.on('data', (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);
        
        // Parser les logs complets du buffer
        let offset = 0;
        while (offset + 8 <= buffer.length) {
          const header = buffer.slice(offset, offset + 8);
          const streamType = header[0];
          const size = header.readUInt32BE(4);
          
          if (offset + 8 + size > buffer.length) {
            // Log incomplet, attendre plus de données
            break;
          }
          
          const payload = buffer.slice(offset + 8, offset + 8 + size).toString('utf8');
          offset += 8 + size;

          const timestampMatch = payload.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s+(.*)$/);
          
          const logEntry = {
            timestamp: timestampMatch ? new Date(timestampMatch[1]) : new Date(),
            containerName: containerInfo.Names[0].replace(/^\//, ''),
            stream: streamType === 1 ? 'stdout' : 'stderr',
            log: timestampMatch ? timestampMatch[2] : payload.trim(),
          };

          callback(logEntry);
        }

        // Garder les données non traitées
        buffer = buffer.slice(offset);
      });

      logStream.on('error', (error) => {
        console.error(`[DOCKER-LOGS] Erreur stream ${containerName}:`, error.message);
      });

      return logStream;
    } catch (error) {
      console.error(`[DOCKER-LOGS] Erreur stream ${containerName}:`, error.message);
      throw error;
    }
  }

  /**
   * Récupérer les stats d'un conteneur
   */
  async getContainerStats(containerName) {
    try {
      const containers = await docker.listContainers({ all: false });
      const containerInfo = containers.find(c => 
        c.Names.some(name => name.includes(containerName))
      );

      if (!containerInfo) {
        throw new Error(`Conteneur non trouvé: ${containerName}`);
      }

      const container = docker.getContainer(containerInfo.Id);
      const stats = await container.stats({ stream: false });

      return this.formatStats(stats, containerInfo);
    } catch (error) {
      console.error(`[DOCKER-LOGS] Erreur stats ${containerName}:`, error.message);
      throw error;
    }
  }

  /**
   * Formater les stats Docker
   */
  formatStats(stats, containerInfo) {
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100 : 0;

    const memoryUsage = stats.memory_stats.usage || 0;
    const memoryLimitRaw = stats.memory_stats.limit || 0;
    const normalizedMemory = normalizeDockerMemoryBytes({
      containerName: containerInfo.Names[0],
      usageBytes: memoryUsage,
      observedLimitBytes: memoryLimitRaw,
    });
    const memoryLimit = normalizedMemory.limitBytes;
    const memoryPercent = normalizedMemory.percent;

    return {
      containerId: containerInfo.Id,
      containerName: containerInfo.Names[0].replace(/^\//, ''),
      status: containerInfo.State,
      cpu: {
        percentage: parseFloat(cpuPercent.toFixed(2)),
        usage: stats.cpu_stats.cpu_usage.total_usage,
      },
      memory: {
        usage: memoryUsage,
        limit: memoryLimit,
        percentage: memoryPercent,
        limitSource: normalizedMemory.limitSource,
        rawObservedLimit: memoryLimitRaw,
        stackLimitMb: normalizedMemory.stackLimitMb,
        serviceBudgetMb: normalizedMemory.serviceBudgetMb,
      },
      network: {
        rx: stats.networks?.eth0?.rx_bytes || 0,
        tx: stats.networks?.eth0?.tx_bytes || 0,
      },
      blockIO: {
        read: stats.blkio_stats?.io_service_bytes_recursive?.find(o => o.op === 'Read')?.value || 0,
        write: stats.blkio_stats?.io_service_bytes_recursive?.find(o => o.op === 'Write')?.value || 0,
      },
      pids: stats.pids_stats?.current || 0,
    };
  }

  /**
   * Inspecter un conteneur
   */
  async inspectContainer(containerName) {
    try {
      const containers = await docker.listContainers({ all: true });
      const containerInfo = containers.find(c => 
        c.Names.some(name => name.includes(containerName))
      );

      if (!containerInfo) {
        throw new Error(`Conteneur non trouvé: ${containerName}`);
      }

      const container = docker.getContainer(containerInfo.Id);
      const inspection = await container.inspect();

      return {
        id: inspection.Id,
        name: inspection.Name.replace(/^\//, ''),
        image: inspection.Config.Image,
        status: inspection.State.Status,
        running: inspection.State.Running,
        startedAt: inspection.State.StartedAt,
        finishedAt: inspection.State.FinishedAt,
        restartCount: inspection.RestartCount,
        platform: inspection.Platform,
        environment: inspection.Config.Env,
        ports: inspection.NetworkSettings.Ports,
        mounts: inspection.Mounts.map(m => ({
          type: m.Type,
          source: m.Source,
          destination: m.Destination,
          mode: m.Mode,
        })),
        networks: Object.keys(inspection.NetworkSettings.Networks),
      };
    } catch (error) {
      console.error(`[DOCKER-LOGS] Erreur inspection ${containerName}:`, error.message);
      throw error;
    }
  }

  /**
   * Récupérer les événements Docker en temps réel
   */
  async streamDockerEvents(callback) {
    try {
      const eventStream = await docker.getEvents({
        filters: {
          type: ['container'],
        },
      });

      eventStream.on('data', (chunk) => {
        try {
          const events = chunk.toString().split('\n').filter(Boolean);
          events.forEach(eventStr => {
            try {
              const event = JSON.parse(eventStr);
              callback(event);
            } catch (e) {
              // Ignore parsing errors
            }
          });
        } catch (error) {
          console.error('[DOCKER-LOGS] Erreur parsing événement:', error.message);
        }
      });

      eventStream.on('error', (error) => {
        console.error('[DOCKER-LOGS] Erreur stream événements:', error.message);
      });

      return eventStream;
    } catch (error) {
      console.error('[DOCKER-LOGS] Erreur stream événements:', error.message);
      throw error;
    }
  }
}

module.exports = new DockerLogsService();

