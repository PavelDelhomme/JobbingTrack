'use strict';

/**
 * Politique unique JobbingTrack : pas de « faux défauts » silencieux.
 *
 * - Valeur réservée globale {@link JT_ENV_INCOMPLETE} : interdite partout où une
 *   configuration réelle est attendue (fichier .env, secrets, URLs critiques).
 * - En production, les erreurs exposées restent génériques (code JT-CFG-001).
 * - En développement, le message indique le nom de variable pour corriger vite.
 *
 * Désactivation explicite (tests Jest, CI minimal) : JT_SKIP_STRICT_ENV=1
 */

const JT_ENV_INCOMPLETE = '__JT_ENV_INCOMPLETE__';
const PUBLIC_ERROR_CODE = 'JT-CFG-001';

function isIncomplete(value) {
  if (value === undefined || value === null) return true;
  const s = String(value).trim();
  if (s === '') return true;
  if (s === JT_ENV_INCOMPLETE) return true;
  return false;
}

function isStrictEnvSkipped() {
  return (
    process.env.NODE_ENV === 'test' ||
    String(process.env.JT_SKIP_STRICT_ENV || '').toLowerCase() === '1' ||
    String(process.env.JT_SKIP_STRICT_ENV || '').toLowerCase() === 'true'
  );
}

/**
 * @param {string} name
 * @param {{ optional?: boolean }} [opts]
 * @returns {string|undefined}
 */
function requireEnv(name, opts = {}) {
  const optional = Boolean(opts.optional);
  const raw = process.env[name];
  if (isIncomplete(raw)) {
    if (optional) return undefined;
    if (isStrictEnvSkipped()) return '';
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Refus de démarrage : configuration incomplète (${PUBLIC_ERROR_CODE})`);
    }
    throw new Error(
      `Variable d'environnement manquante ou non configurée : ${name}. ` +
        `Renseigner une valeur explicite dans .env (la valeur réservée « ${JT_ENV_INCOMPLETE} » est interdite). ` +
        `[${PUBLIC_ERROR_CODE}]`
    );
  }
  return String(raw).trim();
}

/**
 * @param {string} name
 * @param {string} value
 */
function assertNotIncomplete(name, value) {
  if (isIncomplete(value)) {
    if (isStrictEnvSkipped()) return;
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Refus de démarrage : configuration incomplète (${PUBLIC_ERROR_CODE})`);
    }
    throw new Error(
      `Valeur invalide pour ${name} : vide ou « ${JT_ENV_INCOMPLETE} ». [${PUBLIC_ERROR_CODE}]`
    );
  }
}

module.exports = {
  JT_ENV_INCOMPLETE,
  PUBLIC_ERROR_CODE,
  isIncomplete,
  isStrictEnvSkipped,
  requireEnv,
  assertNotIncomplete,
};
