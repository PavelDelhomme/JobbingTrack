const axios = require('axios');
const { exec } = require('child_process');
const { promisify } = require('util');
const { decorateContainerHealth, summarizeContainersForBackoffice } = require('./serviceHealthModel');
const { normalizeDockerMemoryBytes } = require('./memoryBudget');

const execAsync = promisify(exec);

/**
 * Service pour interagir avec Docker et récupérer les métriques des conteneurs
 */
class DockerService {
  constructor() {
    this.dockerHost = process.env.DOCKER_HOST || '/var/run/docker.sock';
    this.useDockerCLI = true; // Utiliser Docker CLI par défaut
  }

  /**
   * Récupère la liste de tous les conteneurs en cours d'exécution
   * @returns {Promise<Array>} Liste des conteneurs
   */
  async listContainers() {
    try {
      const { stdout } = await execAsync('docker ps --format "{{json .}}"');
      const containers = stdout.trim().split('\n')
        .filter(line => line.length > 0)
        .map(line => JSON.parse(line));
      
      return containers;
    } catch (error) {
      console.error('[Docker] Erreur listContainers:', error.message);
      return [];
    }
  }

  /**
   * Conteneurs JobbingTrack en cours d'exécution (préfixe jobbingtrack-).
   */
  async getJobbingTrackContainers() {
    const containers = await this.listContainers();
    return containers
      .map((row) => {
        const rawName = row.Names || row.names || row.name || '';
        const name = String(rawName).replace(/^\//, '').trim();
        return {
          id: row.ID || row.Id || row.id,
          name,
          status: row.Status || row.status || 'running',
          image: row.Image || row.image || null,
          labels: row.Labels || row.labels || null,
        };
      })
      .filter((container) => container.name && container.name.startsWith('jobbingtrack-'));
  }

  /**
   * Récupère les statistiques d'un conteneur spécifique
   * @param {string} containerName - Nom ou ID du conteneur
   * @returns {Promise<Object>} Statistiques du conteneur
   */
  async getContainerStats(containerName) {
    try {
      const { stdout } = await execAsync(`docker stats ${containerName} --no-stream --format "{{json .}}"`);
      const stats = JSON.parse(stdout.trim());
      
      const memoryUsage = this.parseMemory(stats.MemUsage.split('/')[0].trim());
      const memoryLimitRaw = this.parseMemory(stats.MemUsage.split('/')[1].trim());
      const normalizedMemory = normalizeDockerMemoryBytes({
        containerName: stats.Name,
        usageBytes: memoryUsage,
        observedLimitBytes: memoryLimitRaw,
      });

      // Convertir les valeurs en format utilisable
      return {
        name: stats.Name,
        cpu_percent: parseFloat(stats.CPUPerc.replace('%', '')),
        memory_usage: memoryUsage,
        memory_limit: normalizedMemory.limitBytes,
        memory_percent: normalizedMemory.percent,
        memory_limit_source: normalizedMemory.limitSource,
        memory_raw_limit: memoryLimitRaw,
        memory_stack_limit_mb: normalizedMemory.stackLimitMb,
        memory_service_budget_mb: normalizedMemory.serviceBudgetMb,
        network_rx: this.parseBytes(stats.NetIO.split('/')[0].trim()),
        network_tx: this.parseBytes(stats.NetIO.split('/')[1].trim()),
        block_read: this.parseBytes(stats.BlockIO.split('/')[0].trim()),
        block_write: this.parseBytes(stats.BlockIO.split('/')[1].trim()),
        pids: parseInt(stats.PIDs)
      };
    } catch (error) {
      console.error(`[Docker] Erreur getContainerStats pour ${containerName}:`, error.message);
      throw error;
    }
  }

  /**
   * Récupère les statistiques de tous les conteneurs
   * @returns {Promise<Array>} Statistiques de tous les conteneurs
   */
  async getAllContainersStats() {
    try {
      const { stdout } = await execAsync('docker stats --no-stream --format "{{json .}}"');
      return stdout.trim().split('\n')
        .filter(line => line.length > 0)
        .map(line => JSON.parse(line))
        .map(stats => {
          const containerName = stats.Name || stats.Container;
          const memUsageParts = String(stats.MemUsage || '0B / 0B').split('/');
          const memoryUsage = this.parseMemory(memUsageParts[0].trim());
          const memoryLimitRaw = this.parseMemory(memUsageParts[1]?.trim() || '0B');
          const normalizedMemory = normalizeDockerMemoryBytes({
            containerName,
            usageBytes: memoryUsage,
            observedLimitBytes: memoryLimitRaw,
          });

          return {
            name: containerName,
            cpu_percent: parseFloat(String(stats.CPUPerc || '0').replace('%', '')),
            memory_usage: memoryUsage,
            memory_limit: normalizedMemory.limitBytes,
            memory_percent: normalizedMemory.percent,
            memory_limit_source: normalizedMemory.limitSource,
            memory_raw_limit: memoryLimitRaw,
            memory_stack_limit_mb: normalizedMemory.stackLimitMb,
            memory_service_budget_mb: normalizedMemory.serviceBudgetMb,
            network_rx: this.parseBytes(String(stats.NetIO || '0B / 0B').split('/')[0].trim()),
            network_tx: this.parseBytes(String(stats.NetIO || '0B / 0B').split('/')[1]?.trim() || '0B'),
            block_read: this.parseBytes(String(stats.BlockIO || '0B / 0B').split('/')[0].trim()),
            block_write: this.parseBytes(String(stats.BlockIO || '0B / 0B').split('/')[1]?.trim() || '0B'),
            pids: parseInt(stats.PIDs || '0', 10)
          };
        });
    } catch (error) {
      console.error('[Docker] Erreur getAllContainersStats:', error.message);
      return [];
    }
  }

  /**
   * Récupère les informations système globales
   * @returns {Promise<Object>} Informations système
   */
  async getSystemInfo() {
    try {
      const { stdout } = await execAsync('docker info --format "{{json .}}"');
      const info = JSON.parse(stdout);
      
      return {
        containers: info.Containers,
        containers_running: info.ContainersRunning,
        containers_paused: info.ContainersPaused,
        containers_stopped: info.ContainersStopped,
        images: info.Images,
        server_version: info.ServerVersion,
        operating_system: info.OperatingSystem,
        os_type: info.OSType,
        architecture: info.Architecture,
        cpus: info.NCPU,
        memory_total: info.MemTotal,
        docker_root_dir: info.DockerRootDir,
        driver: info.Driver,
        kernel_version: info.KernelVersion
      };
    } catch (error) {
      console.error('[Docker] Erreur getSystemInfo:', error.message);
      throw error;
    }
  }

  /**
   * Parse une chaîne de mémoire (ex: "1.5GiB") en bytes
   * @param {string} memStr - Chaîne de mémoire
   * @returns {number} Mémoire en bytes
   */
  parseMemory(memStr) {
    const units = {
      'B': 1,
      'KiB': 1024,
      'MiB': 1024 * 1024,
      'GiB': 1024 * 1024 * 1024,
      'TiB': 1024 * 1024 * 1024 * 1024
    };

    const match = memStr.match(/^([\d.]+)\s*(\w+)$/);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2];

    return value * (units[unit] || 1);
  }

