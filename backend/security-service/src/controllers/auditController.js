const auditService = require('../services/auditService');
const { logger } = require('../utils/logger');

function requireInternalOrAdmin(req, res, next) {
  const internalSecret = process.env.SECURITY_INTERNAL_SECRET;
  const internalHeader = req.get('X-Internal-Secret') || req.get('x-internal-secret');
  if (internalSecret && internalHeader === internalSecret) {
    return next();
  }
  const role = req.user?.role;
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    return next();
  }
  return res.status(403).json({
    success: false,
    error: 'Accès refusé',
    message: 'Rôle administrateur ou secret interne requis',
  });
}

async function recordAuditEvent(req, res) {
  try {
    const payload = auditService.auditFromRequest(req, req.body || {});
    if (!payload.action) {
      return res.status(400).json({
        success: false,
        error: 'action requis',
      });
    }
    const saved = await auditService.recordAuditEvent(payload);
    return res.status(201).json({
      success: true,
      data: saved,
      tableMissing: saved === null,
    });
  } catch (error) {
    logger.error('Erreur enregistrement audit:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur enregistrement audit',
      message: error.message,
    });
  }
}

async function getAuditEvents(req, res) {
  try {
    const result = await auditService.listAuditEvents({
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      action: req.query.action,
      actorUserId: req.query.actorUserId,
      resource: req.query.resource,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    return res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: result.total,
        limit: Number(req.query.limit) || 100,
        offset: Number(req.query.offset) || 0,
      },
      tableMissing: result.tableMissing === true,
    });
  } catch (error) {
    logger.error('Erreur lecture audit:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lecture audit',
      message: error.message,
    });
  }
}

module.exports = {
  requireInternalOrAdmin,
  recordAuditEvent,
  getAuditEvents,
};
