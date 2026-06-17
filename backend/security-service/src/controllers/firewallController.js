/**
 * Contrôleur pour la gestion du firewall
 */

const { PrismaClient } = require('@prisma/client');
const networkMonitor = require('../network-monitor');
const firewallEngine = require('../firewall-engine');
const { logger, logSecurityEvent } = require('../utils/logger');
const securityService = require('../services/securityService');
const {
  isThreatIgnored,
  activeThreatWhereClause,
  mergeThreatMetadata,
} = require('../utils/threatIgnore');
const {
  parseQueryMultiValue,
  buildUpperInFilter,
  buildInsensitiveContainsFilter,
  buildIntInFilter,
} = require('../utils/queryMultiValue');
const { lookupGeoIp, enrichIpBatch } = require('../utils/geoipProvider');

const prisma = new PrismaClient();
const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;
const IPV4_CIDR_REGEX = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\/(?:[0-9]|[12]\d|3[0-2])$/;
/** Marqueur Prisma pour les blocages IP créés via l’API (déblocable proprement). */
const MANUAL_IP_BLOCK_MARKER = '[MANUAL_IP_BLOCK_API]';
/** IP de laboratoire RFC 5737 — seule IP autorisée pour `mode: "lab_simulation"`. */
const LAB_BLOCK_IP = String(process.env.SECURITY_LAB_BLOCK_IP || '203.0.113.77').trim();
const ALLOWED_THREAT_TYPES = new Set([
  'SYN_FLOOD',
  'PORT_SCAN',
  'BRUTE_FORCE',
  'DDOS',
  'SUSPICIOUS_REQUEST',
  'SQL_INJECTION',
  'XSS',
  'PATH_TRAVERSAL',
  'INTRUSION',
  'WAF_BLOCK',
  'FIREWALL_BLOCK'
]);

function isPrivateIp(ip) {
  const s = normalizeFirewallIp(ip);
  if (!IPV4_REGEX.test(s)) return false;
  const parts = s.split('.').map(Number);
  return (
    parts[0] === 10 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254)
  );
}

/** Ports internes courants → indice de service (quand Docker n’est pas mappable depuis le conteneur). */
/** IP vue côté service (premier hop X-Forwarded-For ou req.ip), normalisée pour comparaisons. */
function getClientObservedIp(req) {
  const xff = req.get && req.get('X-Forwarded-For');
  const first = xff ? String(xff).split(',')[0].trim() : '';
  const raw = first || req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '';
  let s = String(raw || '').trim();
  if (s.startsWith('::ffff:')) s = s.slice(7);
  return s || null;
}

/** IP pour corrélation menaces / règles / logs (évite doublons ::ffff:x.x.x.x vs x.x.x.x). */
function normalizeFirewallIp(ip) {
  if (ip === undefined || ip === null) return '';
  let s = String(ip).trim();
  if (s.startsWith('::ffff:')) s = s.slice(7);
  return s;
}

function isValidFirewallIp(ip) {
  return IPV4_REGEX.test(normalizeFirewallIp(ip));
}

function isValidFirewallSourceIp(ip) {
  const normalized = normalizeFirewallIp(ip);
  return IPV4_REGEX.test(normalized) || IPV4_CIDR_REGEX.test(normalized);
}

/** Expose une IP destination utile si la colonne destIp est vide mais les métadonnées réseau en contiennent une. */
function enrichThreatForApi(threat) {
  if (!threat || typeof threat !== 'object') return threat;
  const meta =
    threat.metadata && typeof threat.metadata === 'object' && !Array.isArray(threat.metadata)
      ? threat.metadata
      : {};
  let destIp = threat.destIp || null;
  if (!destIp && Array.isArray(meta.connectionDetails) && meta.connectionDetails.length > 0) {
    const first = meta.connectionDetails[0];
    if (first && first.localIp) destIp = String(first.localIp);
  }
  return {
    ...threat,
    destIp,
    ignored: isThreatIgnored(threat),
    ignoreReason:
      typeof meta.ignoreReason === 'string' ? meta.ignoreReason : null,
    ignoredAt: typeof meta.ignoredAt === 'string' ? meta.ignoredAt : null,
  };
}

function summarizeApplicationContext(
  logs,
  intrusionAttempts = [],
  ddosAttacks = [],
  aggregatedLogs = []
) {
  const endpoints = new Set();
  const methods = new Set();
  const services = new Set();
  const impactedUsers = new Set();
  const correlationSources = new Set();
  let blockedEvents = 0;
  let maxRiskScore = 0;
  let maxRiskSource = null;

  const registerRisk = (score, source) => {
    const numericScore = Number(score || 0);
    if (numericScore > maxRiskScore) {
      maxRiskScore = numericScore;
      maxRiskSource = source;
    }
  };

  for (const log of logs) {
    correlationSources.add('security_logs');
    if (log.endpoint) endpoints.add(log.endpoint);
    if (log.method) methods.add(log.method);
    if (log.userId) impactedUsers.add(log.userId);
    if (log.isBlocked) blockedEvents += 1;
    registerRisk(log.riskScore, 'security_logs');
    const serviceName = log.metadata?.serviceName || log.metadata?.service || log.metadata?.containerName;
    if (serviceName) services.add(String(serviceName));
  }

  for (const attempt of intrusionAttempts) {
    correlationSources.add('intrusion_attempts');
    if (attempt.targetEndpoint) endpoints.add(attempt.targetEndpoint);
    if (attempt.method) methods.add(attempt.method);
    if (attempt.isBlocked) blockedEvents += 1;
    registerRisk(attempt.riskScore, 'intrusion_attempts');
  }

  for (const attack of ddosAttacks) {
    correlationSources.add('ddos_attacks');
    if (attack.targetEndpoint) endpoints.add(attack.targetEndpoint);
  }

  for (const row of aggregatedLogs) {
    correlationSources.add('aggregated_logs');
    const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
    const endpoint = meta.endpoint || meta.originalUrl || meta.url;
    const method = meta.method || meta.httpMethod;
    if (endpoint) endpoints.add(String(endpoint));
    if (method) methods.add(String(method));
    if (row.serviceName) services.add(String(row.serviceName));
    if (meta.httpStatus >= 400 || meta.statusCode >= 400) blockedEvents += 1;
    registerRisk(meta.riskScore, 'aggregated_logs');
  }

  return {
    total: logs.length,
    aggregatedLogs: aggregatedLogs.length,
    intrusionAttempts: intrusionAttempts.length,
    ddosAttacks: ddosAttacks.length,
    blockedEvents,
    maxRiskScore,
    maxRiskSource,
    endpoints: Array.from(endpoints).slice(0, 12),
    methods: Array.from(methods).slice(0, 8),
    impactedUsers: Array.from(impactedUsers).slice(0, 12),
    services: Array.from(services).slice(0, 12),
    correlationSources: Array.from(correlationSources)
  };
}

function riskScoreFromThreatSeverity(severity) {
  const normalized = String(severity || '').toUpperCase();
  if (normalized === 'CRITICAL') return 90;
  if (normalized === 'HIGH') return 75;
  if (normalized === 'MEDIUM') return 50;
  if (normalized === 'LOW') return 30;
  return 0;
}

function mapNetworkConnectionToThreatConnection(conn) {
  return {
    localIp: conn.destIp,
    localPort: conn.destPort,
    remotePort: conn.sourcePort,
    protocol: conn.protocol,
    state: conn.state,
    containerName: conn.containerName,
    containerId: conn.containerId
  };
}

function enrichConnectionDetailForInvestigation(conn, detectedAtIso) {
  const resolved = resolveConnectionSource(conn);
  return {
    ...conn,
    ...resolved,
    serviceLabel: resolved.destination.label,
    observedAt: conn.observedAt || conn.createdAt || detectedAtIso || null
  };
}

