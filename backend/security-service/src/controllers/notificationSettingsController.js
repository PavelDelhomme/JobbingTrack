const { logger } = require('../utils/logger');
const securityNotificationSettings = require('../services/securityNotificationSettings');
const securityService = require('../services/securityService');

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

async function getNotificationSettings(req, res) {
  try {
    const settings = securityNotificationSettings.getEffectiveSettings();
    res.json({
      success: true,
      data: {
        ...settings,
        envHint: {
          SECURITY_ALERT_EMAIL: process.env.SECURITY_ALERT_EMAIL || null,
          CRASH_REPORT_EMAIL: process.env.CRASH_REPORT_EMAIL || null,
          SECURITY_ALERT_EMAIL_ENABLED: process.env.SECURITY_ALERT_EMAIL_ENABLED ?? null
        }
      }
    });
  } catch (error) {
    logger.error('Erreur lecture paramètres alertes sécurité:', error);
    res.status(500).json({ success: false, error: 'Impossible de lire les paramètres' });
  }
}

async function updateNotificationSettings(req, res) {
  try {
    const { recipients, levels, enabled } = req.body || {};
    if (recipients !== undefined) {
      if (!Array.isArray(recipients)) {
        return res.status(400).json({ success: false, error: 'recipients doit être un tableau' });
      }
      const invalid = recipients.filter((e) => !isValidEmail(e));
      if (invalid.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Adresse(s) invalide(s): ${invalid.join(', ')}`
        });
      }
    }
    if (levels !== undefined && !Array.isArray(levels)) {
      return res.status(400).json({ success: false, error: 'levels doit être un tableau' });
    }

    const saved = securityNotificationSettings.saveSettings({
      recipients,
      levels,
      enabled
    });

    const clientIP = req.ip || req.connection?.remoteAddress || 'unknown';
    await securityService.createSecurityLog({
      level: 'info',
      category: 'security',
      eventType: 'security_alert_email_settings_updated',
      message: `Paramètres alertes mail sécurité mis à jour (${saved.recipients.length} destinataire(s))`,
      sourceIP: clientIP,
      userId: req.user?.id || null,
      endpoint: req.originalUrl,
      method: req.method,
      metadata: {
        enabled: saved.enabled,
        levels: saved.levels,
        recipientCount: saved.recipients.length
      }
    }).catch(() => {});

    res.json({ success: true, data: saved });
  } catch (error) {
    logger.error('Erreur mise à jour paramètres alertes sécurité:', error);
    res.status(500).json({ success: false, error: 'Impossible de sauvegarder' });
  }
}

module.exports = {
  getNotificationSettings,
  updateNotificationSettings
};
