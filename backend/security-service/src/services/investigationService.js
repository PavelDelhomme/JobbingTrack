const { prisma } = require('../config/database');
const { logger } = require('../utils/logger');
const auditService = require('./auditService');

const AUTH_AUDIT_ACTIONS = new Set([
  'admin_login_success',
  'admin_login_failure',
  'admin_registration_success',
  'admin_registration_failure',
  'role_change',
]);

const DEFAULT_WINDOW_DAYS = 7;
const MAX_ROWS = 200;

function parseWindow(startDate, endDate) {
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate
    ? new Date(startDate)
    : new Date(end.getTime() - DEFAULT_WINDOW_DAYS * 86400000);
  return { start, end };
}

function normalizeIp(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildSecurityLogWhere({ start, end, sourceIp, requestId, serviceName }) {
  const where = { timestamp: { gte: start, lte: end } };
  const and = [];

  if (sourceIp) {
    and.push({
      OR: [
        { sourceIP: sourceIp },
        { metadata: { path: ['sourceIp'], equals: sourceIp } },
        { metadata: { path: ['clientIp'], equals: sourceIp } },
        { metadata: { path: ['ip'], equals: sourceIp } },
      ],
    });
  }
  if (requestId) {
    and.push({
      OR: [
        { metadata: { path: ['requestId'], equals: requestId } },
        { metadata: { path: ['correlationId'], equals: requestId } },
        { metadata: { path: ['xRequestId'], equals: requestId } },
      ],
    });
  }
  if (serviceName) {
    and.push({
      OR: [
        { metadata: { path: ['serviceName'], equals: serviceName } },
        { metadata: { path: ['service'], equals: serviceName } },
        { metadata: { path: ['containerName'], equals: serviceName } },
      ],
    });
  }
  if (and.length > 0) where.AND = and;
  return where;
}

function buildAggregatedLogWhere({ start, end, sourceIp, requestId, serviceName }) {
  const where = { timestamp: { gte: start, lte: end } };
  const and = [];

  if (requestId) and.push({ requestId });
  if (sourceIp) {
    and.push({
      OR: [
        { metadata: { path: ['clientIp'], equals: sourceIp } },
        { metadata: { path: ['ip'], equals: sourceIp } },
        { metadata: { path: ['sourceIp'], equals: sourceIp } },
      ],
    });
  }
  if (serviceName) and.push({ serviceName });
  if (and.length > 0) where.AND = and;
  return where;
}

function buildThreatWhere({ start, end, sourceIp, threatType }) {
  const where = { detectedAt: { gte: start, lte: end } };
  if (sourceIp) where.sourceIp = { contains: sourceIp, mode: 'insensitive' };
  if (threatType) where.threatType = String(threatType).toUpperCase();
  return where;
}

function mapSecurityLogRow(row) {
  const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  return {
    id: row.id,
    timestamp: row.timestamp,
    level: row.level,
    category: row.category,
    eventType: row.eventType,
    message: row.message,
    sourceIP: row.sourceIP,
    userId: row.userId,
    endpoint: row.endpoint,
    method: row.method,
    statusCode: row.statusCode,
    isBlocked: row.isBlocked,
    requestId: meta.requestId || meta.correlationId || meta.xRequestId || null,
    serviceName: meta.serviceName || meta.service || meta.containerName || null,
  };
}

function mapAggregatedLogRow(row) {
  const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  return {
    id: row.id,
    timestamp: row.timestamp,
    level: row.level,
    serviceName: row.serviceName,
    message: row.message,
    requestId: row.requestId,
    userId: row.userId,
    clientIp: meta.clientIp || meta.ip || meta.sourceIp || null,
    method: meta.method || meta.httpMethod || null,
    endpoint: meta.endpoint || meta.originalUrl || meta.url || null,
    statusCode: meta.httpStatus || meta.statusCode || null,
  };
}

function mapThreatRow(row) {
  return {
    id: row.id,
    threatType: row.threatType,
    severity: row.severity,
    sourceIp: row.sourceIp,
    destIp: row.destIp,
    destPort: row.destPort,
    blocked: row.blocked,
    detectedAt: row.detectedAt,
    message: row.message,
  };
}

function accountKey(userId, email) {
  if (userId) return `uid:${userId}`;
  if (email) return `email:${String(email).toLowerCase()}`;
  return null;
}

function upsertImpactedAccount(map, key, patch) {
  const existing = map.get(key) || {
    userId: null,
    email: null,
    sources: new Set(),
    clientIps: new Set(),
    events: 0,
    loginFailures: 0,
    loginSuccesses: 0,
    lastSeenAt: null,
    recentActions: [],
  };
  if (patch.userId) existing.userId = patch.userId;
  if (patch.email) existing.email = patch.email;
  if (patch.source) existing.sources.add(patch.source);
  if (patch.clientIp) existing.clientIps.add(patch.clientIp);
  existing.events += patch.events || 1;
  if (patch.loginFailure) existing.loginFailures += 1;
  if (patch.loginSuccess) existing.loginSuccesses += 1;
  if (patch.timestamp) {
    const ts = new Date(patch.timestamp).toISOString();
    if (!existing.lastSeenAt || ts > existing.lastSeenAt) existing.lastSeenAt = ts;
    if (patch.action) {
      existing.recentActions.push({ at: ts, action: patch.action, outcome: patch.outcome || null });
      existing.recentActions = existing.recentActions.slice(-8);
    }
  }
  map.set(key, existing);
}

function buildImpactedAccounts(auditRows, securityLogs, aggregatedLogs) {
  const map = new Map();

  for (const row of auditRows) {
    if (!AUTH_AUDIT_ACTIONS.has(row.action)) continue;
    const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
    const userId = row.actorUserId || row.resourceId || meta.userId || null;
    const email = row.actorEmail || meta.email || null;
    const key = accountKey(userId, email);
    if (!key) continue;
    upsertImpactedAccount(map, key, {
      userId,
      email,
      source: 'audit_logs',
      clientIp: row.clientIp,
      timestamp: row.timestamp,
      action: row.action,
      outcome: row.outcome,
      loginFailure: row.action.includes('failure'),
      loginSuccess: row.action === 'admin_login_success',
    });
  }

  for (const row of securityLogs) {
    if (!row.userId) continue;
    const key = accountKey(row.userId, null);
    if (!key) continue;
    upsertImpactedAccount(map, key, {
      userId: row.userId,
      source: 'security_logs',
      clientIp: row.sourceIP,
      timestamp: row.timestamp,
      action: row.eventType,
    });
  }

  for (const row of aggregatedLogs) {
    if (!row.userId) continue;
    const key = accountKey(row.userId, null);
    if (!key) continue;
    upsertImpactedAccount(map, key, {
      userId: row.userId,
      source: 'aggregated_logs',
      clientIp: row.clientIp,
      timestamp: row.timestamp,
      action: 'aggregated_log',
    });
  }

  return Array.from(map.values())
    .map((entry) => ({
      userId: entry.userId,
      email: entry.email,
      sources: Array.from(entry.sources),
      clientIps: Array.from(entry.clientIps).slice(0, 8),
      events: entry.events,
      loginFailures: entry.loginFailures,
      loginSuccesses: entry.loginSuccesses,
      lastSeenAt: entry.lastSeenAt,
      recentActions: entry.recentActions,
    }))
    .sort((a, b) => String(b.lastSeenAt || '').localeCompare(String(a.lastSeenAt || '')))
    .slice(0, MAX_ROWS);
}

async function enrichAccountsWithUserProfiles(accounts) {
  const userIds = [...new Set(accounts.map((a) => a.userId).filter(Boolean))];
  if (userIds.length === 0) return accounts;

  try {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        lastLoginAt: true,
      },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    return accounts.map((acc) => {
      const user = acc.userId ? byId.get(acc.userId) : null;
      if (!user) return acc;
      const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || null;
      return {
        ...acc,
        email: acc.email || user.email || null,
        displayName,
        role: user.role || null,
        userLastLoginAt: user.lastLoginAt
          ? new Date(user.lastLoginAt).toISOString()
          : null,
        profileSource: 'users_table',
      };
    });
  } catch (error) {
    if (error.code === 'P2021' || String(error.message || '').includes('does not exist')) {
      return accounts;
    }
    logger.warn('[INVESTIGATION] enrichissement profils user partiel:', error.message);
    return accounts;
  }
}