async function buildThreatInvestigation(threat, related) {
  const enriched = enrichThreatForApi(threat);
  const meta = enriched.metadata && typeof enriched.metadata === 'object' ? enriched.metadata : {};
  const geo = await lookupGeoIp(enriched.sourceIp);
  const logsSummary = summarizeApplicationContext(
    related.securityLogs,
    related.intrusionAttempts,
    related.ddosAttacks,
    related.aggregatedLogs || []
  );
  const threatSeverityRiskScore = riskScoreFromThreatSeverity(enriched.severity);
  const effectiveRiskScore = Math.max(logsSummary.maxRiskScore, threatSeverityRiskScore);
  const riskSource =
    logsSummary.maxRiskScore > 0
      ? logsSummary.maxRiskSource || 'security_logs'
      : threatSeverityRiskScore > 0
        ? 'threat_severity'
        : 'unknown';
  const persistedConnections = Array.isArray(related.networkConnections)
    ? related.networkConnections.map(mapNetworkConnectionToThreatConnection)
    : [];
  const metadataConnections = Array.isArray(meta.connectionDetails) ? meta.connectionDetails : [];
  const detectedAtIso = enriched.detectedAt || meta.detectedAt || null;
  const connectionDetailsRaw =
    metadataConnections.length > 0 ? metadataConnections : persistedConnections;
  const connectionDetails = connectionDetailsRaw.map((conn) =>
    enrichConnectionDetailForInvestigation(conn, detectedAtIso)
  );
  const ports = Array.isArray(meta.ports) && meta.ports.length > 0
    ? meta.ports
    : [...new Set(persistedConnections.map((conn) => conn.localPort).filter(Boolean))];
  const protocols = Array.isArray(meta.protocols) && meta.protocols.length > 0
    ? meta.protocols
    : [...new Set(persistedConnections.map((conn) => conn.protocol).filter(Boolean))];
  const states = Array.isArray(meta.states) && meta.states.length > 0
    ? meta.states
    : [...new Set(persistedConnections.map((conn) => conn.state).filter(Boolean))];
  const destIpFallback = enriched.destIp || persistedConnections[0]?.localIp || null;
  const destPortFallback = enriched.destPort || (ports.length === 1 ? ports[0] : null);
  const impactedServices = new Set(logsSummary.services);

  if (meta.containerInfo?.containerName) impactedServices.add(meta.containerInfo.containerName);
  for (const conn of connectionDetails) {
    if (conn.containerName) impactedServices.add(String(conn.containerName));
  }

  const missingTelemetry = [];
  const privateIp = isPrivateIp(enriched.sourceIp);
  if (privateIp) {
    missingTelemetry.push(
      'IP privée (Docker/LAN) — géolocalisation publique et réputation ASN/VPN non applicables'
    );
  } else if (!geo) {
    missingTelemetry.push('GeoIP/ASN public indisponible pour cette IP');
  }
  if (
    !privateIp &&
    meta.proxy == null &&
    meta.vpn == null &&
    meta.asn == null &&
    geo?.proxy == null &&
    geo?.asn == null
  ) {
    missingTelemetry.push(
      'Détection VPN/proxy/ASN non confirmée (provider indisponible ou métadonnées absentes)'
    );
  }
  if (connectionDetails.length === 0) missingTelemetry.push('Aucun détail de connexion réseau brut conservé');
  if (related.securityLogs.length === 0) missingTelemetry.push('Aucun log sécurité corrélé à cette IP ou menace');
  if ((related.aggregatedLogs || []).length === 0) {
    missingTelemetry.push('Aucun log agrégé gateway/service corrélé (requestId ou IP)');
  }

  return {
    attacker: {
      ip: enriched.sourceIp,
      isPrivateIp: privateIp,
      country: geo?.country || null,
      city: geo?.city || null,
      region: geo?.region || null,
      timezone: geo?.timezone || null,
      ll: geo?.ll || null,
      locationNote: geo?.note || null,
      proxy: meta.proxy ?? geo?.proxy ?? null,
      vpn: meta.vpn ?? geo?.vpn ?? null,
      tor: meta.tor ?? geo?.tor ?? null,
      asn: meta.asn ?? geo?.asn ?? null,
      organization: meta.organization ?? geo?.organization ?? null,
      reverseDns: geo?.reverseDns || [],
      rdap: geo?.rdap || null,
      enrichmentSources: geo?.sources || [],
      enrichmentConfidence: geo?.confidence || null
    },
    target: {
      ip: destIpFallback,
      port: destPortFallback,
      ports,
      protocols,
      impactedServices: Array.from(impactedServices).slice(0, 12)
    },
    application: {
      logs: {
        ...logsSummary,
        effectiveRiskScore,
        riskSource,
        threatSeverityRiskScore
      },
      recentEvents: related.securityLogs.slice(0, 25).map((log) => ({
        id: log.id,
        timestamp: log.timestamp,
        level: log.level,
        category: log.category,
        eventType: log.eventType,
        endpoint: log.endpoint,
        method: log.method,
        statusCode: log.statusCode,
        responseTime: log.responseTime,
        riskScore: log.riskScore,
        isBlocked: log.isBlocked,
        message: log.message,
        sourceIP: log.sourceIP,
        userId: log.userId,
        metadata:
          log.metadata && typeof log.metadata === 'object' ? log.metadata : null
      }))
    },
    network: {
      totalConnections: Number(meta.totalConnections || connectionDetails.length || 0),
      states,
      connectionDetails: connectionDetails.slice(0, 25)
    },
    related: {
      intrusionAttempts: related.intrusionAttempts,
      ddosAttacks: related.ddosAttacks,
      aggregatedLogs: (related.aggregatedLogs || []).slice(0, 20).map((row) => ({
        id: row.id,
        timestamp: row.timestamp,
        level: row.level,
        serviceName: row.serviceName,
        message: row.message,
        requestId: row.requestId,
        metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : null,
      })),
    },
    missingTelemetry
  };
}

/** Plus haut = source préférée si plusieurs entrées pour la même IP (Lot A — cohérence). */
const BLOCK_ORIGIN_PRIORITY = {
  manual_rule: 50,
  lab_simulation: 45,
  iptables: 40,
  automatic_threat: 30,
  log_inferred: 25
};

function dedupeBlockedIpEntries(entries) {
  const map = new Map();
  for (const e of entries) {
    const k = normalizeFirewallIp(e.ip);
    if (!k) continue;
    const cur = { ...e, ip: k };
    const prev = map.get(k);
    if (!prev) {
      map.set(k, cur);
      continue;
    }
    const pPrev = BLOCK_ORIGIN_PRIORITY[prev.blockOrigin] ?? 0;
    const pCur = BLOCK_ORIGIN_PRIORITY[cur.blockOrigin] ?? 0;
    let winner;
    if (pCur > pPrev) winner = { ...cur };
    else if (pCur < pPrev) winner = { ...prev };
    else {
      const tCur = cur.blockedAt ? new Date(cur.blockedAt).getTime() : 0;
      const tPrev = prev.blockedAt ? new Date(prev.blockedAt).getTime() : 0;
      winner = tCur >= tPrev ? { ...cur } : { ...prev };
    }
    const tid = winner.threatId || prev.threatId || cur.threatId;
    if (tid) winner.threatId = tid;
    map.set(k, winner);
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.blockedAt || 0).getTime() - new Date(a.blockedAt || 0).getTime()
  );
}

/** IPs encore actives d’après les logs (complète règles / menaces si décalage BDD). */
async function listBlockedIpsFromSecurityLogs() {
  const recentLogs = await prisma.securityLog.findMany({
    where: {
      eventType: {
        in: [
          'ip_blocked_manually',
          'ip_blocked_lab_simulation',
          'ip_unblocked_manually',
          'threat_blocked',
          'ip_blocked_automatically'
        ]
      }
    },
    select: {
      eventType: true,
      createdAt: true,
      metadata: true,
      message: true
    },
    orderBy: { createdAt: 'asc' },
    take: 800
  });
  const latestByIp = new Map();
  for (const log of recentLogs) {
    const ip = normalizeFirewallIp(
      log?.metadata?.blockedIp || log?.metadata?.unblockedIp || ''
    );
    if (!ip) continue;
    latestByIp.set(ip, log);
  }
  const out = [];
  for (const [ip, log] of latestByIp.entries()) {
    const et = log?.eventType;
    if (
      et !== 'ip_blocked_manually' &&
      et !== 'ip_blocked_lab_simulation' &&
      et !== 'threat_blocked' &&
      et !== 'ip_blocked_automatically'
    ) {
      continue;
    }
    let blockOrigin = 'log_inferred';
    if (et === 'ip_blocked_lab_simulation') blockOrigin = 'lab_simulation';
    else if (et === 'ip_blocked_manually') blockOrigin = 'manual_rule';
    else if (et === 'threat_blocked' || et === 'ip_blocked_automatically') blockOrigin = 'automatic_threat';
    let meta = {};
    if (log?.metadata && typeof log.metadata === 'object' && !Array.isArray(log.metadata)) {
      meta = log.metadata;
    } else if (typeof log?.metadata === 'string') {
      try {
        const parsed = JSON.parse(log.metadata);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) meta = parsed;
      } catch {
        /* ignore */
      }
    }
    const threatIdFromLog =
      typeof meta.threatId === 'string' && meta.threatId.length > 0 ? meta.threatId : undefined;
    const row = {
      ip,
      blockedAt: log.createdAt,
      reason: log?.message || 'Blocage détecté dans les logs sécurité',
      blockOrigin
    };
    if (threatIdFromLog) row.threatId = threatIdFromLog;
    out.push(row);
  }
  return out;
}

