const { prisma } = require('../config/database');
const { ensureAuditLogsTable } = require('../config/ensureAuditLogsTable');
const { logger } = require('../utils/logger');
const { redactSensitiveMetadata } = require('./securityAlertEmailNotifier');

const SENSITIVE_ACTIONS = new Set([
  'admin_login_success',
  'admin_login_failure',
  'ip_unblock',
  'role_change',
  'test_data_clear',
  'security_export',
  'notification_settings_update',
  'threat_block',
]);

function normalizeOutcome(value) {
  const v = String(value || 'success').toLowerCase();
  return v === 'failure' || v === 'error' ? 'failure' : 'success';
}

async function recordAuditEvent(payload = {}) {
  const {
    actorUserId = null,
    actorEmail = null,
    actorRole = null,
    action,
    resource = 'security',
    resourceId = null,
    outcome = 'success',
    clientIp = null,
    userAgent = null,
    requestId = null,
    metadata = null,
  } = payload;

  if (!action) {
    throw new Error('action requis pour audit');
  }

  const safeMetadata = redactSensitiveMetadata(metadata || {});

  const data = {
    actorUserId,
    actorEmail,
    actorRole,
    action: String(action).slice(0, 100),
    resource: String(resource).slice(0, 100),
    resourceId: resourceId ? String(resourceId).slice(0, 200) : null,
    outcome: normalizeOutcome(outcome),
    clientIp: clientIp ? String(clientIp).slice(0, 45) : null,
    userAgent: userAgent ? String(userAgent).slice(0, 2000) : null,
    requestId: requestId ? String(requestId).slice(0, 128) : null,
    metadata: safeMetadata,
  };

  try {
    const row = await prisma.auditLog.create({ data });
    return row;
  } catch (error) {
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      const ensured = await ensureAuditLogsTable(prisma, true);
      if (ensured) {
        try {
          return await prisma.auditLog.create({ data });
        } catch (retryError) {
          logger.warn('[AUDIT] Insert audit_logs échoué après ensure:', retryError.message);
          return null;
        }
      }
      logger.warn('[AUDIT] Table audit_logs absente — événement ignoré');
      return null;
    }
    logger.error('[AUDIT] Impossible d’enregistrer l’événement:', error.message);
    throw error;
  }
}

async function listAuditEvents(filters = {}) {
  const {
    startDate,
    endDate,
    action,
    actorUserId,
    resource,
    limit = 100,
    offset = 0,
  } = filters;

  const where = {};
  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = new Date(startDate);
    if (endDate) where.timestamp.lte = new Date(endDate);
  }
  if (action) where.action = String(action);
  if (actorUserId) where.actorUserId = String(actorUserId);
  if (resource) where.resource = String(resource);

  try {
    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: Math.min(Number(limit) || 100, 500),
        skip: Math.max(Number(offset) || 0, 0),
      }),
      prisma.auditLog.count({ where }),
    ]);
    return { rows, total };
  } catch (error) {
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      return { rows: [], total: 0, tableMissing: true };
    }
    throw error;
  }
}

function auditFromRequest(req, base = {}) {
  return {
    actorUserId: req.user?.id || base.actorUserId || null,
    actorEmail: req.user?.email || base.actorEmail || null,
    actorRole: req.user?.role || base.actorRole || null,
    clientIp: req.ip || req.connection?.remoteAddress || null,
    userAgent: req.get?.('User-Agent') || null,
    requestId: req.requestId || req.get?.('X-Request-Id') || null,
    ...base,
  };
}

module.exports = {
  recordAuditEvent,
  listAuditEvents,
  auditFromRequest,
  SENSITIVE_ACTIONS,
};
