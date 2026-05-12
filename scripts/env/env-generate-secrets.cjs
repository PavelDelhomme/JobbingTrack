#!/usr/bin/env node
/**
 * Génère des secrets locaux forts dans .env sans les afficher.
 *
 * Usage:
 *   node scripts/env-generate-secrets.cjs --write
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const ENV_PATH = path.join(ROOT, '.env');

const SECRET_KEYS = [
  'ADMIN_PASSWORD',
  'JWT_REFRESH_SECRET',
  'JWT_SECRET',
  'DEV_AUTH_BYPASS_TOKEN',
  'SECURITY_INTERNAL_SECRET',
  'METRICS_API_KEY',
  'TEST_ADMIN_PASSWORD',
  'TEST_USER_PASSWORD',
  'MOBILE_TEST_USER_PASSWORD'
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

function main() {
  const write = process.argv.includes('--write');
  if (!write) {
    console.error('Mode dry-run: ajoutez --write pour modifier .env. Aucune valeur ne sera affichée.');
    process.exit(2);
  }

  if (!fs.existsSync(ENV_PATH)) {
    console.error('Fichier .env introuvable. Créez-le depuis .env.example puis relancez.');
    process.exit(2);
  }

  const replacements = new Map(SECRET_KEYS.map((key) => [key, randomSecret()]));
  const current = fs.readFileSync(ENV_PATH, 'utf8');
  const next = updateEnv(current, replacements);
  fs.writeFileSync(ENV_PATH, next, 'utf8');

  console.log(`Secrets locaux régénérés dans .env (${SECRET_KEYS.length} clés). Valeurs non affichées.`);
  console.log('À faire si nécessaire: relancer les seeds / comptes de test pour appliquer les nouveaux mots de passe en base.');
}

main();
