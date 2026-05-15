#!/usr/bin/env node
/**
 * Génère des secrets locaux forts dans .env sans les afficher.
 *
 * Le script ne « connaît » pas les secrets après coup : il écrit des octets aléatoires
 * (`crypto.randomBytes`) dans `.env`. Avoir seulement le dépôt ne permet pas de deviner
 * les valeurs générées ; en revanche, quiconque lit `.env` ou un backup le peut.
 *
 * Usage:
 *   node scripts/env/env-generate-secrets.cjs --write
 *   node scripts/env/env-generate-secrets.cjs --write --with-postgres
 *
 * --with-postgres : régénère aussi POSTGRES_PASSWORD et réécrit **DATABASE_URL** pour les
 *   outils sur la machine hôte (Prisma, scripts), en s’appuyant sur POSTGRES_USER, POSTGRES_DB,
 *   POSTGRES_PORT et optionnellement POSTGRES_CLIENT_HOST (défaut `localhost`). Les conteneurs
 *   Docker continuent d’utiliser la ligne `DATABASE_URL=...@postgres:5432/...` injectée par
 *   `docker-compose.yml`. Après exécution : recréer le volume Postgres ou `ALTER USER` pour
 *   appliquer le mot de passe.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { generateDevTestBypassToken } = require(path.join(
  __dirname,
  '../../config/dev-test-bypass-format.cjs'
));

const ROOT = path.resolve(__dirname, '../..');
const ENV_PATH = path.join(ROOT, '.env');

const SECRET_KEYS = [
  'ADMIN_PASSWORD',
  'JWT_REFRESH_SECRET',
  'JWT_SECRET',
  'DEV_AUTH_BYPASS_TOKEN',
  'DEV_TEST_BYPASS_TOKEN',
  'SECURITY_INTERNAL_SECRET',
  'METRICS_API_KEY',
  'TEST_ADMIN_PASSWORD',
  'TEST_USER_PASSWORD',
  'MOBILE_TEST_USER_PASSWORD',
];

function randomSecret(bytes = 48) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function parseLine(raw) {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  const line = trimmed.replace(/^export\s+/i, '');
  const idx = line.indexOf('=');
  if (idx === -1) return null;
  const key = line.slice(0, idx).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return null;
  return key;
}

function updateEnv(content, replacements) {
  const seen = new Set();
  const lines = content.split(/\r?\n/).map((raw) => {
    const key = parseLine(raw);
    if (!key || !replacements.has(key)) return raw;
    seen.add(key);
    return `${key}=${replacements.get(key)}`;
  });

  for (const [key, value] of replacements.entries()) {
    if (!seen.has(key)) {
      lines.push(`${key}=${value}`);
    }
  }

  return lines.join('\n').replace(/\n*$/, '\n');
}

function getEnvLineValue(content, key) {
  const lines = content.split(/\r?\n/);
  for (const raw of lines) {
    const k = parseLine(raw);
    if (k !== key) continue;
    const idx = raw.indexOf('=');
    if (idx === -1) continue;
    let v = raw.slice(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    return v;
  }
  return null;
}

/**
 * URL PostgreSQL pour la machine hôte (Prisma, scripts). Les services Docker utilisent
 * `postgres:5432` via compose, pas cette ligne.
 */
function buildHostDatabaseUrl(content, password) {
  const user = getEnvLineValue(content, 'POSTGRES_USER') || 'jobbingtrack';
  const db = getEnvLineValue(content, 'POSTGRES_DB') || 'jobbingtrack';
  const port = getEnvLineValue(content, 'POSTGRES_PORT') || '5000';
  const host =
    getEnvLineValue(content, 'POSTGRES_CLIENT_HOST') ||
    getEnvLineValue(content, 'DATABASE_URL_HOST') ||
    'localhost';
  const encUser = encodeURIComponent(user);
  const encPass = encodeURIComponent(password);
  return `postgresql://${encUser}:${encPass}@${host}:${port}/${db}?schema=public`;
}

function replaceDatabaseUrlLine(content, newUrl) {
  const lines = content.split(/\r?\n/);
  const out = [];
  let replaced = false;
  for (const raw of lines) {
    const key = parseLine(raw);
    if (key === 'DATABASE_URL') {
      out.push(`DATABASE_URL=${newUrl}`);
      replaced = true;
    } else {
      out.push(raw);
    }
  }
  if (!replaced) {
    out.push(`DATABASE_URL=${newUrl}`);
  }
  return out.join('\n').replace(/\n*$/, '\n');
}

function main() {
  const write = process.argv.includes('--write');
  const withPostgres = process.argv.includes('--with-postgres');
  if (!write) {
    console.error('Mode dry-run: ajoutez --write pour modifier .env. Aucune valeur ne sera affichée.');
    process.exit(2);
  }

  if (!fs.existsSync(ENV_PATH)) {
    console.error('Fichier .env introuvable. Créez-le depuis .env.example puis relancez.');
    process.exit(2);
  }

  const keys = [...SECRET_KEYS];
  if (withPostgres) {
    keys.push('POSTGRES_PASSWORD');
  }

  const replacements = new Map(
    keys.map((key) =>
      key === 'DEV_TEST_BYPASS_TOKEN' ? [key, generateDevTestBypassToken(32)] : [key, randomSecret()]
    )
  );
  let current = fs.readFileSync(ENV_PATH, 'utf8');
  let next = updateEnv(current, replacements);

  if (withPostgres) {
    const pass = replacements.get('POSTGRES_PASSWORD');
    const hostUrl = buildHostDatabaseUrl(next, pass);
    next = replaceDatabaseUrlLine(next, hostUrl);
    console.error(
      '[postgres] POSTGRES_PASSWORD et DATABASE_URL (hôte : POSTGRES_CLIENT_HOST ou localhost, ' +
        'POSTGRES_PORT) ont été régénérés. Recréez le conteneur/volume Postgres ou exécutez ALTER USER ' +
        'pour appliquer le mot de passe.'
    );
  }

  fs.writeFileSync(ENV_PATH, next, 'utf8');

  console.log(`Secrets locaux régénérés dans .env (${keys.length} clés). Valeurs non affichées.`);
  console.log(
    'À faire si nécessaire: relancer les seeds / comptes de test pour appliquer les nouveaux mots de passe en base.'
  );
  console.log(
    'Tests E2E / curl : en-tête X-JobbingTrack-Dev-Test-Token avec DEV_TEST_BYPASS_TOKEN au format jtbypass1-… ' +
      '(voir config/dev-test-bypass-format.cjs). Non utilisé en production.'
  );
}

main();
