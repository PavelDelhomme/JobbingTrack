const axios = require('axios');
const { logger } = require('../utils/logger');
const securityNotificationSettings = require('./securityNotificationSettings');

function getRecipients() {
  return securityNotificationSettings.getEffectiveSettings().recipients;
}

function getNotifiedLevels() {
  return securityNotificationSettings.getEffectiveSettings().levels;
}

function isEnabled() {
  return securityNotificationSettings.getEffectiveSettings().enabled;
}

function htmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const SENSITIVE_KEY_PATTERN =
  /(pass(word)?|secret|token|authorization|api[_-]?key|smtp|credential|private|bearer)/i;

function redactSensitiveValue(value) {
  if (value == null) {
    return value;
  }
  if (typeof value === 'string') {
    if (value.length > 240) {
      return `${value.slice(0, 240)}…`;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 12).map((entry) => redactSensitiveValue(entry));
  }
  if (typeof value === 'object') {
    return redactSensitiveMetadata(value);
  }
  return value;
}

function redactSensitiveMetadata(metadata) {
  const output = {};
  for (const [key, value] of Object.entries(metadata || {})) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      output[key] = '[redacted]';
      continue;
    }
    output[key] = redactSensitiveValue(value);
  }
  return output;
}

function resolveBackofficeBaseUrl() {
  const candidate =
    process.env.BACKOFFICE_FRONTEND_URL ||
    process.env.FRONTEND_URL ||
    process.env.DEV_HTTPS_FRONTEND_URL ||
    'http://localhost:5003';
  return String(candidate).replace(/\/$/, '');
}

function buildDiagnosticLinks() {
  const base = resolveBackofficeBaseUrl();
  const backoffice = base.includes('/b4ck0ff1ce') ? base : `${base}/b4ck0ff1ce`;
  return {
    emailMonitor: `${backoffice}/email-monitor?type=NOTIFICATION`,
    security: `${backoffice}/security`,
    securityAlerts: `${backoffice}/security/alerts`
  };
}

function buildContextRows(alert, metadata) {
  const rows = [
    ['Niveau', alert.level],
    ['Catégorie', alert.category],
    ['Source / service', alert.source || metadata.serviceName || 'unknown'],
    ['Type', metadata.alertType || metadata.reason || null],
    ['Horodatage', alert.createdAt || alert.triggeredAt || new Date().toISOString()]
  ];

  if (metadata.serviceName) {
    rows.push(['Service touché', metadata.serviceName]);
  }
  if (metadata.status) {
    rows.push(['Statut observé', metadata.status]);
  }
  if (metadata.healthStatus) {
    rows.push(['Santé', metadata.healthStatus]);
  }
  if (metadata.error) {
    rows.push(['Erreur', metadata.error]);
  }
  if (metadata.metricsServiceUrl) {
    rows.push(['Source monitoring', metadata.metricsServiceUrl]);
  }
  if (metadata.requestId) {
    rows.push(['Request ID', metadata.requestId]);
  }
  if (metadata.correlationId) {
    rows.push(['Correlation ID', metadata.correlationId]);
  }

  return rows.filter(([, value]) => value != null && String(value).trim() !== '');
}

function buildPayload(alert) {
  const metadata = alert.metadata && typeof alert.metadata === 'object' ? alert.metadata : {};
  const safeMetadata = redactSensitiveMetadata(metadata);
  const metadataHtml = htmlEscape(JSON.stringify(safeMetadata, null, 2));
  const links = buildDiagnosticLinks();
  const contextRows = buildContextRows(alert, metadata)
    .map(
      ([label, value]) =>
        `<tr><td style="font-weight: bold; padding: 6px; vertical-align: top;">${htmlEscape(label)}</td><td style="padding: 6px; word-break: break-word;">${htmlEscape(value)}</td></tr>`
    )
    .join('');

  return {
    subject: `[JobbingTrack Security] ${String(alert.level || 'alert').toUpperCase()} - ${alert.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 720px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #991b1b; margin-bottom: 8px;">Alerte sécurité JobbingTrack</h1>
        <p style="color: #4b5563;">Une alerte de niveau <strong>${htmlEscape(alert.level)}</strong> vient d'être créée.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="font-weight: bold; padding: 6px;">Titre</td><td style="padding: 6px;">${htmlEscape(alert.title)}</td></tr>
          ${contextRows}
        </table>
        <h2 style="font-size: 16px;">Description</h2>
        <p style="white-space: pre-wrap;">${htmlEscape(alert.description)}</p>
        <h2 style="font-size: 16px;">Diagnostic admin</h2>
        <ul style="padding-left: 18px; color: #374151;">
          <li><a href="${htmlEscape(links.emailMonitor)}">Email Monitor — notifications</a></li>
          <li><a href="${htmlEscape(links.securityAlerts)}">Alertes email sécurité</a></li>
          <li><a href="${htmlEscape(links.security)}">Backoffice sécurité</a></li>
        </ul>
        <h2 style="font-size: 16px;">Contexte technique (redigé)</h2>
        <pre style="background: #f3f4f6; padding: 12px; overflow: auto; white-space: pre-wrap;">${metadataHtml}</pre>
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
  notifySecurityAlert,
  buildPayload,
  redactSensitiveMetadata,
  buildDiagnosticLinks
};