function blockedIpsMetaSummary(entries) {
  const byOrigin = {};
  for (const e of entries) {
    const o = e.blockOrigin || 'unknown';
    byOrigin[o] = (byOrigin[o] || 0) + 1;
  }
  return { byOrigin, count: entries.length };
}

const {
  resolveConnectionSource,
  resolveContainerLabel,
  bucketConnectionCorrelation
} = require('../utils/connectionSource');

function normalizeRulePayload(payload = {}) {
  const normalizedSourceIp = payload.sourceIp && String(payload.sourceIp).trim() !== ''
    ? String(payload.sourceIp).trim()
    : null;
  const normalizedDestPort = payload.destPort !== undefined && payload.destPort !== null && String(payload.destPort).trim() !== ''
    ? parseInt(payload.destPort, 10)
    : null;
  return {
    name: payload.name,
    description: payload.description || null,
    sourceIp: normalizedSourceIp,
    destPort: Number.isNaN(normalizedDestPort) ? null : normalizedDestPort,
    protocol: String(payload.protocol || '').toUpperCase(),
    action: String(payload.action || '').toUpperCase(),
    priority: payload.priority ? parseInt(payload.priority, 10) : 100
  };
}

function validateFirewallRuleScope(rule) {
  if (!rule.sourceIp) {
    return 'IP source requise : le backoffice refuse les règles globales sans IP source.';
  }
  if (!isValidFirewallSourceIp(rule.sourceIp)) {
    return 'Format IP source invalide (IPv4 ou CIDR IPv4 attendu).';
  }
  if (rule.destPort !== null && (!Number.isInteger(rule.destPort) || rule.destPort < 1 || rule.destPort > 65535)) {
    return 'Port destination invalide (1-65535 attendu).';
  }
  return null;
}

/**
 * GET /api/v1/security/firewall/rules
 * Récupérer toutes les règles de firewall
 */
async function getFirewallRules(req, res) {
  try {
    // Vérifier si la table existe
    try {
      const rules = await prisma.firewallRule.findMany({
        orderBy: { priority: 'asc' }
      });

      res.json({
        success: true,
        data: rules
      });
    } catch (dbError) {
      // ✅ CORRECTION : Si la table n'existe pas (P2021), retourner un tableau vide sans logger en développement
      if (dbError.code === 'P2021' || dbError.message?.includes('does not exist')) {
        // Mode silencieux en développement
        if (process.env.NODE_ENV !== 'development') {
          logger.warn('Table FirewallRule non trouvée, retour de données vides');
        }
        res.json({
          success: true,
          data: []
        });
      } else {
        throw dbError;
      }
    }
  } catch (error) {
    logger.error('Erreur récupération règles firewall:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des règles',
      message: error.message
    });
  }
}

/**
 * POST /api/v1/security/firewall/rules
 * Créer une nouvelle règle de firewall
 */
async function createFirewallRule(req, res) {
  try {
    const { name, description, sourceIp, destPort, protocol, action, priority } = req.body;

    // Validation
    if (!name || !protocol || !action) {
      return res.status(400).json({
        success: false,
        error: 'Les champs name, protocol et action sont requis'
      });
    }

    const normalizedRule = normalizeRulePayload({ name, description, sourceIp, destPort, protocol, action, priority });
    const scopeError = validateFirewallRuleScope(normalizedRule);
    if (scopeError) {
      return res.status(400).json({
        success: false,
        error: scopeError
      });
    }

    // Réutiliser une règle existante équivalente (même signature réseau)
    const existingRules = await prisma.firewallRule.findMany({
      where: {
        protocol: normalizedRule.protocol,
        action: normalizedRule.action,
        sourceIp: normalizedRule.sourceIp,
        destPort: normalizedRule.destPort
      },
      orderBy: { createdAt: 'asc' }
    });

    if (existingRules.length > 0) {
      const existingRule = existingRules[0];
      const clientIP = req.ip || req.connection?.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      if (existingRule.enabled) {
        await securityService.createSecurityLog({
          level: 'info',
          category: 'firewall',
          eventType: 'firewall_rule_duplicate_reused',
          message: `Règle firewall dupliquée détectée, réutilisation de ${existingRule.name}`,
          sourceIP: clientIP,
          userAgent: userAgent,
          userId: req.user?.id || null,
          endpoint: req.originalUrl,
          method: req.method,
          statusCode: 200,
          riskScore: 5,
          isBlocked: false,
          metadata: {
            requestedName: normalizedRule.name,
            reusedRuleId: existingRule.id,
            signature: {
              protocol: normalizedRule.protocol,
              action: normalizedRule.action,
              sourceIp: normalizedRule.sourceIp,
              destPort: normalizedRule.destPort
            }
          }
        }).catch(err => {
          logger.warn('Erreur log duplicate-reuse firewall (non bloquant):', err.message);
        });

        return res.status(200).json({
          success: true,
          duplicate: true,
          reused: true,
          message: `Règle équivalente déjà active (${existingRule.name}), réutilisée.`,
          data: existingRule
        });
      }

      const reactivatedRule = await prisma.firewallRule.update({
        where: { id: existingRule.id },
        data: {
          enabled: true,
          name: normalizedRule.name || existingRule.name,
          description: normalizedRule.description
        }
      });
      const iptablesResult = await firewallEngine.applyFirewallRule(reactivatedRule);

      await securityService.createSecurityLog({
        level: 'warning',
        category: 'firewall',
        eventType: 'firewall_rule_duplicate_reactivated',
        message: `Règle firewall équivalente réactivée: ${reactivatedRule.name}`,
        sourceIP: clientIP,
        userAgent: userAgent,
        userId: req.user?.id || null,
        endpoint: req.originalUrl,
        method: req.method,
        statusCode: 200,
        riskScore: 15,
        isBlocked: false,
        metadata: {
          reactivatedRuleId: reactivatedRule.id,
          requestedName: normalizedRule.name,
          iptablesApplied: iptablesResult?.success || false,
          signature: {
            protocol: normalizedRule.protocol,
            action: normalizedRule.action,
            sourceIp: normalizedRule.sourceIp,
            destPort: normalizedRule.destPort
          }
        }
      }).catch(err => {
        logger.warn('Erreur log duplicate-reactivate firewall (non bloquant):', err.message);
      });

      return res.status(200).json({
        success: true,
        duplicate: true,
        reactivated: true,
        message: `Règle équivalente trouvée et réactivée (${reactivatedRule.name}).`,
        data: reactivatedRule
      });
    }

    // Créer une nouvelle règle en base
    let rule;
    try {
      rule = await prisma.firewallRule.create({
        data: {
          name: normalizedRule.name,
          description: normalizedRule.description,
          sourceIp: normalizedRule.sourceIp,
          destPort: normalizedRule.destPort,
          protocol: normalizedRule.protocol,
          action: normalizedRule.action,
          priority: normalizedRule.priority,
          enabled: true
        }
      });
    } catch (dbError) {
      // Si la table n'existe pas (P2021), retourner une erreur explicite
      if (dbError.code === 'P2021' || dbError.message?.includes('does not exist')) {
        logger.warn('Table FirewallRule non trouvée, exécutez: make db-push-all');
        return res.status(503).json({
          success: false,
          error: 'Table FirewallRule non trouvée',
          message: 'Exécutez "make db-push-all" pour créer les tables nécessaires'
        });
      }
      throw dbError;
    }

    // Appliquer la règle avec iptables si activée
    let iptablesResult = null;
    if (rule.enabled) {
      iptablesResult = await firewallEngine.applyFirewallRule(rule);
      if (!iptablesResult.success) {
        logger.warn(`Impossible d'appliquer la règle firewall: ${iptablesResult.error}`);
      }
    }

    // Enregistrer dans les logs de sécurité (ne pas bloquer si ça échoue)
    const clientIP = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    securityService.createSecurityLog({
      level: 'info',
      category: 'firewall',
      eventType: 'firewall_rule_created',
      message: `Règle firewall créée: ${rule.name} (${rule.action} ${rule.protocol}${rule.destPort ? ':' + rule.destPort : ''}${rule.sourceIp ? ' depuis ' + rule.sourceIp : ''})`,
      sourceIP: clientIP,
      userAgent: userAgent,
      userId: req.user?.id || null,
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 201,
      riskScore: rule.action === 'DENY' || rule.action === 'REJECT' ? 30 : 10,
      isBlocked: false,
      metadata: {
        ruleId: rule.id,
        ruleName: rule.name,
        protocol: rule.protocol,
        action: rule.action,
        sourceIp: rule.sourceIp,
        destPort: rule.destPort,
        priority: rule.priority,
        iptablesApplied: iptablesResult?.success || false,
        iptablesError: iptablesResult?.error || null,
        createdAt: new Date().toISOString()
      }
    }).catch(err => {
      // Ne pas bloquer la réponse si le log échoue
      logger.warn('Erreur création log sécurité pour règle firewall (non bloquant):', err.message);
    });

    res.status(201).json({
      success: true,
      data: rule
    });
  } catch (error) {
    logger.error('Erreur création règle firewall:', error);
    logger.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de la règle',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * PUT /api/v1/security/firewall/rules/:id
 * Mettre à jour une règle de firewall
 */
async function updateFirewallRule(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

    const oldRule = await prisma.firewallRule.findUnique({ where: { id } });
    if (!oldRule) {
      return res.status(404).json({
        success: false,
        error: 'Règle non trouvée'
      });
    }

    const normalizedUpdates = normalizeRulePayload({ ...oldRule, ...updates });
    const scopeError = validateFirewallRuleScope(normalizedUpdates);
    if (scopeError) {
      return res.status(400).json({
        success: false,
        error: scopeError
      });
    }

    const rule = await prisma.firewallRule.update({
      where: { id },
      data: {
        ...updates,
        sourceIp: normalizedUpdates.sourceIp,
        destPort: normalizedUpdates.destPort,
        protocol: normalizedUpdates.protocol,
        action: normalizedUpdates.action,
        priority: normalizedUpdates.priority
      }
    });

    // Réappliquer la règle si activée
    let iptablesResult = null;
    if (rule.enabled) {
      iptablesResult = await firewallEngine.applyFirewallRule(rule);
    }

    // Enregistrer dans les logs de sécurité
    const clientIP = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    await securityService.createSecurityLog({
      level: 'info',
      category: 'firewall',
      eventType: 'firewall_rule_updated',
      message: `Règle firewall modifiée: ${rule.name} (${rule.action} ${rule.protocol}${rule.destPort ? ':' + rule.destPort : ''})`,
      sourceIP: clientIP,
      userAgent: userAgent,
      userId: req.user?.id || null,
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 200,
      riskScore: 15,
      isBlocked: false,
      metadata: {
        ruleId: rule.id,
        ruleName: rule.name,
        changes: updates,
        oldValues: oldRule,
        newValues: rule,
        iptablesApplied: iptablesResult?.success || false,
        updatedAt: new Date().toISOString()
      }
    }).catch(err => {
      logger.error('Erreur création log sécurité pour modification règle:', err);
    });

    res.json({
      success: true,
      data: rule
    });
  } catch (error) {
    logger.error('Erreur mise à jour règle firewall:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de la règle'
    });
  }
}

