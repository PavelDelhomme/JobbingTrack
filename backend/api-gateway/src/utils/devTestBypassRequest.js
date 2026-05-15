/**
 * Contournement WAF / intrusion / rate-limit réservé au développement et aux tests automatisés.
 * Ne jamais s'appuyer sur X-Test-Mode ou User-Agent « Playwright » (facilement falsifiables).
 * En production : toujours false.
 *
 * Le jeton doit suivre un format versionné impossible à confondre avec un mot de passe ou une URL
 * (voir config/dev-test-bypass-format.cjs).
 */
const crypto = require('crypto');
const path = require('path');
const { isValidDevTestBypassToken } = require(path.join(
  __dirname,
  '../../../../config/dev-test-bypass-format.cjs'
));

const HEADER_CANDIDATES = ['x-jobbingtrack-dev-test-token', 'X-JobbingTrack-Dev-Test-Token'];

function getConfiguredBypassToken() {
  const t = process.env.DEV_TEST_BYPASS_TOKEN || process.env.JOBBINGTRACK_DEV_TEST_BYPASS_TOKEN;
  if (typeof t !== 'string') return null;
  const trimmed = t.trim();
  if (!isValidDevTestBypassToken(trimmed)) return null;
  return trimmed;
}

function readBypassHeader(req) {
  if (!req || typeof req.get !== 'function') return null;
  for (const h of HEADER_CANDIDATES) {
    const v = req.get(h);
    if (v) return v;
  }
  return null;
}

function isDevTestBypassRequest(req) {
  if (process.env.NODE_ENV === 'production') return false;
  const secret = getConfiguredBypassToken();
  if (!secret) return false;
  const provided = readBypassHeader(req);
  if (!provided || typeof provided !== 'string') return false;
  if (!isValidDevTestBypassToken(provided.trim())) return false;
  try {
    const a = Buffer.from(secret, 'utf8');
    const b = Buffer.from(provided.trim(), 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

module.exports = {
  isDevTestBypassRequest,
  getConfiguredBypassToken,
};
