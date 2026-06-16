const investigationService = require('../services/investigationService');
const { logger } = require('../utils/logger');

async function searchInvestigation(req, res) {
  try {
    const result = await investigationService.searchInvestigation({
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      sourceIp: req.query.sourceIp || req.query.ip,
      requestId: req.query.requestId,
      serviceName: req.query.serviceName || req.query.service,
      threatType: req.query.threatType,
      limit: req.query.limit,
    });
    return res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Erreur recherche investigation:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur recherche investigation',
      message: error.message,
    });
  }
}

async function exportInvestigation(req, res) {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const filters = {
      startDate: body.startDate || req.query.startDate,
      endDate: body.endDate || req.query.endDate,
      sourceIp: body.sourceIp || body.ip || req.query.sourceIp || req.query.ip,
      requestId: body.requestId || req.query.requestId,
      serviceName: body.serviceName || body.service || req.query.serviceName,
      threatType: body.threatType || req.query.threatType,
      limit: body.limit || req.query.limit,
    };
    const sections = Array.isArray(body.sections) ? body.sections : undefined;
    const format = body.format || req.query.format || 'json';

    const exported = await investigationService.exportInvestigation(req, filters, {
      sections,
      format,
    });

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="investigation-threats-${Date.now()}.csv"`
      );
      return res.send(exported.content);
    }

    return res.json({
      success: true,
      data: exported.bundle,
      auditRecorded: exported.auditRecorded,
    });
  } catch (error) {
    logger.error('Erreur export investigation:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur export investigation',
      message: error.message,
    });
  }
}

module.exports = {
  searchInvestigation,
  exportInvestigation,
};