/**
 * DELETE /api/v1/security/firewall/rules/:id
 * Supprimer une règle de firewall
 */
async function deleteFirewallRule(req, res) {
  try {
    const { id } = req.params;

    const rule = await prisma.firewallRule.findUnique({ where: { id } });
    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Règle non trouvée'
      });
    }

    // Supprimer la règle iptables
    const iptablesResult = await firewallEngine.removeFirewallRule(rule);

    // Supprimer de la base
    await prisma.firewallRule.delete({ where: { id } });

    // Enregistrer dans les logs de sécurité
    const clientIP = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    await securityService.createSecurityLog({
      level: 'warning',
      category: 'firewall',
      eventType: 'firewall_rule_deleted',
      message: `Règle firewall supprimée: ${rule.name} (${rule.action} ${rule.protocol}${rule.destPort ? ':' + rule.destPort : ''})`,
      sourceIP: clientIP,
      userAgent: userAgent,
      userId: req.user?.id || null,
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 200,
      riskScore: 20,
      isBlocked: false,
      metadata: {
        ruleId: rule.id,
        ruleName: rule.name,
        protocol: rule.protocol,
        action: rule.action,
        sourceIp: rule.sourceIp,
        destPort: rule.destPort,
        iptablesRemoved: iptablesResult?.success || false,
        deletedAt: new Date().toISOString()
      }
    }).catch(err => {
      logger.error('Erreur création log sécurité pour suppression règle:', err);
    });

    res.json({
      success: true,
      message: 'Règle supprimée avec succès'
    });
  } catch (error) {
    logger.error('Erreur suppression règle firewall:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de la règle'
    });
  }
}

/**
 * GET /api/v1/security/firewall/network/stats
 * Récupérer les statistiques réseau globales
 */
async function getNetworkStats(req, res) {
  try {
    const metrics = await networkMonitor.collectNetworkMetrics();
    const connections = metrics.connections || [];
    
    // Formater les données pour le frontend
    const enrichedConnections = connections.map((conn) => resolveConnectionSource(conn));

    const stats = {
      totalConnections: connections.length || 0,
      tcpConnections: connections.filter(c => c.protocol === 'TCP').length || 0,
      udpConnections: connections.filter(c => c.protocol === 'UDP').length || 0,
      connectionsByState: connections.reduce((acc, conn) => {
        // Les états sont déjà convertis en noms lisibles par collectNetworkMetrics
        const stateName = typeof conn.state === 'string' ? conn.state : networkMonitor.getStateName(conn.state);
        acc[stateName] = (acc[stateName] || 0) + 1;
        return acc;
      }, {}) || {},
      connectionsByContainer: enrichedConnections.reduce((acc, conn) => {
        const label = conn.destination.label;
        acc[label] = (acc[label] || 0) + 1;
        return acc;
      }, {}) || {},
      topSourceIps: connections.reduce((acc, conn) => {
        const remoteIp = String(conn.remoteIp || '').trim();
        if (!remoteIp || remoteIp === 'undefined' || remoteIp === '::') {
          return acc;
        }
        acc[remoteIp] = (acc[remoteIp] || 0) + 1;
        return acc;
      }, {}) || {},
      topDestinationPorts: connections.reduce((acc, conn) => {
        acc[conn.localPort] = (acc[conn.localPort] || 0) + 1;
        return acc;
      }, {}) || {},
      unmappedConnections: enrichedConnections.filter(
        (conn) => conn.destination.kind === 'unmapped' || conn.destination.kind === 'port'
      ).length,
      timestamp: new Date().toISOString()
    };

    const n = connections.length || 0;
    const correlation = { unmapped: 0, hostLayer: 0, dockerNamed: 0 };
    for (const conn of connections) {
      const bucket = bucketConnectionCorrelation(conn);
      correlation[bucket] += 1;
    }
    const denom = n || 1;
    stats.containerCorrelation = {
      ...correlation,
      total: n,
      unmappedPercent: Math.round((correlation.unmapped / denom) * 100),
      hostLayerPercent: Math.round((correlation.hostLayer / denom) * 100),
      dockerNamedPercent: Math.round((correlation.dockerNamed / denom) * 100)
    };

    if (n === 0) {
      stats.correlationHint =
        'Aucune connexion observée sur cet hôte — vérifier que le security-service a accès au socket Docker ou que le monitoring réseau est actif.';
    } else if (stats.containerCorrelation.unmappedPercent >= 40) {
      stats.correlationHint =
        `${stats.containerCorrelation.unmappedPercent}% des connexions ne sont pas mappées à un conteneur nommé — vérifier les labels Docker, le socket /var/run/docker.sock et les services arrêtés.`;
    } else if (stats.containerCorrelation.hostLayerPercent >= 60) {
      stats.correlationHint =
        `${stats.containerCorrelation.hostLayerPercent}% des connexions sont au niveau hôte (host-network / ports éphémères) — filtrer par IP publique ou ouvrir la fiche menace pour la réputation.`;
    } else if (stats.containerCorrelation.dockerNamedPercent < 20) {
      stats.correlationHint =
        'Peu de connexions sont corrélées à un service Docker nommé — la corrélation fine menace↔conteneur peut rester partielle.';
    }

    const ipsForEnrichment = [
      ...Object.keys(stats.topSourceIps || {}),
      ...connections.map((c) => c.remoteIp).filter(Boolean),
    ];
    const ipEnrichment = await enrichIpBatch(ipsForEnrichment, 12);

    res.json({
      success: true,
      data: {
        stats,
        connections: enrichedConnections.slice(0, 50),
        ipEnrichment,
      },
    });
  } catch (error) {
    logger.error('Erreur récupération stats réseau:', error);
    res.status(503).json({
      success: false,
      error: 'Statistiques réseau indisponibles',
      message: error.message
    });
  }
}

