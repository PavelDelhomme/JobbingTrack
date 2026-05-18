const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');
const { prisma } = require('../config/database');
const { logger, logSecurityEvent } = require('../utils/logger');
const dataGenerator = require('./dataGenerator');
const securityAlertEmailNotifier = require('./securityAlertEmailNotifier');
const { lookupGeoIp } = require('../utils/geoipProvider');

const CVE_SCAN_RELATIVE_PATH = path.join('scripts', 'security', 'cve-scan.py');
const CVE_SCAN_DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const CVE_SCAN_DEFAULT_COMMAND_TIMEOUT_SEC = 120;
const CVE_SCAN_DEFAULT_OUTPUT_DIR = 'tests/results/security';
const CVE_SEVERITY_ORDER = ['info', 'low', 'medium', 'moderate', 'high', 'critical'];

class SecurityService {
  constructor() {
    this.analysisCache = new Map();
    this.prisma = prisma; // ✅ Exposer prisma pour le controller
    this.cveScanInProgress = null;
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
        const metricsLogs = await this.getSecurityLogs({
          startDate,
          category,
          limit: 1000
        });
        securityLogs = metricsLogs.logs || [];
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

      const [logs, total] = await Promise.all([
        prisma.securityLog.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: limit,
          skip: offset
        }),
        prisma.securityLog.count({ where })
      ]);

      return { logs, total };
    } catch (error) {
      // Fallback si table SecurityLog n'existe pas (P2021) - Mode silencieux en développement
      if (error.code === 'P2021' && process.env.NODE_ENV !== 'production') {
        // Mode silencieux - ne pas logger
        return { logs: [], total: 0 };
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

      // Logger l'événement (ne pas utiliser la clé "level" : réservée à Winston)
      logger.info(`Log de sécurité créé: ${eventType} - ${message}`, {
        logId: log.id,
        eventLevel: level,
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
      suspiciousActivities: 0,
      firewallEvents: 0,
      wafEvents: 0,
      networkThreats: 0,
      firewallRules: 0,
      wafRules: 0
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
        case 'firewall':
          metrics.firewallEvents++;
          if (log.eventType === 'ip_blocked_manually' || log.eventType === 'threat_blocked') {
            metrics.blockedIPs++;
          }
          break;
        case 'waf':
          metrics.wafEvents++;
          break;
      }

      if (log.eventType === 'suspicious_activity') {
        metrics.suspiciousActivities++;
      }

      if (log.eventType === 'network_threat_detected') {
        metrics.networkThreats++;
      }

      if (log.eventType === 'firewall_rule_created' || log.eventType === 'firewall_rule_updated') {
        metrics.firewallRules++;
      }

      if (log.eventType === 'waf_rule_toggled') {
        metrics.wafRules++;
      }
    }

    // Enrichir avec les données du firewall et des menaces réseau
    try {
      // Compter les règles firewall actives
      const firewallRulesCount = await prisma.firewallRule.count({
        where: { enabled: true }
      }).catch(() => 0);
      metrics.firewallRules = firewallRulesCount;

      // Compter les menaces réseau récentes (dernières 24h)
      const networkThreatsCount = await prisma.networkThreat.count({
        where: {
          detectedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }).catch(() => 0);
      metrics.networkThreats = networkThreatsCount;
    } catch (error) {
      // Ignorer les erreurs si les tables n'existent pas
      if (error.code !== 'P2021' && !error.message?.includes('does not exist')) {
        logger.error('Erreur enrichissement métriques firewall:', error);
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
        source,
        ...(metadata && typeof metadata === 'object' ? metadata : {})
      });

      await securityAlertEmailNotifier.notifySecurityAlert(alert);

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

      const geo = lookupGeoIp(sourceIP);

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
        const geo = lookupGeoIp(ip);
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

  findProjectRoot() {
    const candidates = [
      process.env.CVE_SCAN_PROJECT_ROOT,
      process.env.PROJECT_ROOT,
      path.resolve(process.cwd(), '..', '..'),
      path.resolve(process.cwd(), '..'),
      process.cwd()
    ].filter(Boolean);

    return candidates.find((candidate) => (
      fs.existsSync(path.join(candidate, CVE_SCAN_RELATIVE_PATH))
    ));
  }

  runCveScan(projectRoot) {
    const pythonBin = process.env.CVE_SCAN_PYTHON_BIN || 'python3';
    const timeoutSec = Number(process.env.CVE_SCAN_TIMEOUT_SEC || CVE_SCAN_DEFAULT_COMMAND_TIMEOUT_SEC);
    const timeoutMs = Number(process.env.CVE_SCAN_TIMEOUT_MS || CVE_SCAN_DEFAULT_TIMEOUT_MS);
    const outputDir = process.env.CVE_SCAN_OUTPUT_DIR || CVE_SCAN_DEFAULT_OUTPUT_DIR;
    const args = [
      path.join(projectRoot, CVE_SCAN_RELATIVE_PATH),
      '--root',
      projectRoot,
      '--output-dir',
      outputDir,
      '--timeout-sec',
      String(Number.isFinite(timeoutSec) ? timeoutSec : CVE_SCAN_DEFAULT_COMMAND_TIMEOUT_SEC)
    ];

    if (process.env.CVE_SCAN_INCLUDE_DEV === '1') args.push('--include-dev');
    if (process.env.CVE_SCAN_DOCKER === '1') args.push('--docker');

    return new Promise((resolve, reject) => {
      const child = spawn(pythonBin, args, {
        cwd: projectRoot,
        env: {
          ...process.env,
          PROJECT_ROOT: projectRoot,
          CVE_SCAN_DOCKER: process.env.CVE_SCAN_DOCKER || '0',
          CVE_SCAN_STRICT: '0'
        },
        shell: false
      });
      let stdout = '';
      let stderr = '';
      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`CVE scan timeout after ${timeoutMs}ms`));
      }, Number.isFinite(timeoutMs) ? timeoutMs : CVE_SCAN_DEFAULT_TIMEOUT_MS);

      child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
      child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          reject(new Error(`CVE scan failed with code ${code}: ${stderr || stdout}`));
          return;
        }
        resolve({ stdout, stderr });
      });
    });
  }

  loadCveSummary(projectRoot, stdout) {
    const summaryMdPath = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .pop();
    if (!summaryMdPath) {
      throw new Error('CVE scan did not return a summary path');
    }

    const summaryJsonPath = path.join(path.dirname(path.resolve(projectRoot, summaryMdPath)), 'summary.json');
    return JSON.parse(fs.readFileSync(summaryJsonPath, 'utf8'));
  }

  severityFromCounts(counts = {}) {
    for (const severity of [...CVE_SEVERITY_ORDER].reverse()) {
      if (Number(counts[severity] || 0) > 0) {
        return severity === 'moderate' ? 'medium' : severity;
      }
    }
    return null;
  }

  mapCveResultToVulnerability(result, meta) {
    const severity = this.severityFromCounts(result.counts);
    if (!severity) return null;

    const findings = Array.isArray(result.findings) ? result.findings : [];
    const component = String(result.name || 'unknown').slice(0, 100);
    const title = `CVE ${result.kind}: ${component}`.slice(0, 200);
    const descriptionLines = [
      `Scan CVE ${result.kind} sur ${result.name}.`,
      `Statut scanner: ${result.status}.`,
      findings.length > 0 ? `Constats principaux: ${findings.slice(0, 8).join(' ; ')}` : null,
      result.error ? `Erreur scanner: ${String(result.error).slice(0, 500)}` : null
    ].filter(Boolean);

    return {
      title,
      description: descriptionLines.join('\n'),
      severity,
      affectedComponent: component,
      status: 'open',
      tags: ['cve', 'supply-chain', String(result.kind || 'unknown')],
      remediation: 'Consulter le rapport CVE généré, mettre à jour la dépendance/image concernée ou documenter une exception de sécurité.',
      metadata: {
        source: 'cve-scan.py',
        scanner: result.kind,
        surface: result.name,
        status: result.status,
        counts: result.counts || {},
        findings,
        command: result.command,
        exitCode: result.exit_code,
        generatedAt: meta?.generated_at,
        dockerScan: meta?.docker_scan,
        includeDev: meta?.include_dev
      }
    };
  }

  async upsertVulnerability(vuln) {
    const existing = await prisma.vulnerability.findFirst({
      where: {
        title: vuln.title,
        affectedComponent: vuln.affectedComponent
      }
    });

    if (existing) {
      return {
        created: false,
        vulnerability: await prisma.vulnerability.update({
          where: { id: existing.id },
          data: vuln
        })
      };
    }

    return {
      created: true,
      vulnerability: await prisma.vulnerability.create({ data: vuln })
    };
  }

  async alertOnNewCriticalVulnerability(vuln, source = 'cve-scan') {
    if (!['critical', 'high'].includes(vuln.severity)) return;
    await this.createSecurityAlert({
      level: vuln.severity === 'critical' ? 'critical' : 'high',
      title: `Nouvelle vulnérabilité ${vuln.severity}: ${vuln.affectedComponent}`,
      description: vuln.description,
      category: 'vulnerability',
      source,
      metadata: vuln.metadata
    });
  }

  resolveDependabotRepository(repository = process.env.DEPENDABOT_ALERTS_REPOSITORY) {
    const value = String(repository || '').trim();
    if (!value || !/^[^/\s]+\/[^/\s]+$/.test(value)) {
      throw new Error('DEPENDABOT_ALERTS_REPOSITORY doit être au format owner/repo');
    }
    return value;
  }

  getDependabotToken(token = process.env.DEPENDABOT_ALERTS_TOKEN || process.env.GITHUB_TOKEN) {
    const value = String(token || '').trim();
    if (!value) {
      throw new Error('GITHUB_TOKEN ou DEPENDABOT_ALERTS_TOKEN requis pour importer les alertes Dependabot');
    }
    return value;
  }

  async fetchDependabotAlerts(options = {}) {
    const repository = this.resolveDependabotRepository(options.repository);
    const token = this.getDependabotToken(options.token);
    const state = options.state || process.env.DEPENDABOT_ALERTS_STATE || 'open';
    const perPage = Math.min(Number(options.perPage || 100), 100);
    const maxPages = Math.max(Number(options.maxPages || process.env.DEPENDABOT_ALERTS_MAX_PAGES || 5), 1);
    const alerts = [];

    for (let page = 1; page <= maxPages; page++) {
      const response = await axios.get(`https://api.github.com/repos/${repository}/dependabot/alerts`, {
        params: {
          state,
          per_page: perPage,
          page
        },
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28'
        },
        timeout: Number(process.env.DEPENDABOT_ALERTS_TIMEOUT_MS || 15000)
      });

      const pageAlerts = Array.isArray(response.data) ? response.data : [];
      alerts.push(...pageAlerts);
      if (pageAlerts.length < perPage) break;
    }

    return alerts;
  }

  getDependabotIdentifier(alert, type) {
    const identifiers = alert?.security_advisory?.identifiers;
    if (!Array.isArray(identifiers)) return null;
    const found = identifiers.find((identifier) => String(identifier.type || '').toUpperCase() === type);
    return found?.value || null;
  }

  normalizeDependabotStatus(state) {
    switch (String(state || '').toLowerCase()) {
      case 'fixed':
        return 'resolved';
      case 'dismissed':
        return 'dismissed';
      default:
        return 'open';
    }
  }

  mapDependabotAlertToVulnerability(alert, meta = {}) {
    const advisory = alert?.security_advisory || {};
    const vulnerablePackage = alert?.security_vulnerability?.package || {};
    const securityVulnerability = alert?.security_vulnerability || {};
    const dependency = alert?.dependency || {};
    const packageName = String(vulnerablePackage.name || 'unknown').slice(0, 80);
    const ecosystem = String(vulnerablePackage.ecosystem || dependency.package?.ecosystem || 'unknown').toLowerCase();
    const ghsaId = advisory.ghsa_id || this.getDependabotIdentifier(alert, 'GHSA');
    const cveId = advisory.cve_id || this.getDependabotIdentifier(alert, 'CVE');
    const severity = String(advisory.severity || 'medium').toLowerCase();
    const patchedVersion = securityVulnerability.first_patched_version?.identifier || null;
    const manifestPath = dependency.manifest_path || null;
    const state = String(alert?.state || 'open').toLowerCase();
    const titlePrefix = ghsaId || cveId || `DEPENDABOT-${alert?.number || 'unknown'}`;
    const affectedComponent = `${ecosystem}:${packageName}`.slice(0, 100);

    return {
      title: `Dependabot ${titlePrefix}: ${packageName}`.slice(0, 200),
      description: String(advisory.description || advisory.summary || `Alerte Dependabot pour ${packageName}`).slice(0, 5000),
      severity: ['critical', 'high', 'medium', 'low'].includes(severity) ? severity : 'medium',
      cveId: cveId || null,
      cvssScore: advisory.cvss?.score ? Number(advisory.cvss.score) : null,
      affectedComponent,
      status: this.normalizeDependabotStatus(state),
      resolvedAt: state === 'fixed' ? new Date() : null,
      remediation: patchedVersion
        ? `Mettre à jour ${packageName} vers ${patchedVersion} ou une version supérieure.`
        : `Mettre à jour ${packageName} selon l'avis GitHub Dependabot.`,
      tags: ['dependabot', 'supply-chain', ecosystem].filter(Boolean),
      metadata: {
        source: 'dependabot',
        repository: meta.repository || null,
        importedAt: meta.importedAt || new Date().toISOString(),
        dependabotAlertNumber: alert?.number || null,
        dependabotState: state,
        ghsaId: ghsaId || null,
        cveId: cveId || null,
        packageName,
        ecosystem,
        manifestPath,
        vulnerableRange: securityVulnerability.vulnerable_version_range || null,
        patchedVersion,
        htmlUrl: alert?.html_url || null,
        advisoryUrl: advisory.url || null,
        dismissedReason: alert?.dismissed_reason || null,
        dismissedComment: alert?.dismissed_comment || null,
        dismissedAt: alert?.dismissed_at || null
      }
    };
  }

  async analyzeDependabotAlerts(options = {}) {
    try {
      const repository = this.resolveDependabotRepository(options.repository);
      const alerts = options.alerts || await this.fetchDependabotAlerts({ ...options, repository });
      const importedAt = new Date().toISOString();
      let saved = 0;
      let created = 0;
      let createdCriticalOrHigh = 0;

      for (const alert of alerts) {
        const vuln = this.mapDependabotAlertToVulnerability(alert, { repository, importedAt });
        const savedVuln = await this.upsertVulnerability(vuln);
        saved += 1;
        if (savedVuln.created) {
          created += 1;
          if (vuln.status === 'open' && ['critical', 'high'].includes(vuln.severity)) {
            await this.alertOnNewCriticalVulnerability(vuln, 'dependabot');
            createdCriticalOrHigh += 1;
          }
        }
      }

      logger.info(`Dependabot alerts import completed: ${saved} saved, ${created} created, ${createdCriticalOrHigh} alerts created`);
      return {
        scanned: true,
        repository,
        alerts: alerts.length,
        vulnerabilities: saved,
        created,
        securityAlerts: createdCriticalOrHigh
      };
    } catch (error) {
      logger.warn('Import Dependabot alerts ignoré:', error.message);
      return { scanned: false, reason: error.message, vulnerabilities: 0, securityAlerts: 0 };
    }
  }

  // Analyser automatiquement les vulnérabilités
  async analyzeVulnerabilities() {
    if (this.cveScanInProgress) {
      logger.info('CVE scan already running, skipping overlapping vulnerability analysis');
      return this.cveScanInProgress;
    }

    this.cveScanInProgress = this.analyzeVulnerabilitiesFromScanner()
      .finally(() => {
        this.cveScanInProgress = null;
      });
    return this.cveScanInProgress;
  }

  async analyzeVulnerabilitiesFromScanner() {
    try {
      const projectRoot = this.findProjectRoot();
      if (!projectRoot) {
        logger.warn('CVE scan skipped: project root with scripts/security/cve-scan.py not found');
        return { scanned: false, reason: 'project_root_not_found', vulnerabilities: 0 };
      }

      const scan = await this.runCveScan(projectRoot);
      const summary = this.loadCveSummary(projectRoot, scan.stdout);
      let saved = 0;
      let createdCriticalOrHigh = 0;

      for (const result of summary.results || []) {
        const vuln = this.mapCveResultToVulnerability(result, summary.meta);
        if (!vuln) continue;

        try {
          const savedVuln = await this.upsertVulnerability(vuln);
          saved += 1;
          if (savedVuln.created && ['critical', 'high'].includes(vuln.severity)) {
            await this.alertOnNewCriticalVulnerability(vuln);
            createdCriticalOrHigh += 1;
          }
        } catch (error) {
          if (error.code === 'P2021' || error.message?.includes('does not exist')) {
            if (process.env.NODE_ENV !== 'development') {
              logger.warn('Table vulnerabilities non trouvée, CVE non enregistrée');
            }
            continue;
          }
          throw error;
        }
      }

      logger.info(`CVE vulnerability analysis completed: ${saved} vulnerability surfaces saved, ${createdCriticalOrHigh} alerts created`);
      return {
        scanned: true,
        vulnerabilities: saved,
        alerts: createdCriticalOrHigh,
        generatedAt: summary.meta?.generated_at
      };
    } catch (error) {
      logger.error('Erreur lors de l\'analyse des vulnérabilités CVE:', error);
      return { scanned: false, reason: error.message, vulnerabilities: 0 };
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

      // Stocker les métriques en base de données pour l'historique (ne pas propager les erreurs)
      try {
        await this.storeSystemMetrics(metrics);
      } catch (storeError) {
        // Ignorer silencieusement les erreurs de stockage (déjà gérées dans storeSystemMetrics)
        // Ne pas logger ni propager
      }

      return metrics;
    } catch (error) {
      // Gérer les erreurs P2021 (table non trouvée) gracieusement - mode silencieux en développement
      const { isTableNotFoundError } = require('../config/database');
      if (isTableNotFoundError(error)) {
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

      // Ne logger que si des logs ont été analysés, ou si c'est en production
      if (recentLogs.length > 0 || process.env.NODE_ENV === 'production') {
        logger.info(`Security analysis completed: ${recentLogs.length} logs analyzed`);
      }
      // En développement, ne pas logger si 0 logs (pour éviter le spam)
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
      // Vérifier que la table existe avant d'essayer de l'utiliser
      // Force refresh pour éviter les problèmes de cache
      const { checkTableExists, handleTableNotFoundError, clearTableExistsCache } = require('../config/database');
      
      // Vérifier avec force refresh toutes les 10 minutes pour éviter les problèmes de cache
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

      const metricModel = prisma.securityMetricTable || prisma.securityMetric;
      if (!metricModel || typeof metricModel.create !== 'function') {
        if (process.env.NODE_ENV !== 'production') return;
        throw new Error('Modèle SecurityMetric indisponible');
      }
      await metricModel.create({
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
          logger.error('Erreur lors du stockage des métriques système:', error);
        }
      }
      // Ne pas propager l'erreur pour éviter de casser le service
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
