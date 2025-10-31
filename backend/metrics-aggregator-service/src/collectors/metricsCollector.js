/**
 * Collecteur de Métriques
 * Récupère les métriques de Prometheus et les stocke dans PostgreSQL
 */

const { PrismaClient } = require('@prisma/client');
const prometheusService = require('../services/prometheus.service');
const dockerService = require('../services/docker.service');

const prisma = new PrismaClient();

class MetricsCollector {
  constructor() {
    this.isCollecting = false;
    this.collectionInterval = parseInt(process.env.METRICS_COLLECTION_INTERVAL || '300000'); // 5 min par défaut
  }

  /**
   * Démarrer la collecte périodique
   */
  start() {
    console.log(`🚀 Démarrage du collecteur de métriques (intervalle: ${this.collectionInterval / 1000}s)`);
    
    // Première collecte immédiate
    this.collect();
    
    // Collecte périodique
    this.intervalId = setInterval(() => {
      this.collect();
    }, this.collectionInterval);
  }

  /**
   * Arrêter la collecte
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      console.log('⏸️  Collecteur de métriques arrêté');
    }
  }

  /**
   * Collecter toutes les métriques
   */
  async collect() {
    if (this.isCollecting) {
      console.log('⚠️  Collecte déjà en cours, skip...');
      return;
    }

    this.isCollecting = true;
    const timestamp = new Date();
    
    try {
      console.log(`📊 Collecte des métriques à ${timestamp.toISOString()}`);
      
      // Collecter en parallèle
      await Promise.all([
        this.collectSystemMetrics(timestamp),
        this.collectContainerMetrics(timestamp)
      ]);
      
      console.log('✅ Collecte terminée avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la collecte:', error);
      
      // Enregistrer l'erreur comme événement
      await this.createSystemEvent({
        type: 'SYSTEM_ERROR',
        severity: 'ERROR',
        source: 'metricsCollector',
        title: 'Erreur de collecte des métriques',
        description: error.message,
        metadata: {
          stack: error.stack
        }
      });
    } finally {
      this.isCollecting = false;
    }
  }

  /**
   * Collecter les métriques système
   */
  async collectSystemMetrics(timestamp) {
    try {
      // Récupérer depuis Prometheus
      const metrics = await prometheusService.getSystemMetrics();
      
      if (!metrics) {
        console.warn('⚠️  Aucune métrique système disponible');
        return;
      }

      // Sauvegarder dans la DB
      await prisma.systemMetricsSnapshot.create({
        data: {
          timestamp,
          cpuUsagePercent: metrics.cpu_percent || 0,
          cpuCores: metrics.cpu_cores || 0,
          cpuLoadAverage1m: metrics.load_average_1m || null,
          cpuLoadAverage5m: metrics.load_average_5m || null,
          cpuLoadAverage15m: metrics.load_average_15m || null,
          memoryUsagePercent: metrics.memory_percent || 0,
          memoryUsedBytes: BigInt(metrics.memory_used_bytes || 0),
          memoryTotalBytes: BigInt(metrics.memory_total_bytes || 0),
          memoryFreeBytes: BigInt(metrics.memory_free_bytes || 0),
          diskUsagePercent: metrics.disk_percent || null,
          diskUsedBytes: metrics.disk_used_bytes ? BigInt(metrics.disk_used_bytes) : null,
          diskTotalBytes: metrics.disk_total_bytes ? BigInt(metrics.disk_total_bytes) : null,
          diskFreeBytes: metrics.disk_free_bytes ? BigInt(metrics.disk_free_bytes) : null,
          networkRxBytes: metrics.network_rx_bytes ? BigInt(metrics.network_rx_bytes) : null,
          networkTxBytes: metrics.network_tx_bytes ? BigInt(metrics.network_tx_bytes) : null
        }
      });

      // Vérifier les seuils d'alerte
      await this.checkSystemAlerts(metrics);
      
      console.log('  ✓ Métriques système collectées');
    } catch (error) {
      console.error('  ✗ Erreur collecte système:', error.message);
      throw error;
    }
  }