/**
 * GET /api/v1/security/firewall/network/containers/:containerId
 * Récupérer les statistiques réseau pour un conteneur
 */
async function getContainerStats(req, res) {
  try {
    const { containerId } = req.params;
    const metrics = await networkMonitor.collectNetworkMetrics();
    
    const containerConnections = metrics.connections.filter(
      conn => conn.containerId === containerId || conn.containerName?.includes(containerId)
    );

    res.json({
      success: true,
      data: {
        containerId,
        connections: containerConnections,
        stats: {
          totalConnections: containerConnections.length,
          tcpConnections: containerConnections.filter(c => c.protocol === 'TCP').length,
          udpConnections: containerConnections.filter(c => c.protocol === 'UDP').length
        }
      }
    });
  } catch (error) {
    logger.error('Erreur récupération stats conteneur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques du conteneur'
    });
  }
}

/**
 * GET /api/v1/security/firewall/threats
 * Récupérer les menaces réseau détectées
 */
async function getNetworkThreats(req, res) {
  try {
    const {
      page = 1,
      limit = 50,
      severity,
      sourceIp,
      destIp,
      threatType,
      blocked,
      ignored,
      destPort,
      startDate,
      endDate
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    const severityValues = parseQueryMultiValue(severity);
    if (severityValues.length) {
      where.severity = buildUpperInFilter(severityValues);
    }
    const sourceIpValues = parseQueryMultiValue(sourceIp);
    if (sourceIpValues.length) {
      where.sourceIp = buildInsensitiveContainsFilter(sourceIpValues);
    }
    const destIpValues = parseQueryMultiValue(destIp);
    if (destIpValues.length) {
      where.destIp = buildInsensitiveContainsFilter(destIpValues);
    }
    const threatTypeValues = parseQueryMultiValue(threatType);
    if (threatTypeValues.length) {
      where.threatType = buildUpperInFilter(threatTypeValues);
    }
    if (blocked === 'true' || blocked === 'false') {
      where.blocked = blocked === 'true';
    }
    if (ignored === 'true') {
      where.metadata = { path: ['ignored'], equals: true };
    } else if (ignored !== 'all' && ignored !== '1') {
      Object.assign(where, activeThreatWhereClause());
    }
    const destPortValues = parseQueryMultiValue(destPort);
    if (destPortValues.length) {
      const destPortFilter = buildIntInFilter(destPortValues);
      if (destPortFilter !== undefined) {
        where.destPort = destPortFilter;
      }
    }
    if (startDate || endDate) {
      where.detectedAt = {};
      if (startDate) {
        const parsedStart = new Date(startDate);
        if (Number.isNaN(parsedStart.getTime())) {
          return res.status(400).json({ success: false, error: 'startDate invalide' });
        }
        where.detectedAt.gte = parsedStart;
      }
      if (endDate) {
        const parsedEnd = new Date(endDate);
        if (Number.isNaN(parsedEnd.getTime())) {
          return res.status(400).json({ success: false, error: 'endDate invalide' });
        }
        where.detectedAt.lte = parsedEnd;
      }
    }

    try {
      const [threats, total] = await Promise.all([
        prisma.networkThreat.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { detectedAt: 'desc' }
        }),
        prisma.networkThreat.count({ where })
      ]);

      res.json({
        success: true,
        data: threats.map((t) => enrichThreatForApi(t)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (dbError) {
      // ✅ CORRECTION : Si la table n'existe pas (P2021), retourner un tableau vide sans logger
      if (dbError.code === 'P2021' || dbError.message?.includes('does not exist')) {
        // Mode silencieux - ne jamais logger cette erreur (table sera créée automatiquement)
        res.json({
          success: true,
          data: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0
          }
        });
      } else {
        throw dbError;
      }
    }
  } catch (error) {
    logger.error('Erreur récupération menaces:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des menaces',
      message: error.message
    });
  }
}

/**
 * POST /api/v1/security/firewall/threats
 * Créer une menace de test (pour développement)
 */
async function createThreat(req, res) {
  try {
    const { threatType, sourceIp, destIp: bodyDestIp, destPort, severity, metadata } = req.body;

    // Validation
    if (!threatType || !sourceIp || !severity) {
      return res.status(400).json({
        success: false,
        error: 'Les champs threatType, sourceIp et severity sont requis'
      });
    }
    const normalizedThreatType = String(threatType).toUpperCase();
    if (!ALLOWED_THREAT_TYPES.has(normalizedThreatType)) {
      return res.status(400).json({
        success: false,
        error: `Type de menace invalide: ${threatType}`
      });
    }
    if (!IPV4_REGEX.test(String(sourceIp).trim())) {
      return res.status(400).json({
        success: false,
        error: 'Format sourceIp invalide'
      });
    }

    let destIpResolved = null;
    if (bodyDestIp != null && String(bodyDestIp).trim() !== '') {
      const dip = String(bodyDestIp).trim();
      if (!IPV4_REGEX.test(dip)) {
        return res.status(400).json({
          success: false,
          error: 'Format destIp invalide (IPv4 attendu)'
        });
      }
      destIpResolved = dip;
    }

    try {
      const threat = await prisma.networkThreat.create({
        data: {
          threatType: normalizedThreatType,
          sourceIp,
          destIp: destIpResolved,
          destPort: destPort || null,
          severity: severity.toUpperCase(),
          blocked: false,
          metadata: metadata || { test: true, generatedAt: new Date().toISOString() }
        }
      });

      // Enregistrer dans les logs de sécurité
      const clientIP = req.ip || req.connection?.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      const riskScore = severity.toUpperCase() === 'CRITICAL' ? 90 : severity.toUpperCase() === 'HIGH' ? 75 : severity.toUpperCase() === 'MEDIUM' ? 50 : 30;
      
      await securityService.createSecurityLog({
        level: severity.toUpperCase() === 'CRITICAL' ? 'critical' : severity.toUpperCase() === 'HIGH' ? 'error' : 'warning',
        category: 'firewall',
        eventType: 'network_threat_detected',
        message: `Menace réseau détectée: ${threatType} depuis ${sourceIp} (${severity})`,
        sourceIP: sourceIp,
        userAgent: userAgent,
        userId: req.user?.id || null,
        endpoint: req.originalUrl,
        method: req.method,
        statusCode: 201,
        riskScore: riskScore,
        isBlocked: false,
        metadata: {
          threatId: threat.id,
          threatType: threatType,
          sourceIp: sourceIp,
          destPort: destPort || null,
          severity: severity.toUpperCase(),
          reportedByIp: clientIP,
          isTest: metadata?.test || false,
          detectedAt: new Date().toISOString()
        }
      }).catch(err => {
        logger.error('Erreur création log sécurité pour menace:', err);
      });

      res.status(201).json({
        success: true,
        data: enrichThreatForApi(threat)
      });
    } catch (dbError) {
      // ✅ CORRECTION : Si la table n'existe pas (P2021), retourner une erreur explicite sans logger
      if (dbError.code === 'P2021' || dbError.message?.includes('does not exist')) {
        // Mode silencieux - ne jamais logger cette erreur (table sera créée automatiquement)
        res.status(503).json({
          success: false,
          error: 'Table NetworkThreat non trouvée',
          message: 'Exécutez "make db-push-all" pour créer les tables nécessaires'
        });
      } else {
        throw dbError;
      }
    }
  } catch (error) {
    logger.error('Erreur création menace:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de la menace',
      message: error.message
    });
  }
}

/**
 * GET /api/v1/security/firewall/threats/:id
 * Récupérer les détails d'une menace
 */
