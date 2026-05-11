const axios = require('axios');
const { logger } = require('../utils/logger');

const DEFAULT_LEVELS = ['critical', 'high'];

function parseList(value) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function getRecipients() {
  const explicitRecipients = parseList(process.env.SECURITY_ALERT_EMAILS || process.env.SECURITY_ALERT_EMAIL);
  if (explicitRecipients.length > 0) return explicitRecipients;
  return parseList(process.env.CRASH_REPORT_EMAIL);
}

function getNotifiedLevels() {
  const levels = parseList(process.env.SECURITY_ALERT_EMAIL_LEVELS).map(level => level.toLowerCase());
  return levels.length > 0 ? levels : DEFAULT_LEVELS;
}

function isEnabled() {
  return process.env.SECURITY_ALERT_EMAIL_ENABLED !== 'false';
}

function htmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildPayload(alert) {
  const metadata = alert.metadata && typeof alert.metadata === 'object' ? alert.metadata : {};
  const metadataHtml = htmlEscape(JSON.stringify(metadata, null, 2));

  return {
    subject: `[JobbingTrack Security] ${String(alert.level || 'alert').toUpperCase()} - ${alert.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 720px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #991b1b; margin-bottom: 8px;">Alerte sécurité JobbingTrack</h1>
        <p style="color: #4b5563;">Une alerte de niveau <strong>${htmlEscape(alert.level)}</strong> vient d'être créée.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="font-weight: bold; padding: 6px;">Titre</td><td style="padding: 6px;">${htmlEscape(alert.title)}</td></tr>
          <tr><td style="font-weight: bold; padding: 6px;">Catégorie</td><td style="padding: 6px;">${htmlEscape(alert.category)}</td></tr>
          <tr><td style="font-weight: bold; padding: 6px;">Source</td><td style="padding: 6px;">${htmlEscape(alert.source || 'unknown')}</td></tr>
          <tr><td style="font-weight: bold; padding: 6px;">Date</td><td style="padding: 6px;">${htmlEscape(new Date().toISOString())}</td></tr>
        </table>
        <h2 style="font-size: 16px;">Description</h2>
        <p>${htmlEscape(alert.description)}</p>
        <h2 style="font-size: 16px;">Métadonnées</h2>
        <pre style="background: #f3f4f6; padding: 12px; overflow: auto;">${metadataHtml}</pre>
      </div>
    `
  };
}

async function notifySecurityAlert(alert) {
  if (!isEnabled()) {
    return { sent: false, reason: 'disabled' };
  }

  const level = String(alert?.level || '').toLowerCase();
  if (!getNotifiedLevels().includes(level)) {
    return { sent: false, reason: 'level_not_notified' };
  }

  const recipients = getRecipients();
  if (recipients.length === 0) {
    return { sent: false, reason: 'missing_recipient' };
  }

  const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL;
  const internalSecret = process.env.SECURITY_INTERNAL_SECRET;
  if (!notificationServiceUrl || !internalSecret) {
    return { sent: false, reason: 'missing_notification_service_config' };
  }

  const payload = buildPayload(alert);
  const endpoint = `${notificationServiceUrl.replace(/\/$/, '')}/api/v1/notifications/internal/security-alert-email`;
  const results = [];

  for (const recipient of recipients) {
    try {
      const response = await axios.post(
        endpoint,
        {
          to: recipient,
          subject: payload.subject,
          html: payload.html,
          alert: {
            id: alert.id,
            level: alert.level,
            title: alert.title,
            category: alert.category,
            source: alert.source
          }
        },
        {
          timeout: Number(process.env.SECURITY_ALERT_EMAIL_TIMEOUT_MS || 5000),
          headers: {
            'X-Internal-Secret': internalSecret
          }
        }
      );
      results.push({ to: recipient, sent: response.data?.success === true });
    } catch (error) {
      logger.warn('Envoi email alerte sécurité échoué', {
        recipient,
        alertId: alert.id,
        error: error.message
      });
      results.push({ to: recipient, sent: false, error: error.message });
    }
  }

  return {
    sent: results.some(result => result.sent),
    results
  };
}

module.exports = {
  notifySecurityAlert
};
