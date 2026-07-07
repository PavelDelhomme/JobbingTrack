#!/usr/bin/env node
/**
 * Vérification connexion IMAP (Gmail pro ou OVH candidatures).
 * Point d'entrée documenté — délègue à resolve-email-triage-env + imapMinimalClient.
 *
 * Usage:
 *   node scripts/mobile/fetch-imap-verification.js --check-only
 *   node scripts/mobile/fetch-imap-verification.js --check-only --ovh-only
 *   node scripts/mobile/fetch-imap-verification.js --check-only --gmail-only
 */

const { resolveEmailTriageEnv } = require('./lib/resolve-email-triage-env');
const {
  testImapConnection,
} = require('../../backend/auth-service/src/services/imapMinimalClient');

function parseFlags(argv) {
  return {
    checkOnly: argv.includes('--check-only') || argv.length <= 2,
    ovhOnly: argv.includes('--ovh-only'),
    gmailOnly: argv.includes('--gmail-only'),
  };
}

function maskEmail(email) {
  const [local, domain] = String(email || '').split('@');
  if (!domain) return email;
  const head = local.slice(0, 2);
  return `${head}***@${domain}`;
}

async function probe(label, imap) {
  if (!imap) {
    console.log(`${label}: SKIP (variables absentes ou placeholder)`);
    return { label, ok: false, skipped: true };
  }
  console.log(
    `${label}: connexion ${maskEmail(imap.email)} @ ${imap.host}:${imap.port} (AUTH PLAIN)…`,
  );
  try {
    await testImapConnection({
      host: imap.host,
      port: imap.port,
      email: imap.email,
      password: imap.password,
      useTls: imap.secure,
    });
    console.log(`${label}: OK`);
    return { label, ok: true, email: imap.email, host: imap.host };
  } catch (err) {
    console.error(`${label}: FAIL — ${err.message}`);
    return { label, ok: false, error: err.message, email: imap.email, host: imap.host };
  }
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  if (!flags.checkOnly) {
    console.error('Seul --check-only est supporté pour l’instant.');
    process.exit(2);
  }

  const triage = resolveEmailTriageEnv();
  const probes = [];

  if (!flags.gmailOnly && triage.ovhImap) {
    probes.push(await probe('OVH', triage.ovhImap));
  } else if (!flags.gmailOnly && flags.ovhOnly) {
    probes.push(await probe('OVH', null));
  }

  if (!flags.ovhOnly && triage.gmailImap) {
    probes.push(await probe('Gmail pro', triage.gmailImap));
  } else if (flags.gmailOnly && !triage.gmailImap) {
    probes.push(await probe('Gmail pro', null));
  }

  if (!probes.length) {
    console.error(
      'Aucune boîte IMAP configurée — voir EMAIL_TRIAGE_READ_* / EMAIL_GMAIL_PRO_PASSWORD_APPLICATION',
    );
    process.exit(2);
  }

  const failed = probes.filter((p) => !p.skipped && !p.ok);
  if (failed.length) process.exit(1);
  if (probes.every((p) => p.skipped)) process.exit(2);
  console.log('IMAP check OK');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
