const fs = require('fs');
const path = require('path');

const SETTINGS_PATH =
  process.env.SECURITY_SCORE_SETTINGS_PATH ||
  path.join(__dirname, '../../data/security-score-settings.json');

const DEFAULT_WEIGHTS = {
  threats: 2,
  logsNoise: 1,
  wafDisabled: 15,
};

function sanitizeWeights(value) {
  const input = value && typeof value === 'object' ? value : {};
  return {
    threats:
      typeof input.threats === 'number' && Number.isFinite(input.threats)
        ? Math.min(5, Math.max(1, Math.round(input.threats)))
        : DEFAULT_WEIGHTS.threats,
    logsNoise:
      typeof input.logsNoise === 'number' && Number.isFinite(input.logsNoise)
        ? Math.min(3, Math.max(1, Math.round(input.logsNoise)))
        : DEFAULT_WEIGHTS.logsNoise,
    wafDisabled:
      typeof input.wafDisabled === 'number' && Number.isFinite(input.wafDisabled)
        ? Math.min(25, Math.max(5, Math.round(input.wafDisabled)))
        : DEFAULT_WEIGHTS.wafDisabled,
  };
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
  const weights = sanitizeWeights(stored?.weights || stored);
  return {
    weights,
    updatedAt: stored?.updatedAt || null,
    updatedBy: stored?.updatedBy || null,
    source: stored ? 'file' : 'default',
  };
}

function saveSettings(payload = {}, actor = null) {
  const weights = sanitizeWeights(payload.weights || payload);
  const next = {
    weights,
    updatedAt: new Date().toISOString(),
    updatedBy: actor
      ? {
          userId: actor.id || null,
          email: actor.email || null,
          role: actor.role || null,
        }
      : null,
  };

  fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

module.exports = {
  DEFAULT_WEIGHTS,
  sanitizeWeights,
  getEffectiveSettings,
  saveSettings,
  SETTINGS_PATH,
};
