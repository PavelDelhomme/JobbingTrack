const cron = require('node-cron');
const { logger } = require('../utils/logger');
const metricsService = require('./metricsService');

class MetricsScheduler {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  // Démarrer le planificateur
  start() {
    if (this.isRunning) {
      logger.warn('Le planificateur de métriques est déjà démarré');
      return;
    }

    this.isRunning = true;

    // Collecter les métriques système toutes les 30 secondes
    this.scheduleSystemMetricsCollection();

    // Collecter les métriques de performance toutes les minutes
    this.schedulePerformanceMetricsCollection();

    // Nettoyer les anciennes métriques quotidiennement
    this.scheduleCleanup();

    logger.info('Planificateur de métriques démarré avec succès');
  }

  // Arrêter le planificateur
  stop() {
    if (!this.isRunning) {
      return;
    }

    // Arrêter tous les jobs cron
    this.jobs.forEach((job, name) => {
      job.destroy();
      logger.info(`Job cron arrêté: ${name}`);
    });

    this.jobs.clear();
    this.isRunning = false;
    logger.info('Planificateur de métriques arrêté');
  }

  // Planifier la collecte de métriques système
  scheduleSystemMetricsCollection() {
    const job = cron.schedule('*/30 * * * * *', async () => {
      try {
        logger.debug('Collecte des métriques système...');

        const systemMetrics = await metricsService.getSystemMetrics();

        // Enregistrer les métriques système
        await metricsService.prisma.systemMetric.create({
          data: {
            metricType: 'system_overview',
            value: systemMetrics.cpuUsage,
            unit: 'percentage',
            component: 'cpu',
            metadata: {
              memoryUsage: systemMetrics.memoryUsage,
              diskUsage: systemMetrics.diskUsage,
              loadAverage: systemMetrics.loadAverage,
              uptime: systemMetrics.uptime
            }
          }
        });

        logger.debug(`Métriques système collectées: CPU=${systemMetrics.cpuUsage}%, Mémoire=${systemMetrics.memoryUsage}%`);
      } catch (error) {
        logger.error('Erreur lors de la collecte des métriques système:', error);
      }
    }, {
      scheduled: false
    });

    this.jobs.set('system-metrics-collection', job);
    job.start();
    logger.info('Job de collecte de métriques système planifié (toutes les 30 secondes)');
  }

  // Planifier la collecte de métriques de performance
  schedulePerformanceMetricsCollection() {
    const job = cron.schedule('* * * * *', async () => {
      try {
        logger.debug('Collecte des métriques de performance...');

        const endpointMetrics = await metricsService.getEndpointMetrics();

        // Enregistrer les métriques de performance
        await metricsService.prisma.systemMetric.create({
          data: {
            metricType: 'endpoint_performance',
            value: endpointMetrics.totalRequests,
            unit: 'requests',
            component: 'api',
            metadata: {
              requestsPerSecond: endpointMetrics.requestsPerSecond,
              mostUsedEndpoint: endpointMetrics.mostUsedEndpoint,
              slowestEndpoint: endpointMetrics.slowestEndpoint,
              endpointStats: endpointMetrics.endpointStats
            }
          }
        });

        logger.debug(`Métriques de performance collectées: ${endpointMetrics.totalRequests} requêtes, ${endpointMetrics.requestsPerSecond} req/s`);
      } catch (error) {
        logger.error('Erreur lors de la collecte des métriques de performance:', error);
      }
    }, {
      scheduled: false
    });

    this.jobs.set('performance-metrics-collection', job);
    job.start();
    logger.info('Job de collecte de métriques de performance planifié (toutes les minutes)');
  }

  // Planifier le nettoyage des anciennes métriques
  scheduleCleanup() {
    const job = cron.schedule('0 2 * * *', async () => {
      try {
        logger.debug('Nettoyage des anciennes métriques...');

        const deletedCount = await metricsService.cleanupOldMetrics(30); // Garder 30 jours

        logger.info(`Nettoyage terminé: ${deletedCount.systemMetrics} système, ${deletedCount.performanceMetrics} performance, ${deletedCount.resourceMetrics} ressources supprimées`);
      } catch (error) {
        logger.error('Erreur lors du nettoyage des métriques:', error);
      }
    }, {
      scheduled: false
    });

    this.jobs.set('cleanup', job);
    job.start();
    logger.info('Job de nettoyage planifié (quotidien à 2h)');
  }
}

// Gestion de l'arrêt propre du processus
process.on('SIGTERM', () => {
  logger.info('Signal SIGTERM reçu, arrêt du planificateur de métriques...');
  metricsScheduler.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Signal SIGINT reçu, arrêt du planificateur de métriques...');
  metricsScheduler.stop();
  process.exit(0);
});

const metricsScheduler = new MetricsScheduler();

module.exports = metricsScheduler;
