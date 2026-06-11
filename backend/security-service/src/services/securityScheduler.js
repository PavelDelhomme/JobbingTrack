const cron = require('node-cron');
const axios = require('axios');
const { logger, logSecurityEvent } = require('../utils/logger');
const securityService = require('./securityService');
const networkThreatDetector = require('./networkThreatDetector');

class SecurityScheduler {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
    this.availabilityAlertState = new Map();
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

    // Planifier l'analyse CVE avec cadence légère pour éviter une charge permanente
    this.scheduleVulnerabilityAnalysis();

    // Import GitHub Dependabot optionnel, désactivé par défaut sans token serveur.
    this.scheduleDependabotAlertsImport();

    // Planifier l'analyse des patterns d'attaque toutes les 15 minutes
    this.scheduleAttackPatternAnalysis();

    // Planifier le nettoyage des anciens logs quotidiennement
    this.scheduleCleanup();

    // Planifier l'analyse des menaces en temps réel toutes les minutes
    this.scheduleRealTimeThreatAnalysis();

    // Planifier les alertes disponibilité service/conteneur sans poller le trafic interne
    this.scheduleServiceAvailabilityAlerts();

    // Démarrer la détection continue des menaces réseau
    networkThreatDetector.startDetection(30000); // Toutes les 30 secondes

