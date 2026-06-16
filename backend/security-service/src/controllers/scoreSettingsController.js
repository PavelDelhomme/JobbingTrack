const { logger } = require('../utils/logger');
const securityScoreSettings = require('../services/securityScoreSettings');
const securityService = require('../services/securityService');

async function getScoreSettings(req, res) {
  try {
    const settings = securityScoreSettings.getEffectiveSettings();
    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    logger.error('Erreur lecture pondération score sécurité:', error);
    res.status(500).json({
      success: false,
      error: 'Impossible de lire la pondération du score',
    });
  }
}

async function updateScoreSettings(req, res) {
  try {
    const { weights } = req.body || {};
    if (!weights || typeof weights !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'weights est requis (threats, logsNoise, wafDisabled)',
      });
    }

    const before = securityScoreSettings.getEffectiveSettings();
    const saved = securityScoreSettings.saveSettings({ weights }, req.user || null);

    const auditService = require('../services/auditService');
    await auditService
      .recordAuditEvent(
        auditService.auditFromRequest(req, {
          action: 'security_score_weights_update',
          resource: 'security_score_settings',
          outcome: 'success',
          metadata: {
            before: before.weights,
            after: saved.weights,
          },
        }),
      )
      .catch(() => {});

    const clientIP = req.ip || req.connection?.remoteAddress || 'unknown';
    await securityService
      .createSecurityLog({
        level: 'info',
        category: 'security',
        eventType: 'security_score_weights_update',
        message: 'Pondération du score sécurité mise à jour',
        sourceIP: clientIP,
        userId: req.user?.id || null,
        endpoint: req.originalUrl,
        method: req.method,
        metadata: {
          before: before.weights,
          after: saved.weights,
          actor: {
            userId: req.user?.id || null,
            email: req.user?.email || null,
            role: req.user?.role || null,
          },
        },
      })
      .catch(() => {});

    res.json({
      success: true,
      data: {
        weights: saved.weights,
        updatedAt: saved.updatedAt,
        updatedBy: saved.updatedBy,
        source: 'file',
      },
    });
  } catch (error) {
    logger.error('Erreur mise à jour pondération score sécurité:', error);
    res.status(500).json({
      success: false,
      error: 'Impossible de mettre à jour la pondération du score',
    });
  }
}

module.exports = {
  getScoreSettings,
  updateScoreSettings,
};
