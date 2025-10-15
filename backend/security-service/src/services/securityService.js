const { prisma } = require('../config/database');
const { logger, logSecurityEvent } = require('../utils/logger');
const dataGenerator = require('./dataGenerator');

class SecurityService {
  constructor() {
    this.analysisCache = new Map();
  }

  // Récupérer les métriques de sécurité pour le dashboard
  async getSecurityMetrics(filters = {}) {
    try {
      const { days = 7, category } = filters;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Récupérer les logs de sécurité récents (données réelles collectées)
      const securityLogs = await this.getSecurityLogs({
        startDate,
        category,
        limit: 1000
      });

      // Analyser les métriques à partir des vraies données collectées
      const metrics = await this.analyzeSecurityMetrics(securityLogs);

      return {
        overview: {
          totalLogs: metrics.totalLogs,
          criticalEvents: metrics.criticalEvents,
          intrusionAttempts: metrics.intrusionAttempts,
          ddosAttacks: metrics.ddosAttacks,
          vulnerabilities: metrics.vulnerabilities,
          securityScore: this.calculateSecurityScore(metrics)
        },
        logs: securityLogs.slice(0, 10), // 10 logs les plus récents
        trends: await this.getSecurityTrends(days),
        topThreats: await this.getTopThreats(days),
        vulnerabilities: await this.getVulnerabilities(),
        alerts: await this.getSecurityAlerts()
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
      logger.error('Erreur lors de la récupération des logs de sécurité:', error);
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
          COUNT(*) as total_logs,
          COUNT(CASE WHEN level = 'critical' THEN 1 END) as critical_events,
          COUNT(CASE WHEN category = 'intrusion' THEN 1 END) as intrusion_attempts,
          COUNT(CASE WHEN category = 'ddos' THEN 1 END) as ddos_attacks,
          COUNT(CASE WHEN category = 'vulnerability' THEN 1 END) as vulnerabilities
        FROM security_logs
        WHERE timestamp >= ${startDate}
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
      `;

      return dailyLogs;
    } catch (error) {
      logger.error('Erreur lors de la récupération des tendances de sécurité:', error);
      return [];
    }
  }

  // Récupérer les principales menaces
  async getTopThreats(days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const threats = await prisma.$queryRaw`
        SELECT
          sourceIP,
          country,
          COUNT(*) as attempts,
          MAX(riskScore) as max_risk_score,
          ARRAY_AGG(DISTINCT category) as categories,
          MAX(timestamp) as last_seen
        FROM security_logs
        WHERE timestamp >= ${startDate}
        AND (category = 'intrusion' OR category = 'ddos')
        GROUP BY sourceIP, country
        ORDER BY attempts DESC, max_risk_score DESC
        LIMIT 10
      `;

      return threats;
    } catch (error) {
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
      logger.error('Erreur lors de la création de l\'alerte de sécurité:', error);
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
        await prisma.vulnerability.upsert({
          where: {
            title_affectedComponent: {
              title: vuln.title,
              affectedComponent: vuln.affectedComponent
            }
          },
          update: vuln,
          create: vuln
        });
      }

      logger.info(`Analyse de vulnérabilités terminée: ${mockVulnerabilities.length} vulnérabilités analysées`);

    } catch (error) {
      logger.error('Erreur lors de l\'analyse des vulnérabilités:', error);
    }
  }

  // Récupérer les tendances de sécurité par heure
  async getSecurityTrendsByHour(hours = 24) {
    try {
      const startDate = new Date();
      startDate.setHours(startDate.getHours() - hours);

      const trends = await prisma.$queryRaw`
        SELECT
          DATE_TRUNC('hour', timestamp) as hour,
          COUNT(*) as total_logs,
          COUNT(CASE WHEN level = 'critical' THEN 1 END) as critical_events,
          COUNT(CASE WHEN category = 'intrusion' THEN 1 END) as intrusion_attempts,
          COUNT(CASE WHEN category = 'ddos' THEN 1 END) as ddos_attacks,
          COUNT(CASE WHEN category = 'vulnerability' THEN 1 END) as vulnerabilities,
          COUNT(CASE WHEN eventType = 'login_attempt' THEN 1 END) as auth_failures
        FROM security_logs
        WHERE timestamp >= ${startDate}
        GROUP BY DATE_TRUNC('hour', timestamp)
        ORDER BY hour ASC
      `;

      // Remplir les heures manquantes avec des zéros
      const result = [];
      for (let i = 0; i < hours; i++) {
        const hour = new Date(startDate.getTime() + i * 60 * 60 * 1000);
        const existingTrend = trends.find(t => {
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
      logger.error('Erreur lors de la récupération des tendances de sécurité:', error);
      return [];
    }
  }

  // Récupérer les métriques système en temps réel
  async getSystemMetrics() {
    try {
      // Récupérer les métriques récentes (dernière heure)
      const recentLogs = await prisma.securityLog.findMany({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 60 * 60 * 1000) // Dernière heure
          }
        },
        orderBy: { timestamp: 'desc' },
        take: 1000
      });

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
      logger.error('Erreur lors de la récupération des métriques système:', error);
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
      for (let i = 0; i < hours; i++) {
        const hour = new Date(startDate.getTime() + i * 60 * 60 * 1000);
        const existingTrend = errorTrends.find(t => {
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
      logger.error('Erreur lors de la récupération des tendances d\'erreurs:', error);
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
      const recentLogs = await prisma.securityLog.findMany({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 60 * 60 * 1000) // Dernière heure
          }
        },
        orderBy: { timestamp: 'desc' },
        take: 1000
      });

      // Analyser les patterns d'attaques
      const attackAnalysis = this.analyzeAttackPatterns(recentLogs);

      // Créer des alertes si nécessaire
      if (attackAnalysis.criticalThreats > 0) {
        await this.createSecurityAlert({
          level: 'critical',
          title: 'Activité d\'attaque critique détectée',
          description: `${attackAnalysis.criticalThreats} menaces critiques détectées dans la dernière heure`,
          category: 'threat_analysis',
          source: 'security-analyzer',
          metadata: attackAnalysis
        });
      }

      logger.info(`Analyse de sécurité terminée: ${recentLogs.length} logs analysés`);
    } catch (error) {
      logger.error('Erreur lors de l\'analyse des données de sécurité:', error);
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
      const [recentLogs, intrusionAttempts, ddosAttacks, vulnerabilities] = await Promise.all([
        prisma.securityLog.findMany({
          where: { timestamp: { gte: lastHour } },
          orderBy: { timestamp: 'desc' }
        }),
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
      logger.error('Erreur lors du stockage des métriques système:', error);
    }
  }

  // Nettoyer les anciens logs de sécurité
  async cleanupOldLogs(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const deletedLogs = await prisma.securityLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      });

      logger.info(`Nettoyage des logs de sécurité: ${deletedLogs.count} logs supprimés`);

      return deletedLogs.count;
    } catch (error) {
      logger.error('Erreur lors du nettoyage des logs de sécurité:', error);
      throw error;
    }
  }
}

module.exports = new SecurityService();