    logger.info('Planificateur de sécurité démarré avec succès');
  }

  // Arrêter le planificateur
  stop() {
    if (!this.isRunning) {
      return;
    }

    // Arrêter tous les jobs cron
    this.jobs.forEach((job, name) => {
      try {
        // Vérifier si le job a une méthode destroy ou stop
        if (typeof job.destroy === 'function') {
          job.destroy();
        } else if (typeof job.stop === 'function') {
          job.stop();
        } else if (job && typeof job === 'object' && 'stop' in job) {
          job.stop();
        }
        logger.info(`Job cron arrêté: ${name}`);
      } catch (error) {
        logger.warn(`Erreur lors de l'arrêt du job ${name}:`, error.message);
      }
    });

    this.jobs.clear();
    
    // Arrêter la détection de menaces réseau
    networkThreatDetector.stopDetection();
    
    this.isRunning = false;
    logger.info('Planificateur de sécurité arrêté');
  }

  // Planifier la collecte de métriques de sécurité
  scheduleMetricsCollection() {
    const job = cron.schedule('*/5 * * * *', async () => {
      try {
        logger.debug('Collecte des métriques de sécurité...');

        const metrics = await securityService.getSecurityMetrics({ days: 1 });

        // Enregistrer les métriques dans la base de données (si la table existe)
        try {
          const metricModel = securityService.prisma.securityMetricTable || securityService.prisma.securityMetric;
          if (!metricModel || typeof metricModel.create !== 'function') {
            if (process.env.NODE_ENV === 'development') return;
            throw new Error('Modèle SecurityMetric indisponible');
          }
          await metricModel.create({
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
          if (error.code === 'P2021' || error.message?.includes('does not exist')) {
            // Table n'existe pas encore, ignorer silencieusement en développement
            if (process.env.NODE_ENV === 'development') {
              // Mode silencieux - ne pas logger
              return;
            } else {
              logger.warn('Table security_metrics non trouvée, métriques non enregistrées');
            }
          } else {
            throw error;
          }
        }
      } catch (error) {
        // Gérer les erreurs P2021 silencieusement en développement
        if (error.code === 'P2021' || error.message?.includes('does not exist')) {
          if (process.env.NODE_ENV === 'development') {
            // Mode silencieux - ne pas logger
            return;
          }
        }
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
    const cronExpression = process.env.CVE_SCAN_CRON || '17 */6 * * *';
    const job = cron.schedule(cronExpression, async () => {
      try {
        logger.debug('Analyse de vulnérabilités en cours...');

        await securityService.analyzeVulnerabilities();

        logger.debug('Analyse de vulnérabilités terminée');
      } catch (error) {
        // Gérer les erreurs P2021 silencieusement en développement
        if (error.code === 'P2021' || error.message?.includes('does not exist')) {
          if (process.env.NODE_ENV === 'development') {
            // Mode silencieux - ne pas logger
            return;
          }
        }
        logger.error('Erreur lors de l\'analyse de vulnérabilités:', error);
      }
    }, {
      scheduled: false
    });

    this.jobs.set('vulnerability-analysis', job);
    job.start();
    logger.info(`Job d'analyse CVE planifié (${cronExpression})`);
  }

  scheduleDependabotAlertsImport() {
    if (process.env.DEPENDABOT_ALERTS_ENABLED !== 'true') {
      logger.info('Import Dependabot alerts désactivé');
      return;
    }

    const cronExpression = process.env.DEPENDABOT_ALERTS_CRON || '43 */6 * * *';
    const job = cron.schedule(cronExpression, async () => {
      try {
        logger.debug('Import Dependabot alerts en cours...');
        await securityService.analyzeDependabotAlerts();
        logger.debug('Import Dependabot alerts terminé');
      } catch (error) {
        logger.warn('Erreur lors de l\'import Dependabot alerts:', error.message);
      }
    }, {
      scheduled: false
    });

    this.jobs.set('dependabot-alerts-import', job);
    job.start();
    logger.info(`Job d'import Dependabot alerts planifié (${cronExpression})`);
  }

  // Planifier l'analyse des patterns d'attaque
  scheduleAttackPatternAnalysis() {
    const job = cron.schedule('*/15 * * * *', async () => {
      try {
        logger.debug('Analyse des patterns d\'attaque...');

        const { logs: recentLogs } = await securityService.getSecurityLogs({
          startDate: new Date(Date.now() - 15 * 60 * 1000), // 15 dernières minutes
          category: 'intrusion',
          limit: 500
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
          const result = await securityService.getSecurityLogs({
            startDate: new Date(Date.now() - 60 * 1000), // Dernière minute
            level: 'critical',
            limit: 200
          });
          recentLogs = result.logs;
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

  scheduleServiceAvailabilityAlerts() {
    if (process.env.SECURITY_SERVICE_DOWN_ALERTS_ENABLED === 'false') {
      logger.info('Alertes disponibilité services désactivées');
      return;
    }

    const cronExpression = process.env.SECURITY_SERVICE_DOWN_ALERT_CRON || '*/2 * * * *';
    const job = cron.schedule(cronExpression, async () => {
      try {
        await this.checkServiceAvailabilityAlerts();
      } catch (error) {
        logger.warn('Erreur analyse disponibilité services:', error.message);
      }
    }, {
      scheduled: false
    });

    this.jobs.set('service-availability-alerts', job);
    job.start();
    logger.info(`Job d'alertes disponibilité services planifié (${cronExpression})`);
  }

  getCriticalServiceNames() {
    const raw = process.env.SECURITY_CRITICAL_SERVICES ||
      'jobbingtrack-api-gateway,jobbingtrack-auth-service,jobbingtrack-frontend,jobbingtrack-postgres,jobbingtrack-redis,jobbingtrack-metrics-aggregator,jobbingtrack-security-service,jobbingtrack-monitoring-agent-rs,jobbingtrack-log-collector-rs';
    return new Set(
      raw
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)
    );
  }

  shouldEmitAvailabilityAlert(key) {
    const dedupMs = Number(process.env.SECURITY_SERVICE_DOWN_DEDUP_MINUTES || 30) * 60 * 1000;
    const last = this.availabilityAlertState.get(key) || 0;
    const now = Date.now();
    if (now - last < dedupMs) return false;
    this.availabilityAlertState.set(key, now);
    return true;
  }

  async createAvailabilityAlert({ level, title, description, source, metadata }) {
    const key = `${source}:${metadata?.status || metadata?.reason || 'down'}`;
    if (!this.shouldEmitAvailabilityAlert(key)) {
      return null;
    }

    return securityService.createSecurityAlert({
      level,
      title,
      description,
      category: 'availability',
      source,
      metadata: {
        alertType: 'SERVICE_DOWN',
        ...metadata
      }
    });
  }

  async checkServiceAvailabilityAlerts() {
    const baseUrl = process.env.METRICS_SERVICE_URL || process.env.METRICS_AGGREGATOR_URL || 'http://jobbingtrack-metrics-aggregator:3014';
    const timeout = Number(process.env.SECURITY_SERVICE_DOWN_ALERT_TIMEOUT_MS || 5000);
    const criticalServices = this.getCriticalServiceNames();
    const headers = process.env.METRICS_API_KEY
      ? { 'X-API-Key': process.env.METRICS_API_KEY }
      : undefined;

    let payload;
    try {
      const response = await axios.get(`${baseUrl.replace(/\/$/, '')}/api/v1/docker/services/all`, {
        timeout,
        headers
      });
      payload = response.data;
    } catch (error) {
      await this.createAvailabilityAlert({
        level: 'critical',
        title: 'Metrics aggregator indisponible',
        description: `Impossible de récupérer la santé des services depuis le metrics-aggregator: ${error.message}`,
        source: 'jobbingtrack-metrics-aggregator',
        metadata: {
          reason: 'metrics_aggregator_unreachable',
          metricsServiceUrl: baseUrl,
          error: error.message
        }
      });
      return { checked: 0, alerts: 1, error: error.message };
    }

    const services = Array.isArray(payload?.services) ? payload.services : [];
    let alerts = 0;

    for (const service of services) {
      const name = String(service?.name || '').trim();
      if (!name || !criticalServices.has(name)) continue;

      const status = String(service?.status || '').toLowerCase();
      const isRunning = service?.is_running === true || status === 'running';
      if (isRunning) continue;

      const alert = await this.createAvailabilityAlert({
        level: 'critical',
        title: `Service critique indisponible: ${name}`,
        description: `Le service critique ${name} n'est plus en état running.`,
        source: name,
        metadata: {
          serviceName: name,
          status: service?.status || 'unknown',
          healthStatus: service?.health_status || service?.health?.status || null,
          isRunning: service?.is_running ?? null,
          image: service?.image || null,
          ports: service?.ports || null,
          metricsServiceUrl: baseUrl
        }
      });
      if (alert) alerts += 1;
    }

    return { checked: services.length, alerts };
  }

  // Collecter les métriques système automatiques
  async collectSystemMetrics() {
    try {
      // Vérifier que la table existe avant d'essayer de l'utiliser
      // Force refresh toutes les 10 minutes pour éviter les problèmes de cache
      const { checkTableExists, handleTableNotFoundError, clearTableExistsCache } = require('../config/database');
      
      const cacheKey = 'security_metrics_last_check';
      const lastCheck = this[cacheKey] || 0;
      const forceRefresh = (Date.now() - lastCheck) > 10 * 60 * 1000; // 10 minutes
      
      const tableExists = await checkTableExists('security_metrics', forceRefresh);
      this[cacheKey] = Date.now();
      
      if (!tableExists) {
        // Table n'existe pas, ignorer silencieusement
        // Vider le cache pour forcer une nouvelle vérification la prochaine fois
        clearTableExistsCache('security_metrics');
        return;
      }

      // Récupérer les métriques système actuelles
      const systemMetrics = await securityService.getSystemMetrics();

      // Enregistrer les métriques dans la base de données
      const metricModel = securityService.prisma.securityMetricTable || securityService.prisma.securityMetric;
      if (!metricModel || typeof metricModel.create !== 'function') {
        if (process.env.NODE_ENV === 'development') return;
        throw new Error('Modèle SecurityMetric indisponible');
      }
      await metricModel.create({
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
      // Gérer l'erreur P2021 (table n'existe pas) gracieusement
      const { handleTableNotFoundError, isTableNotFoundError } = require('../config/database');
      
      // Vérifier si c'est une erreur de table non trouvée
      if (isTableNotFoundError(error)) {
        // Mettre à jour le cache et ignorer silencieusement
        handleTableNotFoundError(error, 'security_metrics', true);
        return;
      }
      
      // Pour les autres erreurs, logger uniquement en production
      // En développement, NE JAMAIS logger les erreurs liées aux tables
      if (process.env.NODE_ENV === 'production') {
        // Vérifier que ce n'est pas une erreur de table avant de logger
        if (!isTableNotFoundError(error)) {
          logger.error('Erreur lors de la collecte des métriques système:', error);
        }
      }
      // Ne pas propager l'erreur pour éviter de casser le service
    }
  }

  // Méthode pour déclencher manuellement une analyse de sécurité
  async triggerSecurityAnalysis() {
    try {
      logger.info('Analyse de sécurité manuelle déclenchée');

      // Analyser les vulnérabilités
      const cveAnalysis = await securityService.analyzeVulnerabilities();

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
        cveAnalysis,
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

const securityScheduler = new SecurityScheduler();

// Gestion de l'arrêt propre du processus
if (process.env.NODE_ENV !== 'test') {
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
}

module.exports = securityScheduler;
