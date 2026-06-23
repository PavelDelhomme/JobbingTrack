#!/usr/bin/env node
/**
 * Smoke agent email — connexion IMAP OVH (.env) + sync API utilisateur.
 * Usage : node scripts/ops/smoke-email-agent-imap-sync.cjs
 * Requiert stack locale (API gateway) + EMAIL_TRIAGE_READ_* ou TEST_EMAIL_TRIAGE_IMAP_*.
 */

const path = require('node:path');
const { loadRootEnv, requestJson } = require('./load-root-env.cjs');
const { resolveEmailTriageEnv } = require('../mobile/resolve-email-triage-env');
const {
  testImapConnection,
} = require('../../backend/auth-service/src/services/imapMinimalClient');

const rootDir = path.join(__dirname, '../..');

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

async function main() {
  const env = loadRootEnv(rootDir);
  Object.assign(process.env, env);
  const triage = resolveEmailTriageEnv();
  const imap = triage.ovhImap;

  if (!imap) {
    console.error('SKIP: EMAIL_TRIAGE_READ_ACCOUNT/PASSWORD ou TEST_EMAIL_TRIAGE_IMAP_* manquants');
    process.exit(2);
  }

  console.log(`[1/4] Test IMAP ${imap.email} @ ${imap.host}:${imap.port}`);
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
