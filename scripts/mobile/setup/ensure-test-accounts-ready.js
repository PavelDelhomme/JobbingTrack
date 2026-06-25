#!/usr/bin/env node
/**
 * Prépare les comptes smoke : emailVerified=true + login API OK.
 *
 *   node scripts/mobile/ensure-test-accounts-ready.js
 */

const { execFileSync } = require('child_process');
const { loadRootEnv, GATEWAY_URL } = require('../lib/resolve-admin-credentials');
const { resolveWorkingUserCredentials } = require('../lib/resolve-user-credentials');
const { resolveWorkingAdminCredentials } = require('../lib/resolve-admin-credentials');

loadRootEnv();

const POSTGRES_CONTAINER = process.env.POSTGRES_CONTAINER || 'jobbingtrack-postgres';

function listSmokeEmails() {
  const emails = new Set();
  for (const key of [
    'TEST_USER_EMAIL',
    'TEST_ADMIN_EMAIL',
    'ADMIN_EMAIL',
    'TEST_REAL_EMAIL',
  ]) {
    const v = process.env[key]?.trim();
    if (v) emails.add(v);
  }
  return [...emails];
}

async function probeLogin(email, password) {
  const res = await fetch(`${GATEWAY_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && Boolean(data.token), status: res.status, data };
}

function sqlQuery(sql) {
  return execFileSync(
    'docker',
    [
      'exec',
      POSTGRES_CONTAINER,
      'psql',
      '-U',
      'jobbingtrack',
      '-d',
      'jobbingtrack',
      '-t',
      '-A',
      '-c',
      sql,
    ],
    { encoding: 'utf8' },
  ).trim();
}

function markEmailVerified(email) {
  const safe = email.replace(/'/g, "''");
  sqlQuery(`
    UPDATE "User"
    SET "emailVerified" = true,
        "emailVerifiedAt" = COALESCE("emailVerifiedAt", NOW()),
        "updatedAt" = NOW()
    WHERE email = '${safe}';
  `);
}

function readEmailVerified(email) {
  const safe = email.replace(/'/g, "''");
  try {
    const out = sqlQuery(
      `SELECT "emailVerified" FROM "User" WHERE email = '${safe}' LIMIT 1;`,
    );
    if (!out) return null;
    return out === 't';
  } catch {
    return null;
  }
}

async function ensureAccount({ label, email, password }) {
  let probe = await probeLogin(email, password);
  if (probe.ok) {
    console.log(`✅ ${label} (${email}) — login API OK`);
    return true;
  }

  const code = probe.data?.code || probe.data?.error || '';
  const needsVerify =
    code === 'EMAIL_NOT_VERIFIED' ||
    String(probe.data?.error || '').includes('vérifier votre email');

  if (needsVerify) {
    console.log(`⚠️  ${label} (${email}) — email non vérifié, correction BDD…`);
    markEmailVerified(email);
    probe = await probeLogin(email, password);
    if (probe.ok) {
      console.log(`✅ ${label} (${email}) — vérifié + login API OK`);
      return true;
    }
  }

  const verified = readEmailVerified(email);
  if (verified === false) {
    markEmailVerified(email);
    probe = await probeLogin(email, password);
    if (probe.ok) {
      console.log(`✅ ${label} (${email}) — emailVerified forcé + login OK`);
      return true;
    }
  }

  throw new Error(
    `${label} (${email}) — login API KO (${probe.status}) ${JSON.stringify(probe.data).slice(0, 160)}`,
  );
}

async function ensureTestAccountsReady() {
  console.log(`\n=== Comptes smoke prêts — ${GATEWAY_URL} ===\n`);
  const user = await resolveWorkingUserCredentials();
  await ensureAccount({
    label: 'TEST_USER',
    email: user.email,
    password: user.password,
  });

  try {
    const admin = await resolveWorkingAdminCredentials();
    await ensureAccount({
      label: 'TEST_ADMIN',
      email: admin.email,
      password: admin.password,
    });
  } catch (e) {
    console.warn(`⚠️  Admin smoke ignoré : ${e.message}`);
  }

  for (const email of listSmokeEmails()) {
    if ([user.email].includes(email)) continue;
    const verified = readEmailVerified(email);
    if (verified === false) {
      markEmailVerified(email);
      console.log(`✅ emailVerified=true — ${email}`);
    }
  }

  console.log('\nComptes smoke prêts.\n');
  return true;
}

if (require.main === module) {
  ensureTestAccountsReady().catch((err) => {
    console.error('ensure-test-accounts-ready KO:', err.message);
    process.exit(1);
  });
}

module.exports = { ensureTestAccountsReady, markEmailVerified, probeLogin };
