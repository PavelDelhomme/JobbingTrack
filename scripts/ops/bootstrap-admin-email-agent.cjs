#!/usr/bin/env node
/**
 * Bootstrap agent email pour le compte porteur (admin / TEST_USER).
 * - Active jobSearchAgentEnabled (admin)
 * - Consentements agent
 * - Connecte candidatures@delhomme.ovh (IMAP OVH depuis .env)
 * - Sync + statut
 *
 * Usage: node scripts/ops/bootstrap-admin-email-agent.cjs
 */

const path = require('node:path');
const { loadRootEnv, requestJson, loginAdminToken } = require('./load-root-env.cjs');
const { resolveEmailTriageEnv } = require('../mobile/resolve-email-triage-env');

const rootDir = path.join(__dirname, '../..');

const CONSENT_TYPES = [
  'MAILBOX_ACCESS',
  'CONTENT_CLASSIFICATION',
  'DIGEST_NOTIFICATIONS',
  'GOOGLE_CALENDAR',
  'GOOGLE_TASKS',
];

async function loginUser(apiBase, email, password) {
  const { status, data } = await requestJson(`${apiBase}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    timeout: 30000,
  });
  if (status !== 200) {
    throw new Error(`Login ${email} HTTP ${status}: ${JSON.stringify(data).slice(0, 300)}`);
  }
  const token = data.token || data.data?.token;
  const user = data.user || data.data?.user;
  if (!token) throw new Error(`JWT manquant pour ${email}`);
  return { token, user };
}

async function api(token, apiBase, method, route, body) {
  const { status, data } = await requestJson(`${apiBase}${route}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    timeout: 120000,
  });
  return { status, data };
}

async function main() {
  const env = loadRootEnv(rootDir);
  Object.assign(process.env, env);
  const triage = resolveEmailTriageEnv();
  const ovh = triage.ovhImap;
  if (!ovh) {
    throw new Error('EMAIL_TRIAGE_READ_ACCOUNT/PASSWORD manquants dans .env');
  }

  const apiBase = `http://127.0.0.1:${env.API_GATEWAY_PORT || '5002'}`;
  const userEmail = env.TEST_USER_EMAIL || env.TEST_REAL_EMAIL || 'paul.delhomme@proton.me';
  const userPassword = env.TEST_USER_PASSWORD || env.TEST_REAL_PASSWORD;
  if (!userPassword) throw new Error('TEST_USER_PASSWORD manquant');

  console.log(`[1/7] Login utilisateur ${userEmail}`);
  let { token: userToken, user } = await loginUser(apiBase, userEmail, userPassword);
  const userId = user?.id;
  if (!userId) throw new Error('userId introuvable après login');

  console.log('[2/7] Activation agent recherche (admin)');
  const admin = await loginAdminToken(rootDir);
  const enableRes = await api(
    admin.token,
    admin.apiBase,
    'PUT',
    `/api/v1/email-agent/users/${userId}/agent-enabled`,
    { enabled: true },
  );
  if (enableRes.status !== 200) {
    throw new Error(`agent-enabled HTTP ${enableRes.status}: ${JSON.stringify(enableRes.data).slice(0, 300)}`);
  }
  console.log('  → jobSearchAgentEnabled:', enableRes.data.user?.jobSearchAgentEnabled);

  console.log('[3/7] Consentements agent');
  const consentsRes = await api(userToken, apiBase, 'PUT', '/api/v1/email-agent/consents', {
    consents: CONSENT_TYPES.map((consentType) => ({ consentType, granted: true })),
  });
  if (consentsRes.status !== 200) {
    throw new Error(`consents HTTP ${consentsRes.status}`);
  }

  console.log(`[4/7] Connexion IMAP ${ovh.email} @ ${ovh.host}`);
  const imapRes = await api(userToken, apiBase, 'POST', '/api/v1/email-agent/mailboxes/imap', {
    emailAddress: ovh.email,
    password: ovh.password,
    imapHost: ovh.host,
    imapPort: ovh.port,
    imapUseTls: ovh.secure,
    displayName: 'Candidatures OVH',
  });
  if (imapRes.status !== 201 && imapRes.status !== 200) {
    throw new Error(`connect IMAP HTTP ${imapRes.status}: ${JSON.stringify(imapRes.data).slice(0, 400)}`);
  }
  console.log('  → mailbox:', imapRes.data.mailbox?.id, imapRes.data.mailbox?.emailAddress);

  console.log('[5/7] Sync boîtes');
  const syncRes = await api(userToken, apiBase, 'POST', '/api/v1/email-agent/sync');
  if (syncRes.status !== 200) {
    throw new Error(`sync HTTP ${syncRes.status}`);
  }
  console.log('  → results:', JSON.stringify(syncRes.data.results));

  console.log('[6/7] Statut agent');
  const statusRes = await api(userToken, apiBase, 'GET', '/api/v1/email-agent/status');
  console.log('  → agentEnabled:', statusRes.data.agentEnabled);
  console.log('  → mailboxes:', (statusRes.data.mailboxes || []).length);
  console.log('  → pendingTriage:', statusRes.data.pendingTriageCount);

  console.log('[7/7] Découverte IMAP auto (vérif API)');
  const discoverRes = await api(
    userToken,
    apiBase,
    'GET',
    `/api/v1/email-agent/mailboxes/imap/discover?email=${encodeURIComponent(ovh.email)}`,
  );
  console.log('  → suggested:', discoverRes.data.suggested?.imapHost);

  console.log('\nBOOTSTRAP OK — compte porteur prêt sur /agent');
  console.log(`Digest SMTP cible (.env) : ${env.EMAIL_TRIAGE_DIGEST_RECIPIENT || env.EMAIL_GMAIL_PRO_ACCOUNT || 'non défini'}`);
}

main().catch((err) => {
  console.error('BOOTSTRAP FAIL:', err.message);
  process.exit(1);
});