async function getThreatDetails(req, res) {
  try {
    const { id } = req.params;

    const threat = await prisma.networkThreat.findUnique({ where: { id } });
    if (!threat) {
      return res.status(404).json({
        success: false,
        error: 'Menace non trouvée'
      });
    }
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const related = {
      securityLogs: [],
      intrusionAttempts: [],
      ddosAttacks: [],
      networkConnections: [],
      aggregatedLogs: [],
    };

    try {
      const [securityLogs, intrusionAttempts, ddosAttacks, networkConnections] = await Promise.allSettled([
        prisma.securityLog.findMany({
          where: {
            OR: [
              { sourceIP: threat.sourceIp },
              { message: { contains: threat.sourceIp, mode: 'insensitive' } },
              { metadata: { path: ['sourceIp'], equals: threat.sourceIp } },
              { metadata: { path: ['blockedIp'], equals: threat.sourceIp } },
              { metadata: { path: ['threatId'], equals: threat.id } }
            ],
            timestamp: { gte: since }
          },
          orderBy: { timestamp: 'desc' },
          take: 50
        }),
        prisma.intrusionAttempt.findMany({
          where: {
            sourceIP: threat.sourceIp,
            timestamp: { gte: since }
          },
          orderBy: { timestamp: 'desc' },
          take: 20
        }),
        prisma.dDoSAttack.findMany({
          where: {
            sourceIPs: { has: threat.sourceIp },
            timestamp: { gte: since }
          },
          orderBy: { timestamp: 'desc' },
          take: 20
        }),
        prisma.networkConnection.findMany({
          where: {
            sourceIp: threat.sourceIp,
            createdAt: { gte: since }
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        })
      ]);
      related.securityLogs = securityLogs.status === 'fulfilled' ? securityLogs.value : [];
      related.intrusionAttempts = intrusionAttempts.status === 'fulfilled' ? intrusionAttempts.value : [];
      related.ddosAttacks = ddosAttacks.status === 'fulfilled' ? ddosAttacks.value : [];
      related.networkConnections = networkConnections.status === 'fulfilled' ? networkConnections.value : [];

      const requestIds = new Set();
      for (const log of related.securityLogs) {
        const meta = log.metadata && typeof log.metadata === 'object' ? log.metadata : {};
        if (meta.requestId) requestIds.add(String(meta.requestId));
        if (meta.correlationId) requestIds.add(String(meta.correlationId));
        if (meta.xRequestId) requestIds.add(String(meta.xRequestId));
      }

      const aggregatedOr = [
        {
          metadata: {
            path: ['clientIp'],
            equals: threat.sourceIp,
          },
        },
        {
          metadata: {
            path: ['ip'],
            equals: threat.sourceIp,
          },
        },
      ];
      if (requestIds.size > 0) {
        aggregatedOr.push({ requestId: { in: Array.from(requestIds) } });
      }

      try {
        related.aggregatedLogs = await prisma.aggregatedLog.findMany({
          where: {
            timestamp: { gte: since },
            level: { in: ['WARN', 'ERROR', 'FATAL'] },
            OR: aggregatedOr,
          },
          orderBy: { timestamp: 'desc' },
          take: 40,
        });
      } catch (aggErr) {
        if (aggErr.code !== 'P2021' && !String(aggErr.message || '').includes('does not exist')) {
          logger.warn('Corrélation aggregated_logs partielle:', aggErr.message);
        }
        related.aggregatedLogs = [];
      }

      const rejectedCorrelations = [securityLogs, intrusionAttempts, ddosAttacks, networkConnections]
        .filter((result) => result.status === 'rejected');
      if (rejectedCorrelations.length > 0) {
        logger.warn(`Corrélation détails menace partielle: ${rejectedCorrelations.length} source(s) indisponible(s)`);
      }
    } catch (correlationError) {
      if (process.env.NODE_ENV === 'production') {
        logger.warn('Corrélation détails menace partielle:', correlationError.message);
      }
    }

    res.json({
      success: true,
      data: {
        ...(() => {
          const enriched = enrichThreatForApi(threat);
          const fallbackConnection = related.networkConnections[0];
          return {
            ...enriched,
            destIp: enriched.destIp || fallbackConnection?.destIp || null,
            destPort: enriched.destPort || (related.networkConnections.length === 1 ? fallbackConnection?.destPort : null)
          };
        })(),
        investigation: await buildThreatInvestigation(threat, related)
      }
    });
  } catch (error) {
    logger.error('Erreur récupération détails menace:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des détails de la menace',
      message: error.message
    });
  }
}

/**
 * POST /api/v1/security/firewall/threats/:id/block
 * Bloquer une menace (bloquer l'IP)
 */
async function blockThreat(req, res) {
  try {
    const { id } = req.params;

    const threat = await prisma.networkThreat.findUnique({ where: { id } });
    if (!threat) {
      return res.status(404).json({
        success: false,
        error: 'Menace non trouvée'
      });
    }

    // Bloquer l'IP avec iptables
    const result = await firewallEngine.blockIp(threat.sourceIp, `Threat: ${threat.threatType}`);

    if (result.success) {
      const prevMeta =
        threat.metadata && typeof threat.metadata === 'object' && !Array.isArray(threat.metadata)
          ? threat.metadata
          : {};
      // Mettre à jour la menace
      await prisma.networkThreat.update({
        where: { id },
        data: {
          blocked: true,
          metadata: {
            ...prevMeta,
            blockOrigin: 'manual_rule',
            blockedAt: new Date().toISOString(),
            blockedBy: req.user?.id || null
          }
        }
      });

      // Enregistrer dans les logs de sécurité
      const clientIP = req.ip || req.connection?.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      
      await securityService.createSecurityLog({
        level: 'critical',
        category: 'firewall',
        eventType: 'threat_blocked',
        message: `Menace bloquée automatiquement: ${threat.threatType} depuis ${threat.sourceIp}`,
        sourceIP: clientIP,
        userAgent: userAgent,
        userId: req.user?.id || null,
        endpoint: req.originalUrl,
        method: req.method,
        statusCode: 200,
        riskScore: threat.severity === 'CRITICAL' ? 95 : threat.severity === 'HIGH' ? 85 : 70,
        isBlocked: true,
        blockReason: `Threat: ${threat.threatType}`,
        metadata: {
          threatId: threat.id,
          threatType: threat.threatType,
          blockedIp: threat.sourceIp,
          severity: threat.severity,
          destPort: threat.destPort,
          blockedBy: 'automatic',
          iptablesApplied: true,
          blockedAt: new Date().toISOString()
        }
      }).catch(err => {
        logger.error('Erreur création log sécurité pour blocage menace:', err);
      });
    }

    res.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    logger.error('Erreur blocage menace:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du blocage de la menace'
    });
  }
}

/**
 * POST /api/v1/security/firewall/threats/:id/ignore
 * Marquer une menace comme faux positif (exclue des compteurs opérationnels).
 */
async function ignoreThreat(req, res) {
  try {
    const { id } = req.params;
    const reason =
      typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 500) : '';

    const threat = await prisma.networkThreat.findUnique({ where: { id } });
    if (!threat) {
      return res.status(404).json({ success: false, error: 'Menace non trouvée' });
    }

    const updated = await prisma.networkThreat.update({
      where: { id },
      data: {
        metadata: mergeThreatMetadata(threat, {
          ignored: true,
          ignoredAt: new Date().toISOString(),
          ignoredBy: req.user?.id || null,
          ignoreReason: reason || 'Faux positif — ignorée par un opérateur',
        }),
      },
    });

    await securityService.createSecurityLog({
      level: 'info',
      category: 'firewall',
      eventType: 'threat_ignored',
      message: `Menace ignorée (faux positif): ${threat.threatType} depuis ${threat.sourceIp}`,
      sourceIP: req.ip || 'unknown',
      userId: req.user?.id || null,
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 200,
      metadata: {
        threatId: threat.id,
        threatType: threat.threatType,
        sourceIp: threat.sourceIp,
        ignoreReason: reason || null,
      },
    }).catch(() => {});

    res.json({
      success: true,
      data: enrichThreatForApi(updated),
      message: 'Menace marquée comme ignorée (faux positif)',
    });
  } catch (error) {
    logger.error('Erreur ignore menace:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du marquage faux positif',
    });
  }
}

/**
 * POST /api/v1/security/firewall/threats/:id/unignore
 * Réintégrer une menace ignorée dans les compteurs.
 */
async function unignoreThreat(req, res) {
  try {
    const { id } = req.params;
    const threat = await prisma.networkThreat.findUnique({ where: { id } });
    if (!threat) {
      return res.status(404).json({ success: false, error: 'Menace non trouvée' });
    }

    const prev = mergeThreatMetadata(threat, {});
    delete prev.ignored;
    delete prev.ignoredAt;
    delete prev.ignoredBy;
    delete prev.ignoreReason;

    const updated = await prisma.networkThreat.update({
      where: { id },
      data: { metadata: prev },
    });

    res.json({
      success: true,
      data: enrichThreatForApi(updated),
      message: 'Menace réintégrée dans les compteurs',
    });
  } catch (error) {
    logger.error('Erreur unignore menace:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la réintégration de la menace',
    });
  }
}

/**
 * DELETE /api/v1/security/firewall/threats/:id
 * Supprimer une menace spécifique
 */
async function deleteThreat(req, res) {
  try {
    const { id } = req.params;
    const existing = await prisma.networkThreat.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Menace non trouvée' });
    }
    await prisma.networkThreat.delete({ where: { id } });
    return res.json({ success: true, message: 'Menace supprimée', data: { id } });
  } catch (error) {
    logger.error('Erreur suppression menace:', error);
    return res.status(500).json({ success: false, error: 'Erreur lors de la suppression de la menace' });
  }
}

