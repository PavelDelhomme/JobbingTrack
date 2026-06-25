#!/usr/bin/env node
/**
 * Smoke API agent email (mobile + web) — login TEST_USER, statut, triage, discover.
 * Usage: node scripts/mobile/smoke/api/smoke-email-agent-api.js
 * @used-by docs/mobile/EMULATEUR_ADB.md, validation agent email manuelle
 */

const { loadRootEnv } = require('../../lib/resolve-admin-credentials');
const { GATEWAY_URL } = require('../../lib/resolve-admin-credentials');

loadRootEnv();

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(options.timeout || 60000),
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    /* ignore */
  }
  return { status: res.status, data };
}

async function main() {
  const email = process.env.TEST_USER_EMAIL || process.env.TEST_REAL_EMAIL;
  const password = process.env.TEST_USER_PASSWORD || process.env.TEST_REAL_PASSWORD;
  if (!email || !password) throw new Error('TEST_USER_EMAIL/PASSWORD manquants');

  console.log('[1/5] Login', email);
  const login = await request(`${GATEWAY_URL}/api/v1/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (login.status !== 200) {
    throw new Error(`Login HTTP ${login.status}`);
  }
  const token = login.data.token || login.data.data?.token;
  if (!token) throw new Error('JWT manquant');

  const auth = { Authorization: `Bearer ${token}` };

  console.log('[2/5] GET /email-agent/status');
  const status = await request(`${GATEWAY_URL}/api/v1/email-agent/status`, { headers: auth });
  if (status.status !== 200) throw new Error(`status HTTP ${status.status}`);
  console.log('  agentEnabled:', status.data.agentEnabled);
  console.log('  mailboxes:', (status.data.mailboxes || []).length);
  console.log('  pendingTriage:', status.data.pendingTriageCount);

  console.log('[3/5] GET discover OVH');
  const readAccount = process.env.EMAIL_TRIAGE_READ_ACCOUNT || 'candidatures@delhomme.ovh';
  const discover = await request(
    `${GATEWAY_URL}/api/v1/email-agent/mailboxes/imap/discover?email=${encodeURIComponent(readAccount)}`,
    { headers: auth },
  );
  if (discover.status !== 200) throw new Error(`discover HTTP ${discover.status}`);
  console.log('  suggested:', discover.data.suggested?.imapHost);

  console.log('[4/5] GET triage PENDING');
  const triage = await request(`${GATEWAY_URL}/api/v1/email-agent/triage?status=PENDING`, {
    headers: auth,
  });
  if (triage.status !== 200) throw new Error(`triage HTTP ${triage.status}`);
  const count = (triage.data.messages || []).length;
  console.log('  messages:', count);

  console.log('[5/5] POST sync');
  const sync = await request(`${GATEWAY_URL}/api/v1/email-agent/sync`, {
    method: 'POST',
    headers: auth,
    timeout: 120000,
  });
  if (sync.status !== 200) throw new Error(`sync HTTP ${sync.status}`);
  console.log('  results:', JSON.stringify(sync.data.results));

  if (!status.data.agentEnabled) {
    console.warn('WARN: agent non activé — lancer bootstrap-admin-email-agent.cjs');
  }
  if ((status.data.mailboxes || []).length === 0) {
    console.warn('WARN: aucune boîte — lancer bootstrap-admin-email-agent.cjs');
  }

  console.log('SMOKE EMAIL AGENT API OK');
}

main().catch((err) => {
  console.error('SMOKE FAIL:', err.message);
  process.exit(1);
});