async function safeQuery(label, fn) {
  try {
    return { rows: await fn(), tableMissing: false };
  } catch (error) {
    if (error.code === 'P2021' || String(error.message || '').includes('does not exist')) {
      return { rows: [], tableMissing: true };
    }
    logger.warn(`[INVESTIGATION] ${label} partiel:`, error.message);
    return { rows: [], tableMissing: false, error: error.message };
  }
}

async function searchInvestigation(filters = {}) {
  const {
    startDate,
    endDate,
    sourceIp: rawSourceIp,
    requestId: rawRequestId,
    serviceName,
    threatType,
    limit = MAX_ROWS,
  } = filters;

  const { start, end } = parseWindow(startDate, endDate);
  const sourceIp = normalizeIp(rawSourceIp);
  const requestId = rawRequestId ? String(rawRequestId).trim() : null;
  const take = Math.min(Number(limit) || MAX_ROWS, MAX_ROWS);
  const windowCtx = { start, end, sourceIp, requestId, serviceName, threatType };

  const [threatsResult, aggregatedResult, securityResult, auditResult] = await Promise.all([
    safeQuery('menaces', () =>
      prisma.networkThreat.findMany({
        where: buildThreatWhere(windowCtx),
        orderBy: { detectedAt: 'desc' },
        take,
      })
    ),
    safeQuery('aggregated_logs', () =>
      prisma.aggregatedLog.findMany({
        where: buildAggregatedLogWhere(windowCtx),
        orderBy: { timestamp: 'desc' },
        take,
      })
    ),
    safeQuery('security_logs', () =>
      prisma.securityLog.findMany({
        where: buildSecurityLogWhere(windowCtx),
        orderBy: { timestamp: 'desc' },
        take,
      })
    ),
    auditService.listAuditEvents({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      limit: take,
    }),
  ]);

  const auditRows = auditResult.rows || [];
  const filteredAudit =
    sourceIp || requestId
      ? auditRows.filter((row) => {
          if (requestId && row.requestId !== requestId) return false;
          if (sourceIp && row.clientIp !== sourceIp) return false;
          return true;
        })
      : auditRows;

  const securityLogs = securityResult.rows.map(mapSecurityLogRow);
  const aggregatedLogs = aggregatedResult.rows.map(mapAggregatedLogRow);
  const impactedAccountsRaw = buildImpactedAccounts(filteredAudit, securityLogs, aggregatedLogs);
  const impactedAccounts = await enrichAccountsWithUserProfiles(impactedAccountsRaw);

  return {
    window: { start: start.toISOString(), end: end.toISOString(), days: DEFAULT_WINDOW_DAYS },
    filters: { sourceIp, requestId, serviceName: serviceName || null, threatType: threatType || null },
    counts: {
      threats: threatsResult.rows.length,
      aggregatedLogs: aggregatedLogs.length,
      securityLogs: securityLogs.length,
      auditEvents: filteredAudit.length,
      impactedAccounts: impactedAccounts.length,
    },
    threats: threatsResult.rows.map(mapThreatRow),
    aggregatedLogs,
    securityLogs,
    auditEvents: filteredAudit,
    impactedAccounts,
    tableMissing: {
      audit: auditResult.tableMissing === true,
      aggregated: aggregatedResult.tableMissing === true,
      threats: threatsResult.tableMissing === true,
    },
  };
}