  /**
   * Parse une chaîne de bytes (ex: "1.5MB") en bytes
   * @param {string} byteStr - Chaîne de bytes
   * @returns {number} Bytes
   */
  parseBytes(byteStr) {
    const units = {
      'B': 1,
      'kB': 1000,
      'MB': 1000 * 1000,
      'GB': 1000 * 1000 * 1000,
      'TB': 1000 * 1000 * 1000 * 1000,
      'KiB': 1024,
      'MiB': 1024 * 1024,
      'GiB': 1024 * 1024 * 1024,
      'TiB': 1024 * 1024 * 1024 * 1024
    };

    const match = byteStr.match(/^([\d.]+)\s*(\w+)$/);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2];

    return value * (units[unit] || 1);
  }

  /**
   * Formatte les statistiques pour l'API
   * @param {Array} stats - Statistiques brutes
   * @returns {Object} Statistiques formatées
   */
  formatStatsForAPI(stats) {
    const decorated = (stats || []).map(stat => decorateContainerHealth(stat));
    return {
      success: true,
      timestamp: new Date().toISOString(),
      containers_count: decorated.length,
      health_summary: summarizeContainersForBackoffice(decorated),
      containers: decorated.map(stat => ({
        name: stat.name,
        status: stat.status,
        is_running: stat.is_running,
        health_status: stat.health_status,
        health_bucket: stat.health_bucket,
        cpu: {
          percent: stat.cpu_percent,
          usage: stat.cpu_percent
        },
        memory: {
          usage: stat.memory_usage,
          limit: stat.memory_limit,
          percent: stat.memory_percent,
          limit_source: stat.memory_limit_source,
          raw_limit: stat.memory_raw_limit,
          stack_limit_mb: stat.memory_stack_limit_mb,
          service_budget_mb: stat.memory_service_budget_mb
        },
        network: {
          rx_bytes: stat.network_rx,
          tx_bytes: stat.network_tx
        },
        block_io: {
          read_bytes: stat.block_read,
          write_bytes: stat.block_write
        },
        pids: stat.pids
      }))
    };
  }

  /**
   * Formatte les informations système pour l'API
   * @param {Object} info - Informations système brutes
   * @returns {Object} Informations système formatées
   */
  formatSystemInfoForAPI(info) {
    return {
      success: true,
      timestamp: new Date().toISOString(),
      system: {
        containers: {
          total: info.containers,
          running: info.containers_running,
          paused: info.containers_paused,
          stopped: info.containers_stopped
        },
        images: info.images,
        server_version: info.server_version,
        operating_system: info.operating_system,
        os_type: info.os_type,
        architecture: info.architecture,
        cpus: info.cpus,
        memory_total: info.memory_total,
        docker_root_dir: info.docker_root_dir,
        storage_driver: info.driver,
        kernel_version: info.kernel_version
      }
    };
  }
}

module.exports = new DockerService();
