const cron = require('node-cron');
const { logger } = require('../utils/logger');
const deploymentService = require('./deploymentService');

class DeploymentScheduler {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  // Démarrer le planificateur
  start() {
    if (this.isRunning) {
      logger.warn('Le planificateur de déploiement est déjà démarré');
      return;
    }

    this.isRunning = true;

    // Planifier la collecte de métriques toutes les 5 minutes
    this.scheduleMetricsCollection();

    // Planifier la vérification des déploiements échoués toutes les 10 minutes
    this.scheduleFailedDeploymentCheck();

    // Planifier le nettoyage des anciens logs toutes les heures
    this.scheduleCleanup();

    logger.info('Planificateur de déploiement démarré avec succès');
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
    logger.info('Planificateur de déploiement arrêté');
  }

  // Planifier la collecte de métriques système
  scheduleMetricsCollection() {
    const job = cron.schedule('*/5 * * * *', async () => {
      try {
        logger.debug('Collecte des métriques système...');

        // Récupérer les déploiements en cours
        const runningDeployments = await deploymentService.getDeployments({
          status: 'running',
          limit: 100
        });

        for (const deployment of runningDeployments) {
          // Enregistrer le temps écoulé depuis le début
          const elapsedTime = Math.floor((Date.now() - new Date(deployment.startTime).getTime()) / 1000);

          await deploymentService.recordDeploymentMetric({
            deploymentId: deployment.id,
            metricType: 'elapsed_time',
            value: elapsedTime,
            unit: 'seconds'
          });

          // Mettre à jour le statut si le déploiement dure trop longtemps (> 30 minutes)
          if (elapsedTime > 1800) {
            await deploymentService.updateDeploymentStatus(deployment.id, 'failed', {
              logs: [...(deployment.logs || []), {
                timestamp: new Date(),
                level: 'error',
                message: 'Déploiement annulé après 30 minutes d\'exécution'
              }]
            });
          }
        }

        logger.debug(`Métriques collectées pour ${runningDeployments.length} déploiements`);
      } catch (error) {
        logger.error('Erreur lors de la collecte des métriques:', error);
      }
    }, {
      scheduled: false
    });

    this.jobs.set('metrics-collection', job);
    job.start();
    logger.info('Job de collecte de métriques planifié (toutes les 5 minutes)');
  }

  // Planifier la vérification des déploiements échoués
  scheduleFailedDeploymentCheck() {
    const job = cron.schedule('*/10 * * * *', async () => {
      try {
        logger.debug('Vérification des déploiements échoués...');

        // Récupérer les déploiements échoués récents (dernières 24h)
        const failedDeployments = await deploymentService.getDeployments({
          status: 'failed',
          limit: 50
        });

        const recentFailed = failedDeployments.filter(d => {
          const deploymentTime = new Date(d.createdAt).getTime();
          const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
          return deploymentTime > oneDayAgo;
        });

        // Analyser les causes d'échec courantes
        const failureReasons = {};

        for (const deployment of recentFailed) {
          const logs = deployment.logs || [];
          for (const log of logs) {
            if (log.level === 'error') {
              const message = log.message.toLowerCase();
              if (message.includes('build')) failureReasons.build = (failureReasons.build || 0) + 1;
              if (message.includes('test')) failureReasons.test = (failureReasons.test || 0) + 1;
              if (message.includes('deploy')) failureReasons.deploy = (failureReasons.deploy || 0) + 1;
              if (message.includes('timeout')) failureReasons.timeout = (failureReasons.timeout || 0) + 1;
            }
          }
        }

        if (Object.keys(failureReasons).length > 0) {
          logger.warn('Analyse des échecs de déploiement récents:', failureReasons);
        }

        logger.debug(`${recentFailed.length} déploiements échoués analysés`);
      } catch (error) {
        logger.error('Erreur lors de la vérification des déploiements échoués:', error);
      }
    }, {
      scheduled: false
    });

    this.jobs.set('failed-deployment-check', job);
    job.start();
    logger.info('Job de vérification des déploiements échoués planifié (toutes les 10 minutes)');
  }

  // Planifier le nettoyage des anciens logs et métriques
  scheduleCleanup() {
    const job = cron.schedule('0 * * * *', async () => {
      try {
        logger.debug('Nettoyage des anciens logs et métriques...');

        // Nettoyer les métriques de déploiement de plus de 90 jours
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const deletedMetrics = await deploymentService.prisma.deploymentMetric.deleteMany({
          where: {
            timestamp: {
              lt: ninetyDaysAgo
            }
          }
        });

        // Nettoyer les déploiements terminés de plus de 180 jours
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);

        const deletedDeployments = await deploymentService.prisma.deployment.deleteMany({
          where: {
            createdAt: {
              lt: sixMonthsAgo
            },
            status: {
              in: ['success', 'failed', 'rolled_back']
            }
          }
        });

        logger.info(`Nettoyage effectué: ${deletedMetrics.count} métriques et ${deletedDeployments.count} déploiements supprimés`);
      } catch (error) {
        logger.error('Erreur lors du nettoyage:', error);
      }
    }, {
      scheduled: false
    });

