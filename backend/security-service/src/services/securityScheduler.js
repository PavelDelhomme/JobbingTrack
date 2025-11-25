const cron = require('node-cron');
const { logger, logSecurityEvent } = require('../utils/logger');
const securityService = require('./securityService');

class SecurityScheduler {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  // Démarrer le planificateur
  start() {
    if (this.isRunning) {
      logger.warn('Le planificateur de sécurité est déjà démarré');
      return;
    }

    this.isRunning = true;

    // Planifier la collecte de métriques de sécurité toutes les 5 minutes
    this.scheduleMetricsCollection();

    // Planifier l'analyse de vulnérabilités toutes les heures
    this.scheduleVulnerabilityAnalysis();

    // Planifier l'analyse des patterns d'attaque toutes les 15 minutes
    this.scheduleAttackPatternAnalysis();

    // Planifier le nettoyage des anciens logs quotidiennement
    this.scheduleCleanup();

    // Planifier l'analyse des menaces en temps réel toutes les minutes
    this.scheduleRealTimeThreatAnalysis();

    logger.info('Planificateur de sécurité démarré avec succès');
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
    logger.info('Planificateur de sécurité arrêté');
  }

  // Planifier la collecte de métriques de sécurité
  scheduleMetricsCollection() {
    const job = cron.schedule('*/5 * * * *', async () => {
      try {
        logger.debug('Collecte des métriques de sécurité...');

        const metrics = await securityService.getSecurityMetrics({ days: 1 });

        // Enregistrer les métriques dans la base de données
        await securityService.prisma.securityMetric.create({
          data: {
            metricType: 'security_score',
            value: metrics.overview.securityScore,
            unit: 'score',
            period: 'hour',
            metadata: {
              totalLogs: metrics.overview.totalLogs,
              criticalEvents: metrics.overview.criticalEvents,
              intrusionAttempts: metrics.overview.intrusionAttempts,
              ddosAttacks: metrics.overview.ddosAttacks
            }
          }
        });

        logger.debug(`Métriques de sécurité collectées: score=${metrics.overview.securityScore}`);
      } catch (error) {
        logger.error('Erreur lors de la collecte des métriques de sécurité:', error);
      }
    }, {
      scheduled: false
    });

    this.jobs.set('metrics-collection', job);
    job.start();
    logger.info('Job de collecte de métriques planifié (toutes les 5 minutes)');
  }

  // Planifier l'analyse de vulnérabilités
  scheduleVulnerabilityAnalysis() {
    const job = cron.schedule('0 * * * *', async () => {
      try {
        logger.debug('Analyse de vulnérabilités en cours...');

        await securityService.analyzeVulnerabilities();

        logger.debug('Analyse de vulnérabilités terminée');
      } catch (error) {
        logger.error('Erreur lors de l\'analyse de vulnérabilités:', error);
      }
    }, {
      scheduled: false
    });

    this.jobs.set('vulnerability-analysis', job);
    job.start();
    logger.info('Job d\'analyse de vulnérabilités planifié (toutes les heures)');
  }

  // Planifier l'analyse des patterns d'attaque
  scheduleAttackPatternAnalysis() {
    const job = cron.schedule('*/15 * * * *', async () => {
      try {
        logger.debug('Analyse des patterns d\'attaque...');

        const recentLogs = await securityService.getSecurityLogs({
          startDate: new Date(Date.now() - 15 * 60 * 1000), // 15 dernières minutes
          category: 'intrusion'
        });

        // Analyser les patterns
        const patterns = this.analyzeAttackPatterns(recentLogs);

        if (patterns.suspiciousIPs.length > 0) {
          logger.warn('Patterns d\'attaque suspects détectés:', patterns);
        }

        logger.debug(`Analyse des patterns terminée: ${patterns.suspiciousIPs.length} IPs suspects`);
      } catch (error) {
        logger.error('Erreur lors de l\'analyse des patterns d\'attaque:', error);
      }
    }, {
      scheduled: false
    });

    this.jobs.set('attack-pattern-analysis', job);
    job.start();
    logger.info('Job d\'analyse des patterns d\'attaque planifié (toutes les 15 minutes)');
  }

  // Analyser les patterns d'attaque
  analyzeAttackPatterns(logs) {
    const ipCounts = {};
    const suspiciousIPs = [];

    // Compter les occurrences par IP
    logs.forEach(log => {
      if (log.sourceIP) {
        ipCounts[log.sourceIP] = (ipCounts[log.sourceIP] || 0) + 1;
      }
    });

    // Identifier les IPs avec beaucoup d'activité
    Object.entries(ipCounts).forEach(([ip, count]) => {
      if (count > 10) { // Plus de 10 tentatives en 15 minutes
        suspiciousIPs.push({
          ip,
          attempts: count,
          riskLevel: count > 20 ? 'high' : 'medium'
        });
      }
    });

    return { suspiciousIPs };
  }

  // Planifier le nettoyage des anciens logs
  scheduleCleanup() {
    const job = cron.schedule('0 2 * * *', async () => {
      try {
        logger.debug('Nettoyage des anciens logs de sécurité...');

        const deletedCount = await securityService.cleanupOldLogs(90); // Garder 90 jours

        logger.info(`Nettoyage terminé: ${deletedCount} logs supprimés`);
      } catch (error) {
        logger.error('Erreur lors du nettoyage des logs:', error);
      }
    }, {
      scheduled: false
    });

    this.jobs.set('cleanup', job);
    job.start();
    logger.info('Job de nettoyage planifié (quotidien à 2h)');
  }