/**
 * DELETE /api/v1/security/firewall/threats
 * Purger toutes les menaces (scope=all) ou menaces test (scope=test)
 */
async function purgeThreats(req, res) {
  try {
    const scope = String(req.query.scope || 'all');
    let where = {};
    if (scope === 'test') {
      where = {
        OR: [
          { metadata: { path: ['test'], equals: true } },
          { sourceIp: { startsWith: '10.' } }
        ]
      };
    }
    const result = await prisma.networkThreat.deleteMany({ where });
    return res.json({
      success: true,
      message: `Menaces purgées (${scope})`,
      data: { deleted: result.count }
    });
  } catch (error) {
    logger.error('Erreur purge menaces:', error);
    return res.status(500).json({ success: false, error: 'Erreur lors de la purge des menaces' });
  }
}

/**
 * POST /api/v1/security/firewall/block-ip
 * Bloquer une IP manuellement
 */
async function blockIp(req, res) {
  try {
    const { ip, reason, mode } = req.body;
    const labMode = String(mode || '').toLowerCase() === 'lab_simulation';

    if (!ip) {
      return res.status(400).json({
        success: false,
        error: 'IP requise'
      });
    }
    if (!IPV4_REGEX.test(String(ip).trim())) {
      return res.status(400).json({
        success: false,
        error: 'Format IP invalide'
      });
    }
    const ipNorm = String(ip).trim();
    if (labMode && ipNorm !== LAB_BLOCK_IP) {
      return res.status(400).json({
        success: false,
        error: `Mode lab_simulation: utilisez uniquement l’IP de test ${LAB_BLOCK_IP} (RFC 5737 TEST-NET-3).`
      });
    }

    const observedClient = getClientObservedIp(req);
    if (!labMode && observedClient && IPV4_REGEX.test(observedClient) && ipNorm === observedClient) {
      return res.status(403).json({
        success: false,
        error: 'Refusé : impossible de bloquer l’adresse IP identique à celle de votre requête (risque de verrouillage). Utilisez le mode lab_simulation avec l’IP de test dédiée pour un essai sans danger.'
      });
    }

    const result = await firewallEngine.blockIp(ipNorm, reason || 'Manual block');

    // Enregistrer dans les logs de sécurité
    const clientIP = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    const iptablesApplied = result.iptablesApplied === true;
    
    if (result.success) {
      await securityService.createSecurityLog({
        level: 'critical',
        category: 'firewall',
        eventType: labMode ? 'ip_blocked_lab_simulation' : 'ip_blocked_manually',
        message: labMode
          ? `Blocage de test (lab): ${ipNorm} — ${reason || 'lab_simulation'}`
          : `IP bloquée manuellement: ${ipNorm} - ${reason || 'Manual block'}`,
        sourceIP: clientIP,
        userAgent: userAgent,
        userId: req.user?.id || null,
        endpoint: req.originalUrl,
        method: req.method,
        statusCode: 200,
        riskScore: labMode ? 20 : 90,
        isBlocked: true,
        blockReason: reason || 'Manual block',
        metadata: {
          blockedIp: ipNorm,
          reason: reason || 'Manual block',
          blockedBy: clientIP,
          blockedByUser: req.user?.id || null,
          iptablesApplied,
          labSimulation: labMode,
          blockedAt: new Date().toISOString()
        }
      }).catch(err => {
        logger.error('Erreur création log sécurité pour blocage IP:', err);
      });

      // Source de vérité liste « IPs bloquées » : règle DENY en base (iptables souvent absent en Docker)
      try {
        const existing = await prisma.firewallRule.findFirst({
          where: {
            sourceIp: ipNorm,
            action: { in: ['DENY', 'REJECT'] },
            description: { contains: MANUAL_IP_BLOCK_MARKER }
          }
        });
        const desc = `${MANUAL_IP_BLOCK_MARKER} ${labMode ? 'lab_simulation ' : ''}${reason || 'Manual block'}`.trim();
        if (existing) {
          await prisma.firewallRule.update({
            where: { id: existing.id },
            data: { enabled: true, description: desc, name: labMode ? `Lab block ${ipNorm}` : `Blocage IP ${ipNorm}` }
          });
        } else {
          await prisma.firewallRule.create({
            data: {
              name: labMode ? `Lab block ${ipNorm}` : `Blocage IP ${ipNorm}`,
              description: desc,
              sourceIp: ipNorm,
              destPort: null,
              protocol: 'TCP',
              action: 'DENY',
              priority: labMode ? 120 : 50,
              enabled: true
            }
          });
        }
      } catch (ruleErr) {
        if (ruleErr.code !== 'P2021' && !String(ruleErr.message || '').includes('does not exist')) {
          logger.warn('Persistance règle blocage IP (non bloquant):', ruleErr.message);
        }
      }
    }

    res.json({
      success: result.success,
      message: result.message,
      data: { ip: ipNorm, labSimulation: labMode, iptablesApplied }
    });
  } catch (error) {
    logger.error('Erreur blocage IP:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du blocage de l\'IP'
    });
  }
}

/**
 * POST /api/v1/security/firewall/unblock-ip
 * Débloquer une IP
 */
async function unblockIp(req, res) {
  try {
    const { ip } = req.body;

    if (!ip) {
      return res.status(400).json({
        success: false,
        error: 'IP requise'
      });
    }
    const ipNorm = normalizeFirewallIp(ip);
    const validIp = isValidFirewallIp(ipNorm);

    if (!validIp) {
      const disabledLegacyRules = await prisma.firewallRule.updateMany({
        where: {
          sourceIp: ipNorm,
          action: { in: ['DENY', 'REJECT'] },
          enabled: true
        },
        data: { enabled: false }
      });

      if (disabledLegacyRules.count === 0) {
        return res.status(400).json({
          success: false,
          error: 'Format IP invalide'
        });
      }

      await securityService.createSecurityLog({
        level: 'warning',
        category: 'firewall',
        eventType: 'ip_unblocked_manually',
        message: `Entrée de blocage IP invalide nettoyée: ${ipNorm}`,
        sourceIP: req.ip || req.connection?.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        userId: req.user?.id || null,
        endpoint: req.originalUrl,
        method: req.method,
        statusCode: 200,
        riskScore: 15,
        isBlocked: false,
        metadata: {
          unblockedIp: ipNorm,
          invalidLegacyIp: true,
          disabledRules: disabledLegacyRules.count,
          unblockedAt: new Date().toISOString()
        }
      }).catch(err => {
        logger.error('Erreur création log sécurité pour nettoyage IP invalide:', err);
      });

      return res.json({
        success: true,
        message: `Entrée invalide ${ipNorm} désactivée`,
        data: { ip: ipNorm, disabledRules: disabledLegacyRules.count, invalidLegacyIp: true }
      });
    }

    const result = await firewallEngine.unblockIp(ipNorm);
    let disabledRulesCount = 0;
    let unblockedThreatsCount = 0;

    try {
      const disabledRules = await prisma.firewallRule.updateMany({
        where: {
          sourceIp: ipNorm,
          action: { in: ['DENY', 'REJECT'] },
          enabled: true
        },
        data: { enabled: false }
      });
      disabledRulesCount = disabledRules.count;
    } catch (ruleErr) {
      if (ruleErr.code !== 'P2021' && !String(ruleErr.message || '').includes('does not exist')) {
        logger.warn('Désactivation règle blocage IP (non bloquant):', ruleErr.message);
      }
    }

    try {
      const unblockedThreats = await prisma.networkThreat.updateMany({
        where: {
          sourceIp: ipNorm,
          blocked: true
        },
        data: { blocked: false }
      });
      unblockedThreatsCount = unblockedThreats.count;
    } catch (threatErr) {
      if (threatErr.code !== 'P2021' && !String(threatErr.message || '').includes('does not exist')) {
        logger.warn('Déblocage menaces associées (non bloquant):', threatErr.message);
      }
    }

    // Enregistrer dans les logs de sécurité
    const clientIP = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    if (result.success) {
      const auditService = require('../services/auditService');
      await auditService.recordAuditEvent(
        auditService.auditFromRequest(req, {
          action: 'ip_unblock',
          resource: 'firewall_ip',
          resourceId: ipNorm,
          outcome: 'success',
          metadata: {
            unblockedIp: ipNorm,
            disabledRules: disabledRulesCount,
            unblockedThreats: unblockedThreatsCount,
          },
        })
      ).catch((err) => {
        logger.warn('Audit déblocage IP non enregistré:', err.message);
      });

      await securityService.createSecurityLog({
        level: 'warning',
        category: 'firewall',
        eventType: 'ip_unblocked_manually',
        message: `IP débloquée manuellement: ${ipNorm}`,
        sourceIP: clientIP,
        userAgent: userAgent,
        userId: req.user?.id || null,
        endpoint: req.originalUrl,
        method: req.method,
        statusCode: 200,
        riskScore: 25,
        isBlocked: false,
        metadata: {
          unblockedIp: ipNorm,
          unblockedBy: clientIP,
          unblockedByUser: req.user?.id || null,
          iptablesRemoved: result.iptablesRemoved === true,
          disabledRules: disabledRulesCount,
          unblockedThreats: unblockedThreatsCount,
          unblockedAt: new Date().toISOString()
        }
      }).catch(err => {
        logger.error('Erreur création log sécurité pour déblocage IP:', err);
      });
    }

    res.json({
      success: result.success,
      message: result.message,
      data: {
        ip: ipNorm,
        disabledRules: disabledRulesCount,
        unblockedThreats: unblockedThreatsCount,
        iptablesRemoved: result.iptablesRemoved === true
      }
    });
  } catch (error) {
    logger.error('Erreur déblocage IP:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du déblocage de l\'IP'
    });
  }
}

