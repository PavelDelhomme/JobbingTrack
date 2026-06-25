#!/usr/bin/env node
/**
 * Aligne les variables email/triage/mobile dans `.env` (sans afficher les secrets).
 *
 *   node scripts/mobile/setup/sync-test-env.js
 *   node scripts/mobile/setup/sync-test-env.js --write
 */

const fs = require('fs');
const path = require('path');
const { compareEnvDiagnostics } = require('../lib/resolve-test-email-env');
const { loadRootEnv } = require('../lib/resolve-admin-credentials');
const { resolveEmailTriageEnv, isPlaceholder } = require('../lib/resolve-email-triage-env');

const ENV_PATH = path.resolve(__dirname, '../../../.env');
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

function isEmptyValue(lines, key) {
  const line = lines.find((l) => l.startsWith(`${key}=`));
  if (!line) return true;
  const val = line.slice(key.length + 1).trim();
  return !val || isPlaceholder(val);
}

function isInvalidImapHost(lines, key = 'TEST_EMAIL_TRIAGE_IMAP_HOST') {
  const line = lines.find((l) => l.startsWith(`${key}=`));
  if (!line) return true;
  const val = line.slice(key.length + 1).trim().toLowerCase();
  return !val || val.includes('example.com') || val.includes('example.invalid');
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
  const cfg = resolveEmailTriageEnv();

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

  if (cfg.gmailAccount) {
    if (isEmptyValue(lines, 'TEST_EMAIL_TRIAGE_GMAIL_ACCOUNT')) {
      changes.push('TEST_EMAIL_TRIAGE_GMAIL_ACCOUNT ← EMAIL_GMAIL_PRO_ACCOUNT');
      if (WRITE) lines = setEnvKey(lines, 'TEST_EMAIL_TRIAGE_GMAIL_ACCOUNT', cfg.gmailAccount);
    }
    if (isEmptyValue(lines, 'EMAIL_TRIAGE_DIGEST_RECIPIENT')) {
      changes.push('EMAIL_TRIAGE_DIGEST_RECIPIENT ← EMAIL_GMAIL_PRO_ACCOUNT');
      if (WRITE) lines = setEnvKey(lines, 'EMAIL_TRIAGE_DIGEST_RECIPIENT', cfg.gmailAccount);
    }
    const testUser =
      process.env.TEST_USER_EMAIL?.trim() || process.env.TEST_REAL_EMAIL?.split(',')[0]?.trim();
    if (testUser && isEmptyValue(lines, 'EMAIL_TRIAGE_DIGEST_OVERRIDE_EMAILS')) {
      changes.push('EMAIL_TRIAGE_DIGEST_OVERRIDE_EMAILS ← TEST_USER_EMAIL');
      if (WRITE) lines = setEnvKey(lines, 'EMAIL_TRIAGE_DIGEST_OVERRIDE_EMAILS', testUser);
    }
    if (isEmptyValue(lines, 'EMAIL_TRIAGE_FORWARD_ADDRESS')) {
      changes.push('EMAIL_TRIAGE_FORWARD_ADDRESS ← EMAIL_GMAIL_PRO_ACCOUNT');
      if (WRITE) lines = setEnvKey(lines, 'EMAIL_TRIAGE_FORWARD_ADDRESS', cfg.gmailAccount);
    } else {
      const forwardLine = lines.find((l) => l.startsWith('EMAIL_TRIAGE_FORWARD_ADDRESS='));
      const forwardVal = forwardLine?.slice('EMAIL_TRIAGE_FORWARD_ADDRESS='.length).trim();
      if (forwardVal && cfg.readAccount && forwardVal === cfg.readAccount) {
        changes.push('EMAIL_TRIAGE_FORWARD_ADDRESS ← EMAIL_GMAIL_PRO_ACCOUNT (destination forward, pas la boîte OVH)');
        if (WRITE) lines = setEnvKey(lines, 'EMAIL_TRIAGE_FORWARD_ADDRESS', cfg.gmailAccount);
      }
    }
  }

  if (cfg.readAccount) {
    if (isEmptyValue(lines, 'TEST_EMAIL_TRIAGE_IMAP_EMAIL')) {
      changes.push('TEST_EMAIL_TRIAGE_IMAP_EMAIL ← EMAIL_TRIAGE_READ_ACCOUNT');
      if (WRITE) lines = setEnvKey(lines, 'TEST_EMAIL_TRIAGE_IMAP_EMAIL', cfg.readAccount);
    }
    const ovhHost = process.env.TEST_REAL_EMAIL_IMAP_HOST?.trim() || 'imap.mail.ovh.net';
    const ovhHostFixed = ovhHost.includes('ssl0.ovh.net') ? 'imap.mail.ovh.net' : ovhHost;
    const ovhPort = process.env.TEST_REAL_EMAIL_IMAP_PORT?.trim() || '993';
    if (isEmptyValue(lines, 'TEST_EMAIL_TRIAGE_IMAP_HOST') || isInvalidImapHost(lines)) {
      changes.push(`TEST_EMAIL_TRIAGE_IMAP_HOST ← ${ovhHostFixed}`);
      if (WRITE) lines = setEnvKey(lines, 'TEST_EMAIL_TRIAGE_IMAP_HOST', ovhHostFixed);
    }
    if (isEmptyValue(lines, 'TEST_EMAIL_TRIAGE_IMAP_PORT')) {
      changes.push(`TEST_EMAIL_TRIAGE_IMAP_PORT ← ${ovhPort}`);
      if (WRITE) lines = setEnvKey(lines, 'TEST_EMAIL_TRIAGE_IMAP_PORT', ovhPort);
    }
    const readPass = process.env.EMAIL_TRIAGE_READ_PASSWORD?.trim();
    const imapPass =
      readPass ||
      process.env.TEST_EMAIL_TRIAGE_IMAP_PASSWORD?.trim() ||
      process.env.TEST_REAL_EMAIL_IMAP_PASSWORD?.trim() ||
      process.env.TEST_REAL_EMAIL_PASSWORD?.trim();
    const currentTriagePass = lines
      .find((l) => l.startsWith('TEST_EMAIL_TRIAGE_IMAP_PASSWORD='))
      ?.slice('TEST_EMAIL_TRIAGE_IMAP_PASSWORD='.length)
      .trim();
    const shouldSyncTriagePass =
      readPass &&
      (isEmptyValue(lines, 'TEST_EMAIL_TRIAGE_IMAP_PASSWORD') || currentTriagePass !== readPass);
    if (shouldSyncTriagePass) {
      changes.push('TEST_EMAIL_TRIAGE_IMAP_PASSWORD ← EMAIL_TRIAGE_READ_PASSWORD');
      if (WRITE) lines = setEnvKey(lines, 'TEST_EMAIL_TRIAGE_IMAP_PASSWORD', readPass);
    } else if (isEmptyValue(lines, 'TEST_EMAIL_TRIAGE_IMAP_PASSWORD') && imapPass) {
      const src = readPass
        ? 'EMAIL_TRIAGE_READ_PASSWORD'
        : process.env.TEST_REAL_EMAIL_IMAP_PASSWORD?.trim()
          ? 'TEST_REAL_EMAIL_IMAP_PASSWORD'
          : 'TEST_REAL_EMAIL_PASSWORD';
      changes.push(`TEST_EMAIL_TRIAGE_IMAP_PASSWORD ← ${src}`);
      if (WRITE) lines = setEnvKey(lines, 'TEST_EMAIL_TRIAGE_IMAP_PASSWORD', imapPass);
    }
    const bluemail = cfg.readAccount;
    if (bluemail && isEmptyValue(lines, 'NEXT_PUBLIC_VERIFICATION_BLUEMAIL_EMAIL')) {
      changes.push('NEXT_PUBLIC_VERIFICATION_BLUEMAIL_EMAIL ← EMAIL_TRIAGE_READ_ACCOUNT');
      if (WRITE) lines = setEnvKey(lines, 'NEXT_PUBLIC_VERIFICATION_BLUEMAIL_EMAIL', bluemail);
    }
    const bluemailPass =
      readPass ||
      process.env.NEXT_PUBLIC_VERIFICATION_BLUEMAIL_PASSWORD?.trim() ||
      process.env.TEST_EMAIL_TRIAGE_IMAP_PASSWORD?.trim() ||
      imapPass;
    const currentBluemailPass = lines
      .find((l) => l.startsWith('NEXT_PUBLIC_VERIFICATION_BLUEMAIL_PASSWORD='))
      ?.slice('NEXT_PUBLIC_VERIFICATION_BLUEMAIL_PASSWORD='.length)
      .trim();
    const shouldSyncBluemailPass =
      readPass &&
      bluemail &&
      (isEmptyValue(lines, 'NEXT_PUBLIC_VERIFICATION_BLUEMAIL_PASSWORD') ||
        currentBluemailPass !== readPass);
    if (shouldSyncBluemailPass) {
      changes.push('NEXT_PUBLIC_VERIFICATION_BLUEMAIL_PASSWORD ← EMAIL_TRIAGE_READ_PASSWORD');
      if (WRITE) lines = setEnvKey(lines, 'NEXT_PUBLIC_VERIFICATION_BLUEMAIL_PASSWORD', readPass);
    } else if (isEmptyValue(lines, 'NEXT_PUBLIC_VERIFICATION_BLUEMAIL_PASSWORD') && bluemailPass) {
      changes.push('NEXT_PUBLIC_VERIFICATION_BLUEMAIL_PASSWORD ← mot de passe boîte OVH');
      if (WRITE) lines = setEnvKey(lines, 'NEXT_PUBLIC_VERIFICATION_BLUEMAIL_PASSWORD', bluemailPass);
    }
  }

  if (cfg.gmailAccount) {
    const digestLine = lines.find((l) => l.startsWith('TEST_EMAIL_TRIAGE_DIGEST_RECIPIENT='));
    const digestVal = digestLine?.slice('TEST_EMAIL_TRIAGE_DIGEST_RECIPIENT='.length).trim();
    if (!digestVal || isPlaceholder(digestVal)) {
      changes.push('TEST_EMAIL_TRIAGE_DIGEST_RECIPIENT ← EMAIL_GMAIL_PRO_ACCOUNT');
      if (WRITE) lines = setEnvKey(lines, 'TEST_EMAIL_TRIAGE_DIGEST_RECIPIENT', cfg.gmailAccount);
    }
  }

  if (WRITE && changes.length > 0) {
    fs.writeFileSync(ENV_PATH, lines.join('\n'));
    loadRootEnv();
  }

  console.log('Diagnostic .env (email/triage/mobile) :');
  const after = compareEnvDiagnostics();
  for (const msg of (WRITE ? after : before).length ? (WRITE ? after : before) : ['(aucun écart critique)']) {
    console.log(`  - ${msg}`);
  }
  if (changes.length) {
    console.log(WRITE ? 'Modifications appliquées :' : 'Modifications proposées (--write pour appliquer) :');
    for (const c of changes) console.log(`  • ${c}`);
  } else {
    console.log('Aucune synchronisation nécessaire.');
  }
  if (!WRITE && changes.length) process.exitCode = 2;
}

main();
