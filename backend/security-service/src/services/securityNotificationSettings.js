const fs = require('fs');
const path = require('path');

const SETTINGS_PATH =
  process.env.SECURITY_NOTIFICATION_SETTINGS_PATH ||
  path.join(__dirname, '../../data/security-notification-settings.json');

const DEFAULT_LEVELS = ['critical', 'high'];

function parseList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function readFileSettings() {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) return null;
    const raw = fs.readFileSync(SETTINGS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function getEffectiveSettings() {
  const stored = readFileSettings();
  const envRecipients = parseList(
    process.env.SECURITY_ALERT_EMAILS || process.env.SECURITY_ALERT_EMAIL
  );
  const envFallback = parseList(process.env.CRASH_REPORT_EMAIL);
  const envLevels = parseList(process.env.SECURITY_ALERT_EMAIL_LEVELS).map((l) =>
    l.toLowerCase()
  );

  const recipients =
    Array.isArray(stored?.recipients) && stored.recipients.length > 0
      ? stored.recipients
      : envRecipients.length > 0
        ? envRecipients
        : envFallback;

  const levels =
    Array.isArray(stored?.levels) && stored.levels.length > 0
      ? stored.levels.map((l) => String(l).toLowerCase())
      : envLevels.length > 0
        ? envLevels
        : DEFAULT_LEVELS;

  const enabled =
    stored?.enabled !== undefined
      ? Boolean(stored.enabled)
      : process.env.SECURITY_ALERT_EMAIL_ENABLED !== 'false';

  return {
    enabled,
    recipients,
    levels,
    updatedAt: stored?.updatedAt || null,
    source: stored ? 'file' : envRecipients.length || envFallback.length ? 'env' : 'default'
  };
}

function saveSettings(payload = {}) {
  const current = getEffectiveSettings();
  const recipients = Array.isArray(payload.recipients)
    ? payload.recipients.map((e) => String(e).trim()).filter(Boolean)
    : current.recipients;
  const levels = Array.isArray(payload.levels)
    ? payload.levels.map((l) => String(l).toLowerCase()).filter(Boolean)
    : current.levels;
  const enabled =
    payload.enabled !== undefined ? Boolean(payload.enabled) : current.enabled;

  const next = {
    enabled,
    recipients,
    levels: levels.length > 0 ? levels : DEFAULT_LEVELS,
    updatedAt: new Date().toISOString()
  };

  fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

module.exports = {
  getEffectiveSettings,
  saveSettings,
  SETTINGS_PATH
};