    this.jobs.set('cleanup', job);
    job.start();
    logger.info('Job de nettoyage planifié (toutes les heures)');
  }

  // Créer un déploiement planifié
  async scheduleDeployment(deploymentData, scheduleTime) {
    try {
      const { version, environment, commitHash, branch, triggeredBy } = deploymentData;

      // Créer le déploiement avec le statut "scheduled"
      const deployment = await deploymentService.createDeployment({
        version,
        environment,
        commitHash,
        branch,
        triggeredBy,
        status: 'scheduled',
        scheduledTime: scheduleTime,
        metadata: {
          scheduled: true,
          originalScheduleTime: scheduleTime
        }
      });

      // Planifier l'exécution du déploiement
      const executionTime = new Date(scheduleTime);
      const now = new Date();

      if (executionTime <= now) {
        // Exécuter immédiatement si l'heure planifiée est passée
        this.executeDeployment(deployment.id);
      } else {
        // Planifier l'exécution
        const delay = executionTime.getTime() - now.getTime();

        setTimeout(() => {
          this.executeDeployment(deployment.id);
        }, delay);

        logger.info(`Déploiement planifié pour ${executionTime.toISOString()}`, {
          deploymentId: deployment.id,
          delayMs: delay
        });
      }

      return deployment;
    } catch (error) {
      logger.error('Erreur lors de la planification du déploiement:', error);
      throw error;
    }
  }

  // Exécuter un déploiement
  async executeDeployment(deploymentId) {
    try {
      logger.info(`Début de l'exécution du déploiement ${deploymentId}`);

      // Mettre à jour le statut à "running"
      await deploymentService.updateDeploymentStatus(deploymentId, 'running', {
        logs: [{
          timestamp: new Date(),
          level: 'info',
          message: 'Déploiement démarré'
        }]
      });

      // Simuler l'exécution du déploiement (remplacer par votre logique réelle)
      await this.performDeployment(deploymentId);

      // Mettre à jour le statut à "success" si tout s'est bien passé
      await deploymentService.updateDeploymentStatus(deploymentId, 'success', {
        logs: [{
          timestamp: new Date(),
          level: 'info',
          message: 'Déploiement terminé avec succès'
        }]
      });

      logger.info(`Déploiement ${deploymentId} exécuté avec succès`);
    } catch (error) {
      logger.error(`Erreur lors de l'exécution du déploiement ${deploymentId}:`, error);

      // Mettre à jour le statut à "failed"
      await deploymentService.updateDeploymentStatus(deploymentId, 'failed', {
        logs: [{
          timestamp: new Date(),
          level: 'error',
          message: `Erreur lors du déploiement: ${error.message}`
        }]
      });
    }
  }

  // Effectuer le déploiement (logique métier à remplacer)
  async performDeployment(deploymentId) {
    try {
      const deployment = await deploymentService.getDeploymentById(deploymentId);
      if (!deployment) {
        throw new Error('Déploiement non trouvé');
      }

      // Étape 1: Build
      logger.info(`Étape 1: Build du déploiement ${deploymentId}`);
      await deploymentService.recordDeploymentMetric({
        deploymentId,
        metricType: 'build_time',
        value: 120 + Math.random() * 60, // 2-3 minutes
        unit: 'seconds'
      });

      // Étape 2: Tests
      logger.info(`Étape 2: Tests du déploiement ${deploymentId}`);
      await deploymentService.recordDeploymentMetric({
        deploymentId,
        metricType: 'test_time',
        value: 90 + Math.random() * 30, // 1.5-2 minutes
        unit: 'seconds'
      });

      // Étape 3: Déploiement
      logger.info(`Étape 3: Déploiement ${deploymentId}`);
      await deploymentService.recordDeploymentMetric({
        deploymentId,
        metricType: 'deploy_time',
        value: 60 + Math.random() * 30, // 1-1.5 minutes
        unit: 'seconds'
      });

      // Étape 4: Vérification post-déploiement
      logger.info(`Étape 4: Vérification post-déploiement ${deploymentId}`);

      // Simuler quelques métriques de performance
      await deploymentService.recordDeploymentMetric({
        deploymentId,
        metricType: 'error_rate',
        value: Math.random() * 0.05, // 0-5% d'erreur
        unit: 'percentage'
      });

      await deploymentService.recordDeploymentMetric({
        deploymentId,
        metricType: 'response_time',
        value: 100 + Math.random() * 100, // 100-200ms
        unit: 'milliseconds'
      });

    } catch (error) {
      logger.error(`Erreur lors de l'exécution du déploiement ${deploymentId}:`, error);
      throw error;
    }
  }
}

// Gestion de l'arrêt propre du processus
process.on('SIGTERM', () => {
  logger.info('Signal SIGTERM reçu, arrêt du planificateur...');
  deploymentScheduler.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Signal SIGINT reçu, arrêt du planificateur...');
  deploymentScheduler.stop();
  process.exit(0);
});

const deploymentScheduler = new DeploymentScheduler();

module.exports = deploymentScheduler;