function threatsToCsv(threats) {
  const header = [
    'id',
    'detectedAt',
    'threatType',
    'severity',
    'sourceIp',
    'destIp',
    'destPort',
    'blocked',
    'message',
  ];
  const escape = (value) => {
    const text = value == null ? '' : String(value);
    if (text.includes('"') || text.includes(',') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };
  const lines = [header.join(',')];
  for (const row of threats) {
    lines.push(
      header.map((key) => escape(row[key])).join(',')
    );
  }
  return lines.join('\n');
}

async function buildExportBundle(filters = {}, sections = []) {
  const normalizedSections =
    Array.isArray(sections) && sections.length > 0
      ? sections
      : ['audit', 'threats', 'aggregated', 'security', 'impactedAccounts'];

  const search = await searchInvestigation(filters);
  const bundle = {
    exportedAt: new Date().toISOString(),
    exportVersion: '1',
    window: search.window,
    filters: search.filters,
    sections: normalizedSections,
    recordCounts: {},
  };

  if (normalizedSections.includes('audit')) {
    bundle.auditEvents = search.auditEvents;
    bundle.recordCounts.auditEvents = search.auditEvents.length;
  }
  if (normalizedSections.includes('threats')) {
    bundle.threats = search.threats;
    bundle.recordCounts.threats = search.threats.length;
  }
  if (normalizedSections.includes('aggregated')) {
    bundle.aggregatedLogs = search.aggregatedLogs;
    bundle.recordCounts.aggregatedLogs = search.aggregatedLogs.length;
  }
  if (normalizedSections.includes('security')) {
    bundle.securityLogs = search.securityLogs;
    bundle.recordCounts.securityLogs = search.securityLogs.length;
  }
  if (normalizedSections.includes('impactedAccounts')) {
    bundle.impactedAccounts = search.impactedAccounts;
    bundle.recordCounts.impactedAccounts = search.impactedAccounts.length;
  }

  return { bundle, search };
}

async function exportInvestigation(req, filters = {}, options = {}) {
  const sections = options.sections;
  const format = String(options.format || 'json').toLowerCase();
  const { bundle } = await buildExportBundle(filters, sections);

  const auditPayload = auditService.auditFromRequest(req, {
    action: 'security_export',
    resource: 'investigation',
    resourceId: format,
    metadata: {
      sections: bundle.sections,
      recordCounts: bundle.recordCounts,
      filters: bundle.filters,
      format,
    },
  });
  let auditRecorded = false;
  try {
    const saved = await auditService.recordAuditEvent(auditPayload);
    auditRecorded = saved !== null;
  } catch (error) {
    logger.warn('[INVESTIGATION] Audit security_export non enregistré:', error.message);
  }

  if (format === 'csv') {
    const csv = threatsToCsv(bundle.threats || []);
    return { format: 'csv', content: csv, bundle, auditRecorded };
  }

  const json = JSON.stringify(bundle, null, 2);
  return { format: 'json', content: json, bundle, auditRecorded };
}

module.exports = {
  searchInvestigation,
  buildExportBundle,
  exportInvestigation,
  buildImpactedAccounts,
  enrichAccountsWithUserProfiles,
  threatsToCsv,
  AUTH_AUDIT_ACTIONS,
};
