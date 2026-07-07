#!/usr/bin/env node
/**
 * Smoke agent email — IMAP accessible (.env) + sync API utilisateur.
 * Priorité : Gmail pro (app password) si disponible, sinon boîte OVH.
 * Usage : node scripts/ops/smoke-email-agent-imap-sync.cjs [--ovh-only]
 */

const path = require('node:path');
const { loadRootEnv, requestJson } = require('./load-root-env.cjs');
const { resolveEmailTriageEnv } = require('../mobile/lib/resolve-email-triage-env');
const {
  testImapConnection,
} = require('../../backend/auth-service/src/services/imapMinimalClient');

const rootDir = path.join(__dirname, '../..');
const ovhOnly = process.argv.includes('--ovh-only');

async function loginUserToken(apiBase, email, password) {
  const { status, data } = await requestJson(`${apiBase}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    timeout: 30000,
  });
  if (status !== 200) {
    throw new Error(`Login HTTP ${status}: ${JSON.stringify(data).slice(0, 300)}`);
  }
  const token = data.token || data.data?.token;
  if (!token) throw new Error('JWT introuvable après login');
  return token;
}

function pickImapAccount(triage) {
  if (ovhOnly && triage.ovhImap) return { imap: triage.ovhImap, label: 'OVH (forcé)' };
  if (triage.gmailImap) return { imap: triage.gmailImap, label: 'Gmail pro (accessible)' };
  if (triage.ovhImap) return { imap: triage.ovhImap, label: 'OVH (fallback)' };
  return null;
}

async function main() {
  const env = loadRootEnv(rootDir);
  Object.assign(process.env, env);
  const triage = resolveEmailTriageEnv();
  const picked = pickImapAccount(triage);

  if (!picked) {
    console.error('SKIP: aucune boîte IMAP configurée (Gmail pro ou EMAIL_TRIAGE_READ_*)');
    process.exit(2);
  }

  const { imap, label } = picked;
  console.log(`[1/4] Test IMAP (${label}) ${imap.email} @ ${imap.host}:${imap.port}`);
  await testImapConnection({
    host: imap.host,
    port: imap.port,
    email: imap.email,
    password: imap.password,
    useTls: imap.secure,
  });
  console.log('IMAP OK');

  const port = env.API_GATEWAY_PORT || '5002';
  const apiBase = `http://127.0.0.1:${port}`;
  const userEmail =
    env.TEST_USER_EMAIL || env.TEST_REAL_EMAIL || env.EMAIL_TRIAGE_DIGEST_RECIPIENT;
  const userPassword = env.TEST_USER_PASSWORD || env.TEST_REAL_PASSWORD;
  if (!userEmail || !userPassword) {
    throw new Error('TEST_USER_EMAIL + TEST_USER_PASSWORD requis pour sync API');
  }

  console.log(`[2/4] Login utilisateur ${userEmail}`);
  const token = await loginUserToken(apiBase, userEmail, userPassword);

  console.log('[3/4] POST /api/v1/email-agent/sync');
  const syncRes = await requestJson(`${apiBase}/api/v1/email-agent/sync`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    timeout: 120000,
  });

  if (syncRes.status !== 200 || !syncRes.data.success) {
    throw new Error(`Sync HTTP ${syncRes.status}: ${JSON.stringify(syncRes.data).slice(0, 400)}`);
  }

  console.log('[4/4] Résultat sync:', JSON.stringify(syncRes.data.results, null, 2));
  console.log('SMOKE OK');
}

main().catch((err) => {
  console.error('SMOKE FAIL:', err.message);
  process.exit(1);
});