  // Planifier l'analyse des menaces en temps réel
  scheduleRealTimeThreatAnalysis() {
    const job = cron.schedule('* * * * *', async () => {
      try {
        // Analyser les logs de la dernière minute
        let recentLogs;
        try {
          recentLogs = await securityService.getSecurityLogs({
            startDate: new Date(Date.now() - 60 * 1000), // Dernière minute
            level: 'critical'
          });
        } catch (error) {
          // Si la table n'existe pas, ignorer silencieusement en mode développement
          if ((error.code === 'P2021' || error.message?.includes('does not exist')) && process.env.NODE_ENV !== 'production') {
            return; // Sortir silencieusement si la table n'existe pas
          }
          throw error; // Relancer l'erreur si ce n'est pas P2021
        }

        if (recentLogs.length > 5) {
          // Créer une alerte si trop d'événements critiques
          await securityService.createSecurityAlert({
            level: 'high',
            title: 'Activité critique anormalement élevée',
            description: `${recentLogs.length} événements critiques détectés en 1 minute`,
            category: 'monitoring',
            source: 'security-monitor',
            metadata: {
              eventCount: recentLogs.length,
              timeWindow: '1 minute'
            }
          });
        }

        // Collecter des métriques système automatiques
        await this.collectSystemMetrics();

        // Analyser les vraies données de sécurité
        try {
          await securityService.analyzeAndRecordSecurityData();
        } catch (error) {
          // Ignorer silencieusement les erreurs P2021 (table non trouvée) en mode développement
          if ((error.code === 'P2021' || error.message?.includes('does not exist')) && process.env.NODE_ENV !== 'production') {
            return; // Sortir silencieusement
          }
          logger.error('Erreur lors de l\'analyse des données de sécurité:', error);
        }
      } catch (error) {
        // Ignorer silencieusement les erreurs P2021 (table non trouvée) en mode développement
        if ((error.code === 'P2021' || error.message?.includes('does not exist')) && process.env.NODE_ENV !== 'production') {
          return; // Sortir silencieusement
        }
        logger.error('Erreur lors de l\'analyse des menaces en temps réel:', error);
      }
    }, {
      scheduled: false
    });

    this.jobs.set('real-time-threat-analysis', job);
    job.start();
    logger.info('Job d\'analyse des menaces en temps réel planifié (toutes les minutes)');
  }

  // Collecter les métriques système automatiques
  async collectSystemMetrics() {
    try {
      // Récupérer les métriques système actuelles
      const systemMetrics = await securityService.getSystemMetrics();

      // Enregistrer les métriques dans la base de données
      await securityService.prisma.securityMetric.create({
        data: {
          metricType: 'system_activity',
          value: systemMetrics.totalLogs,
          unit: 'logs',
          period: 'hour',
          metadata: {
            criticalEvents: systemMetrics.criticalEvents,
            intrusionAttempts: systemMetrics.intrusionAttempts,
            ddosAttacks: systemMetrics.ddosAttacks,
            authFailures: systemMetrics.authFailures,
            uniqueIPs: systemMetrics.uniqueIPs,
            blockedIPs: systemMetrics.blockedIPs,
            averageRiskScore: systemMetrics.averageRiskScore
          }
        }
      });

      logger.debug(`Métriques système collectées: ${systemMetrics.totalLogs} logs, score risque: ${systemMetrics.averageRiskScore}`);
    } catch (error) {
      logger.error('Erreur lors de la collecte des métriques système:', error);
    }
  }

  // Méthode pour déclencher manuellement une analyse de sécurité
  async triggerSecurityAnalysis() {
    try {
      logger.info('Analyse de sécurité manuelle déclenchée');

      // Analyser les vulnérabilités
      await securityService.analyzeVulnerabilities();

      // Récupérer les métriques actuelles
      const metrics = await securityService.getSecurityMetrics({ days: 1 });

      // Créer un rapport
      const report = {
        timestamp: new Date(),
        securityScore: metrics.overview.securityScore,
        totalLogs: metrics.overview.totalLogs,
        criticalEvents: metrics.overview.criticalEvents,
        intrusionAttempts: metrics.overview.intrusionAttempts,
        ddosAttacks: metrics.overview.ddosAttacks,
        vulnerabilities: metrics.overview.vulnerabilities,
        topThreats: metrics.topThreats.slice(0, 5)
      };

      logger.info('Rapport d\'analyse de sécurité généré:', report);

      return report;
    } catch (error) {
      logger.error('Erreur lors de l\'analyse de sécurité manuelle:', error);
      throw error;
    }
  }
}

// Gestion de l'arrêt propre du processus
process.on('SIGTERM', () => {
  logger.info('Signal SIGTERM reçu, arrêt du planificateur de sécurité...');
  securityScheduler.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Signal SIGINT reçu, arrêt du planificateur de sécurité...');
  securityScheduler.stop();
  process.exit(0);
});

const securityScheduler = new SecurityScheduler();

module.exports = securityScheduler;
