'use strict';

/**
 * Résolution de DEV_TEST_BYPASS_TOKEN pour scripts Node (tests e2e, outillage).
 * Source de vérité du format : config/dev-test-bypass-format.cjs
 * Complément shell : dev-test-bypass-curl.inc.sh (même dossier).
 */

const fs = require('fs');
const path = require('path');
const { isValidDevTestBypassToken } = require(path.join(__dirname, '../../config/dev-test-bypass-format.cjs'));

function parseEnvKey(content, key) {
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    if (k !== key) continue;
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    return v || null;
  }
  return null;
}

function readKeyFromFile(filePath, key) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return parseEnvKey(fs.readFileSync(filePath, 'utf8'), key);
  } catch {
    return null;
  }
}

const KEYS = ['DEV_TEST_BYPASS_TOKEN', 'JOBBINGTRACK_DEV_TEST_BYPASS_TOKEN'];

function scanTreeForToken(startDir) {
  let d = path.resolve(startDir);
  for (let i = 0; i < 10; i++) {
    for (const rel of ['.env', path.join('frontend', '.env')]) {
      const filePath = path.join(d, rel);
      for (const key of KEYS) {
        const v = readKeyFromFile(filePath, key);
        if (v && isValidDevTestBypassToken(v)) return v.trim();
      }
    }
    const parent = path.dirname(d);
    if (parent === d) break;
    d = parent;
  }
  return null;
}

/**
 * @param {string} [startDir] répertoire de départ pour remonter vers la racine du dépôt
 * @returns {string|null}
 */
function resolveDevTestBypassToken(startDir) {
  const fromProc =
    process.env.DEV_TEST_BYPASS_TOKEN || process.env.JOBBINGTRACK_DEV_TEST_BYPASS_TOKEN;
  if (typeof fromProc === 'string' && isValidDevTestBypassToken(fromProc)) return fromProc.trim();

  if (startDir) {
    const t = scanTreeForToken(startDir);
    if (t) return t;
  }
  return scanTreeForToken(process.cwd());
}

/** @returns {Record<string, string>} */
function devTestBypassFetchHeaders(startDir) {
  const t = resolveDevTestBypassToken(startDir);
  if (!t) return {};
  return { 'X-JobbingTrack-Dev-Test-Token': t };
}

module.exports = {
  resolveDevTestBypassToken,
  devTestBypassFetchHeaders,
};