  /**
   * Collecter les métriques par conteneur
   */
  async collectContainerMetrics(timestamp) {
    try {
      // Récupérer la liste des conteneurs JobbingTrack
      const containers = await dockerService.getJobbingTrackContainers();
      
      if (!containers || containers.length === 0) {
        console.warn('⚠️  Aucun conteneur JobbingTrack trouvé');
        return;
      }

      // Collecter les métriques pour chaque conteneur
      const metricsPromises = containers.map(async (container) => {
        try {
          const stats = await dockerService.getContainerStats(container.name);
          
          if (!stats) {
            return null;
          }

          return prisma.containerMetricsSnapshot.create({
            data: {
              timestamp,
              containerName: container.name,
              containerId: container.id,
              status: container.status,
              cpuUsagePercent: stats.cpu_percent || null,
              cpuUsageNano: stats.cpu_usage_nano ? BigInt(stats.cpu_usage_nano) : null,
              memoryUsagePercent: stats.memory_percent || null,
              memoryUsageBytes: stats.memory_usage_bytes ? BigInt(stats.memory_usage_bytes) : null,
              memoryLimitBytes: stats.memory_limit_bytes ? BigInt(stats.memory_limit_bytes) : null,
              networkRxBytes: stats.network_rx_bytes ? BigInt(stats.network_rx_bytes) : null,
              networkTxBytes: stats.network_tx_bytes ? BigInt(stats.network_tx_bytes) : null,
              blockReadBytes: stats.block_read_bytes ? BigInt(stats.block_read_bytes) : null,
              blockWriteBytes: stats.block_write_bytes ? BigInt(stats.block_write_bytes) : null,
              image: container.image || null,
              labels: container.labels || null
            }
          });
        } catch (error) {
          console.error(`  ✗ Erreur pour ${container.name}:`, error.message);
          return null;
        }
      });

      const results = await Promise.all(metricsPromises);
      const collected = results.filter(r => r !== null).length;
      
      console.log(`  ✓ Métriques conteneurs collectées (${collected}/${containers.length})`);
    } catch (error) {
      console.error('  ✗ Erreur collecte conteneurs:', error.message);
      throw error;
    }
  }

  /**
   * Vérifier les seuils d'alerte système
   */
  async checkSystemAlerts(metrics) {
    try {
      // Récupérer les seuils actifs
      const thresholds = await prisma.alertThreshold.findMany({
        where: {
          isEnabled: true,
          targetType: 'system'
        }
      });

      for (const threshold of thresholds) {
        let currentValue = null;
        let metricName = '';

        // Récupérer la valeur actuelle selon le type de métrique
        switch (threshold.metricType) {
          case 'cpu_usage':
            currentValue = metrics.cpu_percent;
            metricName = 'CPU';
            break;
          case 'memory_usage':
            currentValue = metrics.memory_percent;
            metricName = 'Mémoire';
            break;
          case 'disk_usage':
            currentValue = metrics.disk_percent;
            metricName = 'Disque';
            break;
          default:
            continue;
        }

        if (currentValue === null || currentValue === undefined) {
          continue;
        }

        // Vérifier seuil critique
        if (threshold.criticalThreshold && currentValue >= threshold.criticalThreshold) {
          await this.createSystemEvent({
            type: `HIGH_${threshold.metricType.toUpperCase()}`,
            severity: 'CRITICAL',
            source: 'system',
            title: `${metricName} critique`,
            description: `Usage ${metricName}: ${currentValue.toFixed(2)}% (seuil: ${threshold.criticalThreshold}%)`,
            isAlert: true,
            metadata: {
              thresholdId: threshold.id,
              thresholdName: threshold.name,
              currentValue,
              threshold: threshold.criticalThreshold
            }
          });
        }
        // Vérifier seuil warning
        else if (threshold.warningThreshold && currentValue >= threshold.warningThreshold) {
          await this.createSystemEvent({
            type: `HIGH_${threshold.metricType.toUpperCase()}`,
            severity: 'WARNING',
            source: 'system',
            title: `${metricName} élevé`,
            description: `Usage ${metricName}: ${currentValue.toFixed(2)}% (seuil: ${threshold.warningThreshold}%)`,
            isAlert: true,
            metadata: {
              thresholdId: threshold.id,
              thresholdName: threshold.name,
              currentValue,
              threshold: threshold.warningThreshold
            }
          });
        }
      }
    } catch (error) {
      console.error('Erreur vérification alertes:', error);
    }
  }

  /**
   * Créer un événement système
   */
  async createSystemEvent(eventData) {
    try {
      await prisma.systemEvent.create({
        data: eventData
      });
    } catch (error) {
      console.error('Erreur création événement:', error);
    }
  }

  /**
   * Nettoyer les anciennes données (à exécuter quotidiennement)
   */
  async cleanup() {
    console.log('🧹 Nettoyage des anciennes métriques...');
    
    const now = new Date();
    const retentionDays = {
      systemMetrics: parseInt(process.env.SYSTEM_METRICS_RETENTION_DAYS || '90'),
      containerMetrics: parseInt(process.env.CONTAINER_METRICS_RETENTION_DAYS || '30'),
      logs: parseInt(process.env.LOGS_RETENTION_DAYS || '30')
    };

    try {
      // Supprimer les anciens snapshots système
      const systemDeleted = await prisma.systemMetricsSnapshot.deleteMany({
        where: {
          timestamp: {
            lt: new Date(now.getTime() - retentionDays.systemMetrics * 24 * 60 * 60 * 1000)
          }
        }
      });

      // Supprimer les anciens snapshots conteneurs
      const containerDeleted = await prisma.containerMetricsSnapshot.deleteMany({
        where: {
          timestamp: {
            lt: new Date(now.getTime() - retentionDays.containerMetrics * 24 * 60 * 60 * 1000)
          }
        }
      });

      // Supprimer les anciens logs
      const logsDeleted = await prisma.aggregatedLog.deleteMany({
        where: {
          timestamp: {
            lt: new Date(now.getTime() - retentionDays.logs * 24 * 60 * 60 * 1000)
          }
        }
      });

      console.log(`✅ Nettoyage terminé:`);
      console.log(`  - Snapshots système: ${systemDeleted.count}`);
      console.log(`  - Snapshots conteneurs: ${containerDeleted.count}`);
      console.log(`  - Logs: ${logsDeleted.count}`);
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage:', error);
    }
  }

