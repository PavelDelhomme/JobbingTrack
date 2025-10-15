const { prisma } = require('../config/database');
const { logger } = require('../utils/logger');
const os = require('os-utils');
const si = require('systeminformation');

class MetricsService {
  // Récupérer les métriques système détaillées
  async getSystemMetrics() {
    try {
      // Récupérer les vraies métriques système
      const cpuUsage = await this.getCpuUsage();
      const memoryUsage = await this.getMemoryUsage();
      const diskUsage = await this.getDiskUsage();
      const networkStats = await this.getNetworkStats();

      // Stocker les métriques en base de données
      await this.storeResourceMetrics({
        cpuUsage,
        memoryUsage,
        diskUsage,
        networkIn: networkStats.in,
        networkOut: networkStats.out
      });

      return {
        cpuUsage,
        memoryUsage,
        diskUsage,
        networkIn: networkStats.in,
        networkOut: networkStats.out,
        loadAverage: os.loadavg(1),
        uptime: os.uptime()
      };
    } catch (error) {
      logger.error('Erreur lors de la récupération des métriques système:', error);
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        networkIn: 0,
        networkOut: 0,
        loadAverage: 0,
        uptime: 0
      };
    }
  }

  // Récupérer l'utilisation CPU
  async getCpuUsage() {
    return new Promise((resolve) => {
      os.cpuUsage((percentage) => {
        resolve(Math.round(percentage * 100));
      });
    });
  }

  // Récupérer l'utilisation mémoire
  async getMemoryUsage() {
    try {
      const memData = await si.mem();
      const usedPercentage = (memData.used / memData.total) * 100;
      return Math.round(usedPercentage);
    } catch (error) {
      logger.error('Erreur lors de la récupération de l\'utilisation mémoire:', error);
      return 0;
    }
  }

  // Récupérer l'utilisation disque
  async getDiskUsage() {
    try {
      const diskData = await si.fsSize();
      if (diskData.length > 0) {
        const total = diskData[0].size;
        const used = diskData[0].used;
        return Math.round((used / total) * 100);
      }
      return 0;
    } catch (error) {
      logger.error('Erreur lors de la récupération de l\'utilisation disque:', error);
      return 0;
    }
  }

  // Récupérer les statistiques réseau
  async getNetworkStats() {
    try {
      const networkData = await si.networkStats();
      if (networkData.length > 0) {
        const stats = networkData[0];
        return {
          in: stats.rx_bytes || 0,
          out: stats.tx_bytes || 0
        };
      }
      return { in: 0, out: 0 };
    } catch (error) {
      logger.error('Erreur lors de la récupération des statistiques réseau:', error);
      return { in: 0, out: 0 };
    }
  }

  // Stocker les métriques de ressources
  async storeResourceMetrics(metrics) {
    try {
      await prisma.resourceMetric.create({
        data: {
          cpuUsage: metrics.cpuUsage,
          memoryUsage: metrics.memoryUsage,
          memoryUsed: BigInt(0), // À calculer si nécessaire
          memoryTotal: BigInt(0),
          diskUsage: metrics.diskUsage,
          networkIn: BigInt(metrics.networkIn),
          networkOut: BigInt(metrics.networkOut),
          loadAverage: metrics.loadAverage
        }
      });
    } catch (error) {
      logger.error('Erreur lors du stockage des métriques de ressources:', error);
    }
  }

  // Récupérer les métriques de performance des endpoints
  async getEndpointMetrics() {
    try {
      // Récupérer les métriques récentes de performance
      const recentMetrics = await prisma.performanceMetric.findMany({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Dernières 24h
          }
        },
        orderBy: { timestamp: 'desc' },
        take: 1000
      });

      // Analyser les métriques par endpoint
      const endpointStats = {};

      recentMetrics.forEach(metric => {
        const key = `${metric.method} ${metric.endpoint}`;

        if (!endpointStats[key]) {
          endpointStats[key] = {
            totalRequests: 0,
            totalResponseTime: 0,
            minResponseTime: Infinity,
            maxResponseTime: 0,
            errors: 0,
            success: 0
          };
        }

        const stats = endpointStats[key];
        stats.totalRequests++;
        stats.totalResponseTime += metric.responseTime;
        stats.minResponseTime = Math.min(stats.minResponseTime, metric.responseTime);
        stats.maxResponseTime = Math.max(stats.maxResponseTime, metric.responseTime);

        if (metric.statusCode >= 400) {
          stats.errors++;
        } else {
          stats.success++;
        }
      });

      // Calculer les moyennes et pourcentages
      Object.keys(endpointStats).forEach(key => {
        const stats = endpointStats[key];
        stats.averageResponseTime = Math.round(stats.totalResponseTime / stats.totalRequests);
        stats.successRate = Math.round((stats.success / stats.totalRequests) * 100);
        stats.errorRate = Math.round((stats.errors / stats.totalRequests) * 100);
        delete stats.totalResponseTime;
      });

      // Trouver l'endpoint le plus utilisé et le plus lent
      const mostUsed = Object.entries(endpointStats).sort(([,a], [,b]) => b.totalRequests - a.totalRequests)[0];
      const slowest = Object.entries(endpointStats).sort(([,a], [,b]) => b.averageResponseTime - a.averageResponseTime)[0];

      return {
        endpointStats,
        mostUsedEndpoint: mostUsed ? mostUsed[0] : null,
        slowestEndpoint: slowest ? slowest[0] : null,
        requestsPerSecond: Math.round(recentMetrics.length / 86400), // Moyenne par seconde sur 24h
        totalRequests: recentMetrics.length
      };
    } catch (error) {
      logger.error('Erreur lors de la récupération des métriques d\'endpoints:', error);
      return {
        endpointStats: {},
        mostUsedEndpoint: null,
        slowestEndpoint: null,
        requestsPerSecond: 0,
        totalRequests: 0
      };
    }
  }

  // Enregistrer une métrique de performance
  async recordPerformanceMetric(endpoint, method, responseTime, statusCode, requestSize, responseSize, userAgent, ipAddress, userId) {
    try {
      await prisma.performanceMetric.create({
        data: {
          endpoint,
          method,
          responseTime,
          statusCode,
          requestSize,
          responseSize,
          userAgent,
          ipAddress,
          userId
        }
      });
    } catch (error) {
      logger.error('Erreur lors de l\'enregistrement de la métrique de performance:', error);
    }
  }

  // Récupérer les métriques système historiques
  async getSystemMetricsHistory(hours = 24) {
    try {
      const startDate = new Date();
      startDate.setHours(startDate.getHours() - hours);

      const metrics = await prisma.systemMetric.findMany({
        where: {
          timestamp: {
            gte: startDate
          }
        },
        orderBy: { timestamp: 'asc' }
      });

      return metrics;
    } catch (error) {
      logger.error('Erreur lors de la récupération de l\'historique des métriques système:', error);
      return [];
    }
  }

  // Récupérer les métriques de performance historiques
  async getPerformanceMetricsHistory(hours = 24) {
    try {
      const startDate = new Date();
      startDate.setHours(startDate.getHours() - hours);

      const metrics = await prisma.performanceMetric.findMany({
        where: {
          timestamp: {
            gte: startDate
          }
        },
        orderBy: { timestamp: 'asc' }
      });

      return metrics;
    } catch (error) {
      logger.error('Erreur lors de la récupération de l\'historique des métriques de performance:', error);
      return [];
    }
  }

  // Nettoyer les anciennes métriques
  async cleanupOldMetrics(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const [deletedSystemMetrics, deletedPerformanceMetrics, deletedResourceMetrics] = await Promise.all([
        prisma.systemMetric.deleteMany({
          where: {
            timestamp: {
              lt: cutoffDate
            }
          }
        }),
        prisma.performanceMetric.deleteMany({
          where: {
            timestamp: {
              lt: cutoffDate
            }
          }
        }),
        prisma.resourceMetric.deleteMany({
          where: {
            timestamp: {
              lt: cutoffDate
            }
          }
        })
      ]);

      logger.info(`Nettoyage des métriques: ${deletedSystemMetrics.count} système, ${deletedPerformanceMetrics.count} performance, ${deletedResourceMetrics.count} ressources supprimées`);

      return {
        systemMetrics: deletedSystemMetrics.count,
        performanceMetrics: deletedPerformanceMetrics.count,
        resourceMetrics: deletedResourceMetrics.count
      };
    } catch (error) {
      logger.error('Erreur lors du nettoyage des métriques:', error);
      throw error;
    }
  }
}

module.exports = new MetricsService();
