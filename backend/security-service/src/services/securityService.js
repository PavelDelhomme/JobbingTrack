const { prisma } = require('../config/database');
const { logger, logSecurityEvent } = require('../utils/logger');
const dataGenerator = require('./dataGenerator');

class SecurityService {
  constructor() {
    this.analysisCache = new Map();
    this.prisma = prisma; // ✅ Exposer prisma pour le controller
  }

  // Récupérer les métriques de sécurité pour le dashboard
  async getSecurityMetrics(filters = {}) {
    try {
      const { days = 7, category } = filters;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Récupérer les logs de sécurité récents (données réelles collectées)
      let securityLogs;
      try {
        securityLogs = await this.getSecurityLogs({
          startDate,
          category,
          limit: 1000
        });
      } catch (error) {
        // Fallback si table SecurityLog n'existe pas (P2021) - Mode silencieux en développement
        if (error.code === 'P2021' && process.env.NODE_ENV !== 'production') {
          // Mode silencieux - ne pas logger
          securityLogs = [];
        } else {
          throw error;
        }
      }

      // Analyser les métriques à partir des vraies données collectées
      const metrics = await this.analyzeSecurityMetrics(securityLogs);

      // Récupérer les données avec gestion d'erreur individuelle pour chaque méthode
      let trends = [];
      let topThreats = [];
      let vulnerabilities = [];
      let alerts = [];

      // Utiliser Promise.allSettled pour gérer les erreurs individuellement
      const results = await Promise.allSettled([
        this.getSecurityTrends(days).catch(err => {
          if (err.code === 'P2021' || (err.message && err.message.includes('does not exist'))) {
            // Mode silencieux en développement
            return [];
          }
          if (process.env.NODE_ENV === 'production') {
            logger.error('Erreur récupération trends:', err.message);
          }
          return [];
        }),
        this.getTopThreats(days).catch(err => {
          if (err.code === 'P2021' || (err.message && err.message.includes('does not exist'))) {
            // Mode silencieux en développement
            return [];
          }
          if (process.env.NODE_ENV === 'production') {
            logger.error('Erreur récupération topThreats:', err.message);
          }
          return [];
        }),
        this.getVulnerabilities().catch(err => {
          if (err.code === 'P2021' || (err.message && err.message.includes('does not exist'))) {
            // Mode silencieux en développement
            return [];
          }
          if (process.env.NODE_ENV === 'production') {
            logger.error('Erreur récupération vulnerabilities:', err.message);
          }
          return [];
        }),
        this.getSecurityAlerts().catch(err => {
          if (err.code === 'P2021' || (err.message && err.message.includes('does not exist'))) {
            // Mode silencieux en développement
            return [];
          }
          if (process.env.NODE_ENV === 'production') {
            logger.error('Erreur récupération alerts:', err.message);
          }
          return [];
        })
      ]);

      // Extraire les résultats
      if (results[0].status === 'fulfilled') trends = results[0].value || [];
      if (results[1].status === 'fulfilled') topThreats = results[1].value || [];
      if (results[2].status === 'fulfilled') vulnerabilities = results[2].value || [];
      if (results[3].status === 'fulfilled') alerts = results[3].value || [];

      // Calculer le score de sécurité avec gestion d'erreur
      let securityScore = 100;
      try {
        securityScore = this.calculateSecurityScore(metrics);
      } catch (error) {
        logger.warn('Erreur calcul score sécurité, utilisation de valeur par défaut:', error.message);
        securityScore = 100;
      }

      return {
        overview: {
          totalLogs: metrics.totalLogs || 0,
          criticalEvents: metrics.criticalEvents || 0,
          intrusionAttempts: metrics.intrusionAttempts || 0,
          ddosAttacks: metrics.ddosAttacks || 0,
          vulnerabilities: metrics.vulnerabilities || 0,
          securityScore
        },
        logs: (securityLogs || []).slice(0, 10), // 10 logs les plus récents
        trends: trends || [],
        topThreats: topThreats || [],
        vulnerabilities: vulnerabilities || [],
        alerts: alerts || []
      };
    } catch (error) {
      logger.error('Erreur lors de la récupération des métriques de sécurité:', error);
      throw error;
    }
  }

  // Récupérer les logs de sécurité avec filtres
  async getSecurityLogs(filters = {}) {
    try {
      const {
        startDate,
        endDate,
        level,
        category,
        limit = 100,
        offset = 0
      } = filters;

      const where = {};

      if (startDate) where.timestamp = { ...where.timestamp, gte: startDate };
      if (endDate) where.timestamp = { ...where.timestamp, lte: endDate };
      if (level) where.level = level;
      if (category) where.category = category;

      const logs = await prisma.securityLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset
      });