  /**
   * Calculer les statistiques quotidiennes (à exécuter à minuit)
   */
  async calculateDailyStats() {
    console.log('📊 Calcul des statistiques quotidiennes...');
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const today = new Date(yesterday);
    today.setDate(today.getDate() + 1);

    try {
      // Récupérer les métriques d'hier
      const systemMetrics = await prisma.systemMetricsSnapshot.findMany({
        where: {
          timestamp: {
            gte: yesterday,
            lt: today
          }
        }
      });

      if (systemMetrics.length === 0) {
        console.warn('⚠️  Aucune métrique pour calculer les stats quotidiennes');
        return;
      }

      // Calculer les moyennes et max
      const avgCpu = systemMetrics.reduce((sum, m) => sum + m.cpuUsagePercent, 0) / systemMetrics.length;
      const maxCpu = Math.max(...systemMetrics.map(m => m.cpuUsagePercent));
      const avgMemory = systemMetrics.reduce((sum, m) => sum + m.memoryUsagePercent, 0) / systemMetrics.length;
      const maxMemory = Math.max(...systemMetrics.map(m => m.memoryUsagePercent));
      
      const diskMetrics = systemMetrics.filter(m => m.diskUsagePercent !== null);
      const avgDisk = diskMetrics.length > 0
        ? diskMetrics.reduce((sum, m) => sum + m.diskUsagePercent, 0) / diskMetrics.length
        : null;

      // Compter les conteneurs
      const containerStats = await prisma.containerMetricsSnapshot.groupBy({
        by: ['containerName', 'status'],
        where: {
          timestamp: {
            gte: yesterday,
            lt: today
          }
        }
      });

      const totalContainers = new Set(containerStats.map(c => c.containerName)).size;
      const runningContainers = containerStats.filter(c => c.status === 'running').length;

      // Compter les événements
      const events = await prisma.systemEvent.findMany({
        where: {
          timestamp: {
            gte: yesterday,
            lt: today
          }
        }
      });

      const totalEvents = events.length;
      const totalAlerts = events.filter(e => e.isAlert).length;
      const unresolvedAlerts = events.filter(e => e.isAlert && !e.isResolved).length;

      // Compter les logs
      const logs = await prisma.aggregatedLog.groupBy({
        by: ['level'],
        where: {
          timestamp: {
            gte: yesterday,
            lt: today
          }
        },
        _count: true
      });

      const totalLogs = logs.reduce((sum, l) => sum + l._count, 0);
      const errorLogs = logs.find(l => l.level === 'ERROR')?._count || 0;
      const warningLogs = logs.find(l => l.level === 'WARN')?._count || 0;

      // Créer ou mettre à jour les stats quotidiennes
      await prisma.dailyStats.upsert({
        where: { date: yesterday },
        create: {
          date: yesterday,
          avgCpuUsagePercent: avgCpu,
          maxCpuUsagePercent: maxCpu,
          avgMemoryUsagePercent: avgMemory,
          maxMemoryUsagePercent: maxMemory,
          avgDiskUsagePercent: avgDisk,
          totalContainers,
          runningContainers,
          stoppedContainers: totalContainers - runningContainers,
          totalEvents,
          totalAlerts,
          unresolvedAlerts,
          totalLogs,
          errorLogs,
          warningLogs
        },
        update: {
          avgCpuUsagePercent: avgCpu,
          maxCpuUsagePercent: maxCpu,
          avgMemoryUsagePercent: avgMemory,
          maxMemoryUsagePercent: maxMemory,
          avgDiskUsagePercent: avgDisk,
          totalContainers,
          runningContainers,
          stoppedContainers: totalContainers - runningContainers,
          totalEvents,
          totalAlerts,
          unresolvedAlerts,
          totalLogs,
          errorLogs,
          warningLogs
        }
      });

      console.log('✅ Statistiques quotidiennes calculées');
    } catch (error) {
      console.error('❌ Erreur calcul stats quotidiennes:', error);
    }
  }
}

module.exports = new MetricsCollector();