/**
 * GET /api/v1/security/firewall/blocked-ips
 * Récupérer la liste des IPs bloquées
 */
async function getBlockedIps(req, res) {
  try {
    const candidates = [];

    try {
      const blockedRules = await prisma.firewallRule.findMany({
        where: {
          action: {
            in: ['DENY', 'REJECT']
          },
          enabled: true,
          sourceIp: {
            not: null
          }
        },
        select: {
          sourceIp: true,
          createdAt: true,
          name: true,
          description: true
        },
        distinct: ['sourceIp'],
        orderBy: {
          createdAt: 'desc'
        }
      });

      for (const rule of blockedRules) {
        const ip = normalizeFirewallIp(rule.sourceIp);
        if (!ip) continue;
        const desc = String(rule.description || '');
        const nm = String(rule.name || '');
        const lab = desc.includes('lab_simulation') || nm.toLowerCase().startsWith('lab block');
        candidates.push({
          ip,
          blockedAt: rule.createdAt,
          reason: rule.name || 'Règle firewall',
          blockOrigin: lab ? 'lab_simulation' : 'manual_rule'
        });
      }
    } catch (dbError) {
      if (dbError.code === 'P2021' || dbError.message?.includes('does not exist')) {
        logger.debug('Table FirewallRule non trouvée, utilisation iptables (mode développement)');
      } else {
        logger.warn('Erreur récupération IPs bloquées depuis DB:', dbError.message);
      }
    }

    if (candidates.length === 0) {
      try {
        const result = await firewallEngine.listFirewallRules();

        if (result && result.success && result.rules && result.rules.length > 0) {
          const lines = result.rules.split('\n');
          for (const line of lines) {
            if (line.includes('DROP') && line.includes('-s')) {
              const match = line.match(/-s\s+(\S+)/);
              if (match) {
                const ip = normalizeFirewallIp(match[1]);
                if (ip) {
                  candidates.push({
                    ip,
                    blockedAt: new Date(),
                    reason: 'Règle iptables',
                    blockOrigin: 'iptables'
                  });
                }
              }
            }
          }
        }
      } catch (_) {
        /* iptables souvent indisponible dans Docker */
      }
    }

    try {
      const blockedThreats = await prisma.networkThreat.findMany({
        where: { blocked: true },
        select: {
          id: true,
          sourceIp: true,
          detectedAt: true,
          threatType: true
        },
        orderBy: { detectedAt: 'desc' },
        take: 500
      });
      const seenThreatIp = new Set();
      for (const threat of blockedThreats) {
        const ip = normalizeFirewallIp(threat.sourceIp);
        if (!ip || seenThreatIp.has(ip)) continue;
        seenThreatIp.add(ip);
        candidates.push({
          ip,
          blockedAt: threat.detectedAt,
          reason: `Menace bloquée (${threat.threatType || 'threat_blocked'})`,
          blockOrigin: 'automatic_threat',
          threatId: threat.id
        });
      }
    } catch (threatsError) {
      logger.warn('Consolidation blocked-ips via menaces indisponible:', threatsError.message);
    }

    try {
      const fromLogs = await listBlockedIpsFromSecurityLogs();
      candidates.push(...fromLogs);
    } catch (logsError) {
      logger.warn('Fusion blocked-ips via security logs indisponible:', logsError.message);
    }

    const blockedIps = dedupeBlockedIpEntries(candidates);
    const meta = blockedIpsMetaSummary(blockedIps);

    const listAll =
      req.query.all === 'true' ||
      req.query.consolidated === 'true' ||
      req.query.consolidated === '1';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const total = blockedIps.length;
    const offset = (page - 1) * limit;
    const pageData = listAll ? blockedIps : blockedIps.slice(offset, offset + limit);

    res.json({
      success: true,
      data: pageData,
      meta: {
        ...meta,
        count: total,
        sourcesMerged: ['rules', 'iptables_if_empty', 'threats', 'logs'],
        pagination: {
          page,
          limit,
          total,
          pages: Math.max(1, Math.ceil(total / limit))
        }
      }
    });
  } catch (error) {
    // ✅ CORRECTION : Ne logger que les vraies erreurs (pas iptables)
    if (!error.message?.includes('iptables') && !error.message?.includes('not found')) {
      logger.error('Erreur récupération IPs bloquées:', error);
    }
    // Retourner un tableau vide en cas d'erreur
    res.json({
      success: true,
      data: []
    });
  }
}

/**
 * POST /api/v1/security/firewall/lab/sample-threat
 * Crée une menace de démo (validation porteur / forensics) — désactivé en production.
 */
async function createLabSampleThreat(req, res) {
  try {
    if (String(process.env.NODE_ENV || '').toLowerCase() === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Endpoint lab indisponible en production'
      });
    }

    const sourceIp = String(req.body?.sourceIp || '198.51.100.42').trim();
    const threatType = String(req.body?.threatType || 'BRUTE_FORCE').trim();
    const severity = String(req.body?.severity || 'HIGH').trim();

    const threat = await prisma.networkThreat.create({
      data: {
        threatType,
        sourceIp,
        destIp: '172.20.0.10',
        destPort: 3017,
        severity,
        blocked: false,
        metadata: {
          message: `Menace lab de démonstration depuis ${sourceIp}`,
          count: 12,
          detectedAt: new Date().toISOString(),
          lab: true,
          ports: [3017],
          protocols: ['TCP'],
          states: ['ESTABLISHED'],
          totalConnections: 12,
          connectionDetails: [
            {
              localIp: '172.20.0.10',
              localPort: 3017,
              remotePort: 44321,
              protocol: 'TCP',
              state: 'ESTABLISHED',
              containerName: 'jobbingtrack-security-service'
            }
          ],
          containerInfo: {
            containerName: 'jobbingtrack-security-service',
            containerId: 'lab-sample'
          }
        }
      }
    });

    const { buildThreatSecurityLogContext } = require('../utils/threatSecurityLog');
    const logCtx = buildThreatSecurityLogContext(req, {
      endpoint: '/api/v1/security/firewall/lab/sample-threat',
      method: 'POST',
      statusCode: 201
    });
    await securityService.createSecurityLog({
      level: severity === 'CRITICAL' ? 'critical' : 'error',
      category: 'network',
      eventType: 'network_threat_detected',
      message: `Menace lab: ${threatType} depuis ${sourceIp}`,
      sourceIP: sourceIp,
      ...logCtx,
      riskScore: severity === 'CRITICAL' ? 95 : 75,
      metadata: {
        threatId: threat.id,
        threatType,
        lab: true,
        requestId: logCtx.requestId
      }
    }).catch(() => {});

    res.status(201).json({
      success: true,
      data: enrichThreatForApi(threat),
      message: 'Menace lab créée — ouvrez la fiche depuis Incidents ou Menaces'
    });
  } catch (error) {
    logger.error('Erreur création menace lab:', error);
    res.status(500).json({
      success: false,
      error: 'Impossible de créer la menace lab',
      message: error.message
    });
  }
}

module.exports = {
  getFirewallRules,
  createFirewallRule,
  updateFirewallRule,
  deleteFirewallRule,
  getNetworkStats,
  getContainerStats,
  getNetworkThreats,
  getThreatDetails,
  createThreat,
  blockThreat,
  ignoreThreat,
  unignoreThreat,
  deleteThreat,
  purgeThreats,
  blockIp,
  unblockIp,
  getBlockedIps,
  createLabSampleThreat
};

