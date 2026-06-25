#!/usr/bin/env node
/**
 * Remet les 3 emails seed agent en PENDING pour retests mobile/web.
 *   node scripts/ops/reset-email-agent-triage-seed.cjs
 */

const { execSync } = require('node:child_process');
const path = require('node:path');
const { loadRootEnv, requestJson } = require('./load-root-env.cjs');

const SEED_IDS = ['smoke-triage-1', 'smoke-triage-2', 'smoke-triage-3'];

async function loginUser(apiBase, email, password) {
  const { status, data } = await requestJson(`${apiBase}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    timeout: 30000,
  });
  if (status !== 200) {
    throw new Error(`Login HTTP ${status}: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return data.token || data.data?.token;
}

async function main() {
  const rootDir = path.join(__dirname, '../..');
  const env = loadRootEnv(rootDir);
  const apiBase = `http://127.0.0.1:${env.API_GATEWAY_PORT || '5002'}`;
  const email = env.TEST_USER_EMAIL;
  const password = env.TEST_USER_PASSWORD;
  if (!email || !password) throw new Error('TEST_USER_EMAIL / TEST_USER_PASSWORD requis');

  console.log('[1/2] Vérification agent');
  const token = await loginUser(apiBase, email, password);
  const statusRes = await requestJson(`${apiBase}/api/v1/email-agent/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (statusRes.status !== 200) {
    throw new Error(`status HTTP ${statusRes.status}`);
  }
  const pendingBefore = statusRes.data.pendingTriageCount ?? 0;
  console.log(`  → pending avant reset: ${pendingBefore}`);

  console.log('[2/2] Reset SQL → PENDING');
  const ids = SEED_IDS.map((id) => `'${id}'`).join(', ');
  const sql = `
UPDATE email_triage_messages
SET "reviewStatus" = 'PENDING',
    "applicationId" = NULL,
    "companyId" = NULL,
    "contactId" = NULL,
    "updatedAt" = NOW()
WHERE id IN (${ids});
SELECT id, subject, "reviewStatus" FROM email_triage_messages WHERE id IN (${ids}) ORDER BY id;
`;

  const out = execSync(
    `docker exec -i jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -v ON_ERROR_STOP=1`,
    { input: sql, encoding: 'utf8' },
  );
  console.log(out.trim());

  const afterRes = await requestJson(`${apiBase}/api/v1/email-agent/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`  → pending après reset: ${afterRes.data.pendingTriageCount ?? '?'}`);
  console.log('RESET TRIAGE SEED OK — relancez Agent email sur mobile (pull ou ↻)');
}

main().catch((err) => {
  console.error('RESET FAIL:', err.message);
  process.exit(1);
});
