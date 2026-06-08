const { logger } = require('../utils/logger');
const securityNotificationSettings = require('../services/securityNotificationSettings');
const securityService = require('../services/securityService');
const securityAlertEmailNotifier = require('../services/securityAlertEmailNotifier');
const { verifyCurrentPassword } = require('../services/passwordReauth');

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function buildSettingsDiff(before, after) {
  const beforeRecipients = new Set(before.recipients || []);
  const afterRecipients = new Set(after.recipients || []);
  const addedRecipients = [...afterRecipients].filter((email) => !beforeRecipients.has(email)).length;
  const removedRecipients = [...beforeRecipients].filter((email) => !afterRecipients.has(email)).length;

  return {
    enabledChanged: before.enabled !== after.enabled,
    levelsChanged: JSON.stringify(before.levels || []) !== JSON.stringify(after.levels || []),
    recipientsAdded: addedRecipients,
    recipientsRemoved: removedRecipients,
    recipientCountBefore: before.recipients?.length || 0,
    recipientCountAfter: after.recipients?.length || 0
  };
}

async function auditSettingsChange(req, eventType, message, metadata) {
  const clientIP = req.ip || req.connection?.remoteAddress || 'unknown';
  await securityService.createSecurityLog({
    level: 'info',
    category: 'security',
    eventType,
    message,
    sourceIP: clientIP,
    userId: req.user?.id || null,
    endpoint: req.originalUrl,
    method: req.method,
    metadata: {
      ...metadata,
      actor: {
        userId: req.user?.id || null,
        email: req.user?.email || null,
        role: req.user?.role || null
      }
    }
  }).catch(() => {});
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
    const { recipients, levels, enabled, currentPassword } = req.body || {};

    const reauth = await verifyCurrentPassword(req, currentPassword);
    if (!reauth.ok) {
      return res.status(reauth.status).json({ success: false, error: reauth.error });
    }

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

    const before = securityNotificationSettings.getEffectiveSettings();
    const saved = securityNotificationSettings.saveSettings({
      recipients,
      levels,
      enabled
    });
    const diff = buildSettingsDiff(before, saved);

    await auditSettingsChange(
      req,
      'security_alert_email_settings_updated',
      `Paramètres alertes mail sécurité mis à jour (${saved.recipients.length} destinataire(s))`,
      {
        enabled: saved.enabled,
        levels: saved.levels,
        recipientCount: saved.recipients.length,
        diff,
        reauthenticated: true
      }
    );

    res.json({ success: true, data: saved });
  } catch (error) {
    logger.error('Erreur mise à jour paramètres alertes sécurité:', error);
    res.status(500).json({ success: false, error: 'Impossible de sauvegarder' });
  }
}

async function sendTestNotificationEmail(req, res) {
  try {
    const { currentPassword } = req.body || {};
    const reauth = await verifyCurrentPassword(req, currentPassword);
    if (!reauth.ok) {
      return res.status(reauth.status).json({ success: false, error: reauth.error });
    }

    const settings = securityNotificationSettings.getEffectiveSettings();
    if (!settings.enabled) {
      return res.status(400).json({
        success: false,
        error: 'Les alertes email sont désactivées — activez-les avant le test'
      });
    }
    if (!settings.recipients?.length) {
      return res.status(400).json({
        success: false,
        error: 'Aucun destinataire configuré — ajoutez au moins une adresse'
      });
    }

    const testAlert = {
      id: `test-${Date.now()}`,
      level: 'high',
      title: 'Test alerte email sécurité (backoffice)',
      category: 'security',
      source: 'notification-settings-test',
      description:
        'Email de test déclenché depuis Paramètres → Notifications. Si vous le recevez, la chaîne SMTP/MailHog est opérationnelle.',
      metadata: {
        triggeredBy: req.user?.email || req.user?.id || 'admin',
        triggeredAt: new Date().toISOString(),
        recipientCount: settings.recipients.length
      }
    };

    const result = await securityAlertEmailNotifier.notifySecurityAlert(testAlert);
    const sentCount = (result.results || []).filter((r) => r.sent).length;

    await auditSettingsChange(
      req,
      'security_alert_email_test_sent',
      `Email de test alerte sécurité (${sentCount}/${settings.recipients.length} envoyé(s))`,
      {
        alertLevel: testAlert.level,
        sent: result.sent,
        sentCount,
        recipientCount: settings.recipients.length,
        results: (result.results || []).map((r) => ({
          to: r.to,
          sent: r.sent,
          error: r.error || null
        })),
        reauthenticated: true
      }
    );

    if (!result.sent) {
      return res.status(502).json({
        success: false,
        error: result.reason || 'Échec envoi email de test',
        data: result
      });
    }

    res.status(202).json({
      success: true,
      message: `Email de test envoyé à ${sentCount} destinataire(s)`,
      data: result
    });
  } catch (error) {
    logger.error('Erreur envoi email de test alertes sécurité:', error);
    res.status(500).json({ success: false, error: 'Impossible d\'envoyer l\'email de test' });
  }
}

module.exports = {
  getNotificationSettings,
  updateNotificationSettings,
  sendTestNotificationEmail
};
