#!/usr/bin/env node
/**
 * Aligne les variables de test mobile/email dans .env (sans afficher les secrets).
 *
 *   node scripts/mobile/sync-test-env.js
 *   node scripts/mobile/sync-test-env.js --write
 */

const fs = require('fs');
const path = require('path');
const { compareEnvDiagnostics } = require('./resolve-test-email-env');
const { loadRootEnv } = require('./resolve-admin-credentials');

const ENV_PATH = path.resolve(__dirname, '../../.env');
const WRITE = process.argv.includes('--write');

function parseEnvLines(content) {
  return content.split('\n');
}

function setEnvKey(lines, key, value) {
  const prefix = `${key}=`;
  let found = false;
  const next = lines.map((line) => {
    if (line.startsWith(prefix)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });
  if (!found) next.push(`${key}=${value}`);
  return next;
}

function main() {
  if (!fs.existsSync(ENV_PATH)) {
    console.error('.env introuvable');
    process.exit(1);
  }
  loadRootEnv();
  const before = compareEnvDiagnostics();
  const changes = [];

  let lines = parseEnvLines(fs.readFileSync(ENV_PATH, 'utf8'));

  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const testAdminEmail = process.env.TEST_ADMIN_EMAIL?.trim();
  const adminPass = process.env.ADMIN_PASSWORD || '';
  const testAdminPass = process.env.TEST_ADMIN_PASSWORD || '';

  if (adminEmail && testAdminEmail && adminEmail === testAdminEmail && adminPass && adminPass !== testAdminPass) {
    changes.push('TEST_ADMIN_PASSWORD ← ADMIN_PASSWORD (même email)');
    if (WRITE) lines = setEnvKey(lines, 'TEST_ADMIN_PASSWORD', adminPass);
  }

  const verifyPass =
    process.env.TEST_USER_PASSWORD?.trim() ||
    process.env.TEST_REAL_EMAIL_PASSWORD?.trim();
  if (!process.env.TEST_VERIFICATION_PASSWORD?.trim() && verifyPass) {
    const src = process.env.TEST_USER_PASSWORD?.trim()
      ? 'TEST_USER_PASSWORD'
      : 'TEST_REAL_EMAIL_PASSWORD';
    changes.push(`TEST_VERIFICATION_PASSWORD ← ${src}`);
    if (WRITE) lines = setEnvKey(lines, 'TEST_VERIFICATION_PASSWORD', verifyPass);
  }

  if (WRITE && changes.length > 0) {
    fs.writeFileSync(ENV_PATH, lines.join('\n'));
    loadRootEnv();
  }

  console.log('Diagnostic .env (email/mobile) :');
  const after = compareEnvDiagnostics();
  for (const msg of before.length ? before : ['(aucun écart critique)']) console.log(`  - ${msg}`);
  if (changes.length) {
    console.log(WRITE ? 'Modifications appliquées :' : 'Modifications proposées (--write pour appliquer) :');
    for (const c of changes) console.log(`  • ${c}`);
  } else {
    console.log('Aucune synchronisation nécessaire.');
  }
  if (!WRITE && changes.length) process.exitCode = 2;
}

main();