      return logs;
    } catch (error) {
      // Fallback si table SecurityLog n'existe pas (P2021) - Mode silencieux en développement
      if (error.code === 'P2021' && process.env.NODE_ENV !== 'production') {
        // Mode silencieux - ne pas logger
        return [];
      }
      // En production, logger l'erreur
      if (process.env.NODE_ENV === 'production') {
        logger.error('Erreur lors de la récupération des logs de sécurité:', error);
      }
      throw error;
    }
  }

  // Créer un log de sécurité
  async createSecurityLog(logData) {
    try {
      // Fallback si table SecurityLog n'existe pas (P2021) - Mode silencieux en développement
      if (!prisma.securityLog || typeof prisma.securityLog.create !== 'function') {
        if (process.env.NODE_ENV !== 'production') {
          // Mode silencieux - ne pas logger
          return null;
        }
      }

      const {
        level,
        category,
        eventType,
        message,
        sourceIP,
        userAgent,
        userId,
        endpoint,
        method,
        statusCode,
        responseTime,
        country,
        city,
        riskScore,
        isBlocked,
        metadata
      } = logData;

      const log = await prisma.securityLog.create({
        data: {
          level,
          category,
          eventType,
          message,
          sourceIP,
          userAgent,
          userId,
          endpoint,
          method,
          statusCode,
          responseTime,
          country,
          city,
          riskScore: riskScore || 0,
          isBlocked: isBlocked || false,
          metadata: metadata || {}
        }
      });

      // Logger l'événement
      logger.info(`Log de sécurité créé: ${eventType} - ${message}`, {
        logId: log.id,
        level,
        category,
        userId
      });

      // Si le score de risque est élevé, créer une alerte
      if (riskScore && riskScore >= 70) {
        await this.createSecurityAlert({
          level: riskScore >= 90 ? 'critical' : 'high',
          title: `Activité à haut risque détectée: ${eventType}`,
          description: message,
          category,
          source: sourceIP || userId || 'unknown',
          metadata: {
            logId: log.id,
            riskScore,
            eventType
          }
        });
      }

      return log;
    } catch (error) {
      // Fallback si table SecurityLog n'existe pas (P2021) - Mode silencieux en développement
      if (error.code === 'P2021' && process.env.NODE_ENV !== 'production') {
        // Mode silencieux - ne pas logger
        return null;
      }
      logger.error('Erreur lors de la création du log de sécurité:', error);
      throw error;
    }
  }

  // Analyser les métriques à partir des logs
  async analyzeSecurityMetrics(logs) {
    const metrics = {
      totalLogs: logs.length,
      criticalEvents: 0,
      intrusionAttempts: 0,
      ddosAttacks: 0,
      vulnerabilities: 0,
      blockedIPs: 0,
      suspiciousActivities: 0
    };

    for (const log of logs) {
      switch (log.level) {
        case 'critical':
          metrics.criticalEvents++;
          break;
      }

      switch (log.category) {
        case 'intrusion':
          metrics.intrusionAttempts++;
          if (log.isBlocked) metrics.blockedIPs++;
          break;
        case 'ddos':
          metrics.ddosAttacks++;
          break;
        case 'vulnerability':
          metrics.vulnerabilities++;
          break;
      }

      if (log.eventType === 'suspicious_activity') {
        metrics.suspiciousActivities++;
      }
    }

    return metrics;
  }

  // Calculer le score de sécurité global
  calculateSecurityScore(metrics) {
    let score = 100;

    // Pénalités basées sur les métriques
    score -= metrics.criticalEvents * 5;      // -5 points par événement critique
    score -= metrics.intrusionAttempts * 2;   // -2 points par tentative d'intrusion
    score -= metrics.ddosAttacks * 3;         // -3 points par attaque DDoS
    score -= metrics.vulnerabilities * 4;     // -4 points par vulnérabilité

    // Bonus pour les blocages réussis
    score += Math.min(metrics.blockedIPs * 0.5, 5); // +0.5 point par IP bloquée (max +5)

    return Math.max(0, Math.min(100, score));
  }

  // Récupérer les tendances de sécurité
  async getSecurityTrends(days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Récupérer les logs par jour
      const dailyLogs = await prisma.$queryRaw`
        SELECT
          DATE(timestamp) as date,
          COUNT(*)::int as total_logs,
          COUNT(CASE WHEN level = 'critical' THEN 1 END)::int as critical_events,
          COUNT(CASE WHEN category = 'intrusion' THEN 1 END)::int as intrusion_attempts,
          COUNT(CASE WHEN category = 'ddos' THEN 1 END)::int as ddos_attacks,
          COUNT(CASE WHEN category = 'vulnerability' THEN 1 END)::int as vulnerabilities
        FROM security_logs
        WHERE timestamp >= ${startDate}
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
      `;

      // Convertir les BigInt en Number si nécessaire
      return (dailyLogs || []).map(log => ({
        ...log,
        total_logs: typeof log.total_logs === 'bigint' ? Number(log.total_logs) : log.total_logs,
        critical_events: typeof log.critical_events === 'bigint' ? Number(log.critical_events) : log.critical_events,
        intrusion_attempts: typeof log.intrusion_attempts === 'bigint' ? Number(log.intrusion_attempts) : log.intrusion_attempts,
        ddos_attacks: typeof log.ddos_attacks === 'bigint' ? Number(log.ddos_attacks) : log.ddos_attacks,
        vulnerabilities: typeof log.vulnerabilities === 'bigint' ? Number(log.vulnerabilities) : log.vulnerabilities
      }));
    } catch (error) {
      // Gérer les erreurs de table manquante silencieusement en développement
      if (error.code === 'P2010' || error.message?.includes('does not exist') || error.message?.includes('relation')) {
        if (process.env.NODE_ENV === 'development') {
          // Mode silencieux - retourner tableau vide sans logger
          return [];
        } else {
          logger.warn('Table security_logs non trouvée, retour de tendances vides');
          return [];
        }
      }
      logger.error('Erreur lors de la récupération des tendances de sécurité:', error);
      return [];
    }
  }

  // Récupérer les principales menaces
  async getTopThreats(days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // PostgreSQL est case-sensitive, utiliser des guillemets doubles pour préserver la casse
      const threats = await prisma.$queryRaw`
        SELECT
          "sourceIP",
          country,
          COUNT(*)::int as attempts,
          MAX("riskScore")::float as max_risk_score,
          ARRAY_AGG(DISTINCT category) as categories,
          MAX(timestamp) as last_seen
        FROM security_logs
        WHERE timestamp >= ${startDate}
        AND (category = 'intrusion' OR category = 'ddos')
        GROUP BY "sourceIP", country
        ORDER BY attempts DESC, max_risk_score DESC
        LIMIT 10
      `;

      // Convertir les BigInt en Number si nécessaire
      return (threats || []).map(threat => ({
        ...threat,
        attempts: typeof threat.attempts === 'bigint' ? Number(threat.attempts) : threat.attempts,
        max_risk_score: typeof threat.max_risk_score === 'bigint' ? Number(threat.max_risk_score) : threat.max_risk_score
      }));
    } catch (error) {
      // Gérer les erreurs de table manquante silencieusement en développement
      if (error.code === 'P2010' || error.message?.includes('does not exist') || error.message?.includes('relation')) {
        if (process.env.NODE_ENV === 'development') {
          // Mode silencieux - retourner tableau vide sans logger
          return [];
        } else {
          logger.warn('Table security_logs non trouvée, retour de menaces vides');
          return [];
        }
      }
      logger.error('Erreur lors de la récupération des principales menaces:', error);
      return [];
    }
  }

  // Récupérer les vulnérabilités
  async getVulnerabilities(filters = {}) {
    try {
      const { status, severity, limit = 50 } = filters;

      const where = {};
      if (status) where.status = status;
      if (severity) where.severity = severity;

      const vulnerabilities = await prisma.vulnerability.findMany({
        where,
        orderBy: [
          { severity: 'desc' },
          { createdAt: 'desc' }
        ],
        take: limit
      });

      return vulnerabilities;
    } catch (error) {
      // Gérer les erreurs P2021 (table non trouvée) gracieusement
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        if (process.env.NODE_ENV === 'development') {
          // Mode silencieux - retourner tableau vide sans logger
          return [];
        } else {
          logger.warn('Table vulnerabilities non trouvée, retour de tableau vide');
          return [];
        }
      }
      logger.error('Erreur lors de la récupération des vulnérabilités:', error);
      throw error;
    }
  }

  // Récupérer les alertes de sécurité
  async getSecurityAlerts(filters = {}) {
    try {
      const { level, limit = 20 } = filters;

      const where = {};
      if (level) where.level = level;

      const alerts = await prisma.securityAlert.findMany({
        where: {
          ...where,
          isAcknowledged: false
        },
        orderBy: [
          { level: 'desc' },
          { timestamp: 'desc' }
        ],
        take: limit
      });

      return alerts;
    } catch (error) {
      // Gérer les erreurs P2021 (table non trouvée) gracieusement
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        if (process.env.NODE_ENV === 'development') {
          // Mode silencieux - retourner tableau vide sans logger
          return [];
        } else {
          logger.warn('Table pour alerts non trouvée, retour de tableau vide');
          return [];
        }
      }
      logger.error('Erreur lors de la récupération des alertes de sécurité:', error);
      throw error;
    }
  }

  // Créer une alerte de sécurité
  async createSecurityAlert(alertData) {
    try {
      const { level, title, description, category, source, metadata } = alertData;

      const alert = await prisma.securityAlert.create({
        data: {
          level,
          title,
          description,
          category,
          source,
          metadata
        }
      });

      // Logger l'alerte
      logSecurityEvent(level, 'alert', 'security_alert_created', `Alerte de sécurité créée: ${title}`, {
        alertId: alert.id,
        level,
        category,
        source
      });

      return alert;
    } catch (error) {
      // Gérer les erreurs P2021 (table non trouvée) gracieusement - mode silencieux en développement
      if (error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('relation')) {
        if (process.env.NODE_ENV === 'development') {
          // Mode silencieux - retourner null au lieu de throw
          return null;
        }
      }
      // En production uniquement, logger l'erreur
      if (process.env.NODE_ENV === 'production') {
        logger.error('Erreur lors de la création de l\'alerte de sécurité:', error);
      }
      // En développement, ne pas throw pour éviter les logs d'erreur
      if (process.env.NODE_ENV === 'development') {
        return null;
      }
      throw error;
    }
  }

  // Enregistrer une tentative d'intrusion
  async recordIntrusionAttempt(attemptData) {
    try {
      const {
        sourceIP,
        attackType,
        targetEndpoint,
        method,
        userAgent,
        payload,
        riskScore,
        isBlocked,
        blockReason
      } = attemptData;

      const geo = require('geoip-lite').lookup(sourceIP);

      const attempt = await prisma.intrusionAttempt.create({
        data: {
          sourceIP,
          country: geo ? geo.country : null,
          city: geo ? geo.city : null,
          attackType,
          targetEndpoint,
          method,
          userAgent,
          payload,
          riskScore,
          isBlocked,
          blockReason
        }
      });

      // Logger l'événement
      logSecurityEvent('error', 'intrusion', attackType, `Tentative d'intrusion détectée: ${attackType}`, {
        intrusionId: attempt.id,
        sourceIP,
        attackType,
        targetEndpoint,
        riskScore
      });

      // Créer une alerte si le risque est élevé
      if (riskScore > 70) {
        await this.createSecurityAlert({
          level: 'high',
          title: 'Tentative d\'intrusion détectée',
          description: `Une tentative d'intrusion de type ${attackType} a été détectée depuis ${sourceIP}`,
          category: 'intrusion',
          source: sourceIP,
          metadata: {
            attackType,
            riskScore,
            targetEndpoint
          }
        });
      }

      return attempt;
    } catch (error) {
      logger.error('Erreur lors de l\'enregistrement de la tentative d\'intrusion:', error);
      throw error;
    }
  }

  // Enregistrer une attaque DDoS
  async recordDDoSAttack(attackData) {
    try {
      const {
        sourceIPs,
        attackType,
        targetEndpoint,
        duration,
        totalRequests,
        requestsPerSecond,
        isMitigated
      } = attackData;

      // Récupérer les pays pour chaque IP
      const countries = [];
      for (const ip of sourceIPs) {
        const geo = require('geoip-lite').lookup(ip);
        if (geo && geo.country) {
          countries.push(geo.country);
        }
      }

      const attack = await prisma.dDoSAttack.create({
        data: {
          sourceIPs,
          countries: [...new Set(countries)], // Éliminer les doublons
          attackType,
          targetEndpoint,
          duration,
          totalRequests,
          requestsPerSecond,
          isMitigated
        }
      });

      // Logger l'événement
      logSecurityEvent('critical', 'ddos', attackType, `Attaque DDoS détectée: ${attackType}`, {
        attackId: attack.id,
        sourceIPs: sourceIPs.length,
        attackType,
        targetEndpoint,
        requestsPerSecond
      });

      // Créer une alerte critique
      await this.createSecurityAlert({
        level: 'critical',
        title: 'Attaque DDoS détectée',
        description: `Une attaque DDoS de type ${attackType} a été détectée sur ${targetEndpoint}`,
        category: 'ddos',
        source: sourceIPs.join(', '),
        metadata: {
          attackType,
          requestsPerSecond,
          sourceIPs: sourceIPs.length,
          targetEndpoint
        }
      });

      return attack;
    } catch (error) {
      logger.error('Erreur lors de l\'enregistrement de l\'attaque DDoS:', error);
      throw error;
    }
  }

  // Analyser automatiquement les vulnérabilités
  async analyzeVulnerabilities() {
    try {
      // Cette fonction analyserait automatiquement les dépendances,
      // configurations, etc. pour détecter les vulnérabilités

      // Simulation d'analyse de vulnérabilités
      const mockVulnerabilities = [
        {
          title: 'Configuration CORS trop permissive détectée',
          description: 'L\'API Gateway accepte des origines trop larges',
          severity: 'high',
          cvssScore: 7.5,
          affectedComponent: 'api-gateway',
          status: 'open',
          tags: ['cors', 'configuration', 'security'],
          remediation: 'Restreindre les origines autorisées dans la configuration'
        },
        {
          title: 'Version obsolète de Express détectée',
          description: 'Express.js version 4.18.2 présente des failles de sécurité connues',
          severity: 'medium',
          cveId: 'CVE-2023-12345',
          cvssScore: 6.5,
          affectedComponent: 'express',
          status: 'open',
          tags: ['npm', 'express', 'dependencies'],
          remediation: 'Mettre à jour vers Express 4.19.0 ou supérieure'
        }
      ];

      // Enregistrer les vulnérabilités trouvées
      for (const vuln of mockVulnerabilities) {
        try {
          // Chercher d'abord si la vulnérabilité existe déjà
          const existing = await prisma.vulnerability.findFirst({
            where: {
              title: vuln.title,
              affectedComponent: vuln.affectedComponent
            }
          });

          if (existing) {
            // Mettre à jour si elle existe
            await prisma.vulnerability.update({
              where: { id: existing.id },
              data: vuln
            });
          } else {
            // Créer si elle n'existe pas
            await prisma.vulnerability.create({
              data: vuln
            });
          }
        } catch (error) {
          // Gérer les erreurs P2021 (table non trouvée) gracieusement
          if (error.code === 'P2021' || error.message?.includes('does not exist')) {
            if (process.env.NODE_ENV === 'development') {
              // Mode silencieux - ignorer
              continue;
            } else {
              logger.warn('Table vulnerabilities non trouvée, vulnérabilité non enregistrée');
            }
          } else {
            throw error;
          }
        }
      }

      logger.info(`Analyse de vulnérabilités terminée: ${mockVulnerabilities.length} vulnérabilités analysées`);

    } catch (error) {
      logger.error('Erreur lors de l\'analyse des vulnérabilités:', error);
    }
  }

  // Récupérer les tendances de sécurité par heure
  async getSecurityTrendsByHour(hours = 24) {
    try {
      // Vérifier que la table existe
      if (!prisma.securityLog || typeof prisma.securityLog.findMany !== 'function') {
        if (process.env.NODE_ENV === 'development') {
          // Mode silencieux - ne pas logger
          return [];
        }
        throw new Error('Table SecurityLog non disponible');
      }

      const startDate = new Date();
      startDate.setHours(startDate.getHours() - hours);

      const trends = await prisma.$queryRaw`
        SELECT
          DATE_TRUNC('hour', timestamp) as hour,
          COUNT(*)::int as total_logs,
          COUNT(CASE WHEN level = 'critical' THEN 1 END)::int as critical_events,
          COUNT(CASE WHEN category = 'intrusion' THEN 1 END)::int as intrusion_attempts,
          COUNT(CASE WHEN category = 'ddos' THEN 1 END)::int as ddos_attacks,
          COUNT(CASE WHEN category = 'vulnerability' THEN 1 END)::int as vulnerabilities,
          COUNT(CASE WHEN eventType = 'login_attempt' THEN 1 END)::int as auth_failures
        FROM security_logs
        WHERE timestamp >= ${startDate}
        GROUP BY DATE_TRUNC('hour', timestamp)
        ORDER BY hour ASC
      `;

      // Remplir les heures manquantes avec des zéros
      const result = [];
      const trendsArray = Array.isArray(trends) ? trends : [];
      for (let i = 0; i < hours; i++) {
        const hour = new Date(startDate.getTime() + i * 60 * 60 * 1000);
        const existingTrend = trendsArray.find(t => {
          const trendHour = new Date(t.hour);
          return trendHour.getTime() === hour.getTime();
        });

        result.push({
          hour: hour.toISOString(),
          attacks: existingTrend ? parseInt(existingTrend.intrusion_attempts) : 0,
          threats: existingTrend ? parseInt(existingTrend.critical_events) : 0,
          authFailures: existingTrend ? parseInt(existingTrend.auth_failures) : 0,
          totalLogs: existingTrend ? parseInt(existingTrend.total_logs) : 0
        });
      }

      return result;
    } catch (error) {
      // Gérer les erreurs P2021 (table non trouvée) gracieusement - Mode silencieux en développement
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        if (process.env.NODE_ENV === 'development') {
          // Mode silencieux - ne pas logger
          return [];
        }
      }
      // En production, logger l'erreur
      if (process.env.NODE_ENV === 'production') {
        logger.error('Erreur lors de la récupération des tendances de sécurité:', error);
      }
      return [];
    }
  }

  // Récupérer les métriques système en temps réel
  async getSystemMetrics() {
    try {
      // Récupérer les métriques récentes (dernière heure)
      let recentLogs = [];
      try {
        // Vérifier que la table existe
        if (!prisma.securityLog || typeof prisma.securityLog.findMany !== 'function') {
          if (process.env.NODE_ENV === 'development') {
            // Mode silencieux - ne pas logger
            recentLogs = [];
          } else {
            throw new Error('Table SecurityLog non disponible');
          }
        } else {
          recentLogs = await prisma.securityLog.findMany({
            where: {
              timestamp: {
                gte: new Date(Date.now() - 60 * 60 * 1000) // Dernière heure
              }
            },
            orderBy: { timestamp: 'desc' },
            take: 1000
          });
        }
      } catch (error) {
        // Fallback si table SecurityLog n'existe pas (P2021) - Mode silencieux en développement
        if (error.code === 'P2021' || error.message?.includes('does not exist')) {
          if (process.env.NODE_ENV === 'development') {
            // Mode silencieux - ne pas logger
            recentLogs = [];
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }

      // Calculer les métriques à partir des vraies données collectées
      const totalLogs = recentLogs.length;
      const criticalEvents = recentLogs.filter(log => log.level === 'critical').length;
      const intrusionAttempts = recentLogs.filter(log => log.category === 'intrusion').length;
      const ddosAttacks = recentLogs.filter(log => log.category === 'ddos').length;
      const authFailures = recentLogs.filter(log => log.eventType === 'login_attempt' && log.level === 'warning').length;

      // Calculer les métriques système basées sur les logs réels
      const uniqueIPs = new Set(recentLogs.map(log => log.sourceIP)).size;
      const blockedIPs = recentLogs.filter(log => log.isBlocked).length;

      const metrics = {
        totalLogs,
        criticalEvents,
        intrusionAttempts,
        ddosAttacks,
        authFailures,
        uniqueIPs,
        blockedIPs,
        averageRiskScore: totalLogs > 0 ? recentLogs.reduce((sum, log) => sum + (log.riskScore || 0), 0) / totalLogs : 0
      };

      // Stocker les métriques en base de données pour l'historique
      await this.storeSystemMetrics(metrics);

      return metrics;
    } catch (error) {
      // Gérer les erreurs P2021 (table non trouvée) gracieusement - mode silencieux en développement
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        if (process.env.NODE_ENV === 'development') {
          // Mode silencieux - retourner des métriques vides sans logger
          return {
            totalLogs: 0,
            criticalEvents: 0,
            intrusionAttempts: 0,
            ddosAttacks: 0,
            authFailures: 0,
            uniqueIPs: 0,
            blockedIPs: 0,
            averageRiskScore: 0
          };
        }
      }
      // En production uniquement, logger l'erreur
      if (process.env.NODE_ENV === 'production') {
        logger.error('Erreur lors de la récupération des métriques système:', error);
      }
      return {
        totalLogs: 0,
        criticalEvents: 0,
        intrusionAttempts: 0,
        ddosAttacks: 0,
        authFailures: 0,
        uniqueIPs: 0,
        blockedIPs: 0,
        averageRiskScore: 0
      };
    }
  }

  // Calculer les métriques système à partir des logs
  calculateSystemMetrics(logs) {
    const totalLogs = logs.length;
    const criticalEvents = logs.filter(log => log.level === 'critical').length;
    const intrusionAttempts = logs.filter(log => log.category === 'intrusion').length;
    const ddosAttacks = logs.filter(log => log.category === 'ddos').length;
    const authFailures = logs.filter(log => log.eventType === 'login_attempt' && log.level === 'warning').length;

    // Calculer les métriques système basées sur les logs
    const uniqueIPs = new Set(logs.map(log => log.sourceIP)).size;
    const blockedIPs = logs.filter(log => log.isBlocked).length;

    return {
      totalLogs,
      criticalEvents,
      intrusionAttempts,
      ddosAttacks,
      authFailures,
      uniqueIPs,
      blockedIPs,
      averageRiskScore: totalLogs > 0 ? logs.reduce((sum, log) => sum + (log.riskScore || 0), 0) / totalLogs : 0
    };
  }

  // Récupérer les tendances d'erreurs système
  async getErrorTrends(hours = 24) {
    try {
      // Vérifier que la table existe
      if (!prisma.securityLog || typeof prisma.securityLog.findMany !== 'function') {
        if (process.env.NODE_ENV === 'development') {
          // Mode silencieux - ne pas logger
          return [];
        }
        throw new Error('Table SecurityLog non disponible');
      }

      const startDate = new Date();
      startDate.setHours(startDate.getHours() - hours);

      // Récupérer les erreurs par heure
      const errorTrends = await prisma.$queryRaw`
        SELECT
          DATE_TRUNC('hour', timestamp) as hour,
          COUNT(*) as error_count,
          COUNT(CASE WHEN level = 'error' THEN 1 END) as errors,
          COUNT(CASE WHEN level = 'warning' THEN 1 END) as warnings
        FROM security_logs
        WHERE timestamp >= ${startDate}
        AND level IN ('error', 'warning')
        GROUP BY DATE_TRUNC('hour', timestamp)
        ORDER BY hour ASC
      `;

      // Remplir les heures manquantes
      const result = [];
      const errorTrendsArray = Array.isArray(errorTrends) ? errorTrends : [];
      for (let i = 0; i < hours; i++) {
        const hour = new Date(startDate.getTime() + i * 60 * 60 * 1000);
        const existingTrend = errorTrendsArray.find(t => {
          const trendHour = new Date(t.hour);
          return trendHour.getTime() === hour.getTime();
        });

        result.push({
          hour: `${i.toString().padStart(2, '0')}:00`,
          count: existingTrend ? parseInt(existingTrend.error_count) : 0
        });
      }

      return result;
    } catch (error) {
      // Gérer les erreurs P2021 (table non trouvée) gracieusement - Mode silencieux en développement
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        if (process.env.NODE_ENV === 'development') {
          // Mode silencieux - ne pas logger
          return Array.from({ length: hours }, (_, i) => ({
            hour: `${i.toString().padStart(2, '0')}:00`,
            count: 0
          }));
        }
      }
      // En production, logger l'erreur
      if (process.env.NODE_ENV === 'production') {
        logger.error('Erreur lors de la récupération des tendances d\'erreurs:', error);
      }
      return Array.from({ length: hours }, (_, i) => ({
        hour: `${i.toString().padStart(2, '0')}:00`,
        count: 0
      }));
    }
  }

  // Analyser et enregistrer les vraies données de sécurité
  async analyzeAndRecordSecurityData() {
    try {
      // Récupérer les données de sécurité récentes pour analyse
      let recentLogs;
      try {
        recentLogs = await prisma.securityLog.findMany({
          where: {
            timestamp: {
              gte: new Date(Date.now() - 60 * 60 * 1000) // Dernière heure
            }
          },
          orderBy: { timestamp: 'desc' },
          take: 1000
        });
      } catch (error) {
        // Fallback si table SecurityLog n'existe pas (P2021) - Mode silencieux en développement
        if (error.code === 'P2021' || error.message?.includes('does not exist')) {
          if (process.env.NODE_ENV === 'development') {
            // Mode silencieux - ne pas logger
            return { success: true, message: 'Table SecurityLog non trouvée' };
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }

      // Analyser les patterns d'attaques
      const attackAnalysis = this.analyzeAttackPatterns(recentLogs);

      // Créer des alertes si nécessaire
      if (attackAnalysis.criticalThreats > 0) {
        try {
          await this.createSecurityAlert({
            level: 'critical',
            title: 'Activité d\'attaque critique détectée',
            description: `${attackAnalysis.criticalThreats} menaces critiques détectées dans la dernière heure`,
            category: 'threat_analysis',
            source: 'security-analyzer',
            metadata: attackAnalysis
          });
        } catch (error) {
          // Gérer silencieusement les erreurs P2021 en développement
          if (error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('relation')) {
            if (process.env.NODE_ENV === 'development') {
              // Mode silencieux - ignorer
            } else {
              throw error;
            }
          } else {
            throw error;
          }
        }
      }

      logger.info(`Analyse de sécurité terminée: ${recentLogs.length} logs analysés`);
    } catch (error) {
      // Gérer les erreurs P2021 (table non trouvée) gracieusement - mode silencieux en développement
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        if (process.env.NODE_ENV === 'development') {
          // Mode silencieux - ne pas logger
          return { success: true, message: 'Table SecurityLog non trouvée' };
        }
      }
      // En production uniquement, logger l'erreur
      if (process.env.NODE_ENV === 'production') {
        logger.error('Erreur lors de l\'analyse des données de sécurité:', error);
      }
    }
  }

  // Analyser les patterns d'attaques dans les logs
  analyzeAttackPatterns(logs) {
    const analysis = {
      totalLogs: logs.length,
      criticalThreats: 0,
      intrusionAttempts: 0,
      suspiciousIPs: new Set(),
      attackTypes: {},
      countries: {}
    };

    logs.forEach(log => {
      if (log.level === 'critical' || log.level === 'error') {
        analysis.criticalThreats++;

        if (log.category === 'intrusion') {
          analysis.intrusionAttempts++;
        }

        if (log.sourceIP) {
          analysis.suspiciousIPs.add(log.sourceIP);
        }

        if (log.country) {
          analysis.countries[log.country] = (analysis.countries[log.country] || 0) + 1;
        }
      }

      // Compter les types d'attaques
      if (log.category) {
        analysis.attackTypes[log.category] = (analysis.attackTypes[log.category] || 0) + 1;
      }
    });

    analysis.suspiciousIPs = Array.from(analysis.suspiciousIPs);

    return analysis;
  }

  // Analyser les risques de sécurité en temps réel
  async analyzeSecurityRisks() {
    try {
      const now = new Date();
      const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
      const lastDay = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Récupérer les données récentes pour analyse
      let recentLogs;
      try {
        recentLogs = await prisma.securityLog.findMany({
          where: { timestamp: { gte: lastHour } },
          orderBy: { timestamp: 'desc' }
        });
      } catch (error) {
        // Fallback si table SecurityLog n'existe pas (P2021) - Mode développement
        if (error.code === 'P2021' && process.env.NODE_ENV !== 'production') {
          // Mode silencieux - ne pas logger
          recentLogs = [];
        } else {
          throw error;
        }
      }

      const [intrusionAttempts, ddosAttacks, vulnerabilities] = await Promise.all([
        prisma.intrusionAttempt.findMany({
          where: { timestamp: { gte: lastDay } },
          orderBy: { timestamp: 'desc' }
        }),
        prisma.dDoSAttack.findMany({
          where: { timestamp: { gte: lastDay } },
          orderBy: { timestamp: 'desc' }
        }),
        prisma.vulnerability.findMany({
          where: { status: { in: ['open', 'in_progress'] } }
        })
      ]);

      // Analyser les risques
      const riskAnalysis = {
        overallRisk: this.calculateOverallRisk(recentLogs, intrusionAttempts, ddosAttacks, vulnerabilities),
        attackTrends: this.analyzeAttackTrends(recentLogs),
        vulnerabilityAssessment: this.assessVulnerabilities(vulnerabilities),
        ipReputation: this.analyzeIPReputation(recentLogs),
        recommendations: this.generateSecurityRecommendations(riskAnalysis)
      };

      return riskAnalysis;
    } catch (error) {
      logger.error('Erreur lors de l\'analyse des risques de sécurité:', error);
      return {
        overallRisk: 'medium',
        attackTrends: {},
        vulnerabilityAssessment: {},
        ipReputation: {},
        recommendations: []
      };
    }
  }

  // Calculer le risque global
  calculateOverallRisk(logs, intrusions, ddos, vulnerabilities) {
    let riskScore = 0;

    // Évaluer les logs récents
    const criticalLogs = logs.filter(log => log.level === 'critical').length;
    const errorLogs = logs.filter(log => log.level === 'error').length;
    const warningLogs = logs.filter(log => log.level === 'warning').length;

    riskScore += criticalLogs * 25; // 25 points par log critique
    riskScore += errorLogs * 10;    // 10 points par log d'erreur
    riskScore += warningLogs * 5;   // 5 points par log d'avertissement

    // Évaluer les tentatives d'intrusion
    const highRiskIntrusions = intrusions.filter(i => i.riskScore > 70).length;
    const mediumRiskIntrusions = intrusions.filter(i => i.riskScore > 40 && i.riskScore <= 70).length;

    riskScore += highRiskIntrusions * 20;
    riskScore += mediumRiskIntrusions * 10;

    // Évaluer les attaques DDoS
    const recentDDoS = ddos.filter(d => d.timestamp > new Date(Date.now() - 60 * 60 * 1000)).length;
    riskScore += recentDDoS * 30;

    // Évaluer les vulnérabilités
    const highSeverityVulns = vulnerabilities.filter(v => v.severity === 'high' || v.severity === 'critical').length;
    const mediumSeverityVulns = vulnerabilities.filter(v => v.severity === 'medium').length;

    riskScore += highSeverityVulns * 15;
    riskScore += mediumSeverityVulns * 8;

    // Déterminer le niveau de risque global
    if (riskScore >= 100) return 'critical';
    if (riskScore >= 50) return 'high';
    if (riskScore >= 20) return 'medium';
    return 'low';
  }

  // Analyser les tendances d'attaques
  analyzeAttackTrends(logs) {
    const now = new Date();
    const trends = {
      hourly: {},
      byType: {},
      byCountry: {}
    };

    // Analyser par heure (dernières 24 heures)
    for (let i = 0; i < 24; i++) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourLogs = logs.filter(log =>
        log.timestamp >= new Date(hour.getTime() - 60 * 60 * 1000) &&
        log.timestamp < hour
      );

      trends.hourly[i] = {
        total: hourLogs.length,
        critical: hourLogs.filter(l => l.level === 'critical').length,
        intrusion: hourLogs.filter(l => l.category === 'intrusion').length,
        ddos: hourLogs.filter(l => l.category === 'ddos').length
      };
    }

    // Analyser par type d'attaque
    const attackTypes = ['intrusion', 'ddos', 'authentication', 'vulnerability'];
    attackTypes.forEach(type => {
      trends.byType[type] = logs.filter(log => log.category === type).length;
    });

    // Analyser par pays
    const countries = {};
    logs.forEach(log => {
      if (log.country) {
        countries[log.country] = (countries[log.country] || 0) + 1;
      }
    });
    trends.byCountry = Object.entries(countries)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .reduce((obj, [country, count]) => ({ ...obj, [country]: count }), {});

    return trends;
  }

  // Évaluer les vulnérabilités
  assessVulnerabilities(vulnerabilities) {
    const assessment = {
      total: vulnerabilities.length,
      bySeverity: {},
      byComponent: {},
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      averageCVSS: 0
    };

    // Compter par sévérité
    vulnerabilities.forEach(vuln => {
      assessment.bySeverity[vuln.severity] = (assessment.bySeverity[vuln.severity] || 0) + 1;

      if (vuln.severity === 'critical') assessment.critical++;
      else if (vuln.severity === 'high') assessment.high++;
      else if (vuln.severity === 'medium') assessment.medium++;
      else if (vuln.severity === 'low') assessment.low++;

      assessment.byComponent[vuln.affectedComponent] = (assessment.byComponent[vuln.affectedComponent] || 0) + 1;
    });

    // Calculer le CVSS moyen
    if (vulnerabilities.length > 0) {
      assessment.averageCVSS = vulnerabilities.reduce((sum, vuln) => sum + (vuln.cvssScore || 0), 0) / vulnerabilities.length;
    }

    return assessment;
  }

  // Analyser la réputation des IPs
  analyzeIPReputation(logs) {
    const ipReputation = {};

    logs.forEach(log => {
      if (log.sourceIP) {
        if (!ipReputation[log.sourceIP]) {
          ipReputation[log.sourceIP] = {
            totalRequests: 0,
            suspiciousActivity: 0,
            blocked: false,
            riskScore: 0,
            lastSeen: log.timestamp,
            countries: new Set()
          };
        }

        const rep = ipReputation[log.sourceIP];
        rep.totalRequests++;
        rep.lastSeen = log.timestamp;

        if (log.category === 'intrusion' || log.level === 'error') {
          rep.suspiciousActivity++;
          rep.riskScore += log.riskScore || 10;
        }

        if (log.country) {
          rep.countries.add(log.country);
        }

        if (log.isBlocked) {
          rep.blocked = true;
        }
      }
    });

    // Calculer les scores de réputation
    Object.values(ipReputation).forEach(rep => {
      rep.reputationScore = Math.max(0, 100 - (rep.suspiciousActivity * 10) - (rep.riskScore / 10));
      rep.countries = Array.from(rep.countries);
    });

    return ipReputation;
  }

  // Générer des recommandations de sécurité
  generateSecurityRecommendations(analysis) {
    const recommendations = [];

    if (analysis.overallRisk === 'critical' || analysis.overallRisk === 'high') {
      recommendations.push({
        priority: 'critical',
        category: 'immediate',
        title: 'Risque de sécurité élevé détecté',
        description: 'Des activités suspectes importantes ont été détectées. Révision immédiate requise.',
        actions: ['Réviser les logs de sécurité', 'Vérifier les IPs suspectes', 'Activer les mesures de protection avancées']
      });
    }

    if (analysis.vulnerabilityAssessment.critical > 0) {
      recommendations.push({
        priority: 'high',
        category: 'vulnerabilities',
        title: 'Vulnérabilités critiques non corrigées',
        description: `${analysis.vulnerabilityAssessment.critical} vulnérabilités critiques nécessitent une attention immédiate.`,
        actions: ['Corriger les vulnérabilités critiques', 'Planifier les mises à jour de sécurité', 'Réviser la politique de sécurité']
      });
    }

    if (analysis.attackTrends.byType.intrusion > 10) {
      recommendations.push({
        priority: 'medium',
        category: 'intrusion',
        title: 'Activité d\'intrusion élevée',
        description: 'Nombre élevé de tentatives d\'intrusion détectées récemment.',
        actions: ['Renforcer les règles de pare-feu', 'Activer la protection DDoS', 'Surveiller les IPs suspectes']
      });
    }

    if (analysis.attackTrends.byType.ddos > 5) {
      recommendations.push({
        priority: 'medium',
        category: 'ddos',
        title: 'Activité DDoS détectée',
        description: 'Attaques par déni de service détectées récemment.',
        actions: ['Activer la limitation de taux', 'Configurer les règles anti-DDoS', 'Surveiller la bande passante']
      });
    }

    return recommendations;
  }

  // Stocker les métriques système en base de données
  async storeSystemMetrics(metrics) {
    try {
      // Vérifier que la table existe
      if (!prisma.securityMetric || typeof prisma.securityMetric.create !== 'function') {
        throw new Error('Table SecurityMetric non disponible');
      }

      await prisma.securityMetric.create({
        data: {
          metricType: 'system_metrics',
          value: metrics.totalLogs,
          unit: 'count',
          period: 'hour',
          metadata: {
            criticalEvents: metrics.criticalEvents,
            intrusionAttempts: metrics.intrusionAttempts,
            ddosAttacks: metrics.ddosAttacks,
            authFailures: metrics.authFailures,
            uniqueIPs: metrics.uniqueIPs,
            blockedIPs: metrics.blockedIPs,
            averageRiskScore: metrics.averageRiskScore,
            timestamp: new Date()
          }
        }
      });
    } catch (error) {
      // Gérer l'erreur P2021 (table n'existe pas) gracieusement
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        // Table n'existe pas encore, ignorer silencieusement en développement
        if (process.env.NODE_ENV === 'development') {
          // Mode silencieux - ne pas logger
          return;
        } else {
          logger.warn('Table security_metrics non trouvée, métriques système non enregistrées');
          return;
        }
      }
      // Pour les autres erreurs, logger et propager
      logger.error('Erreur lors du stockage des métriques système:', error);
      throw error;
    }
  }

  // Nettoyer les anciens logs de sécurité
  async cleanupOldLogs(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      let deletedLogs;
      try {
        deletedLogs = await prisma.securityLog.deleteMany({
          where: {
            timestamp: {
              lt: cutoffDate
            }
          }
        });
        logger.info(`Nettoyage des logs de sécurité: ${deletedLogs.count} logs supprimés`);
      } catch (error) {
        // Fallback si table SecurityLog n'existe pas (P2021) - Mode silencieux en développement
        if (error.code === 'P2021' && process.env.NODE_ENV !== 'production') {
          // Mode silencieux - ne pas logger
          return 0;
        } else {
          throw error;
        }
      }

      return deletedLogs.count;
    } catch (error) {
      logger.error('Erreur lors du nettoyage des logs de sécurité:', error);
      throw error;
    }
  }
}

module.exports = new SecurityService();
