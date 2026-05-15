'use strict';

/**
 * Format obligatoire du jeton de contournement WAF / intrusion (non-prod uniquement).
 * Un simple mot de passe ou une phrase « plausible » ne doit jamais activer le bypass.
 *
 * @see backend/api-gateway/src/utils/devTestBypassRequest.js
 * @see scripts/env/dev-test-bypass-fetch.cjs
 * @see scripts/env/dev-test-bypass-curl.inc.sh
 */

const PREFIX = 'jtbypass1-';
const SUFFIX_MIN_LEN = 32;
const SUFFIX_MAX_LEN = 192;
const SUFFIX_RE = `[A-Za-z0-9_-]{${SUFFIX_MIN_LEN},${SUFFIX_MAX_LEN}}`;
const FORMAT = new RegExp(`^${PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${SUFFIX_RE}$`);

/** Jeton sentinelle env (interdit aussi comme bypass). */
const JT_ENV_INCOMPLETE = '__JT_ENV_INCOMPLETE__';

/**
 * @param {unknown} t
 * @returns {boolean}
 */
function isValidDevTestBypassToken(t) {
  if (typeof t !== 'string') return false;
  const s = t.trim();
  if (s.length < PREFIX.length + SUFFIX_MIN_LEN) return false;
  if (s === JT_ENV_INCOMPLETE) return false;
  if (!s.startsWith(PREFIX)) return false;
  return FORMAT.test(s);
}

/**
 * @param {number} [randomBytes] défaut 32 → 43 car. base64url après préfixe
 * @returns {string}
 */
function generateDevTestBypassToken(randomBytes = 32) {
  const crypto = require('crypto');
  const suffix = crypto.randomBytes(randomBytes).toString('base64url');
  return `${PREFIX}${suffix}`;
}

module.exports = {
  PREFIX,
  SUFFIX_MIN_LEN,
  FORMAT,
  isValidDevTestBypassToken,
  generateDevTestBypassToken,
  JT_ENV_INCOMPLETE,
};
