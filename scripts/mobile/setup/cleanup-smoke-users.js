#!/usr/bin/env node
/**
 * Audit + nettoyage utilisateurs smoke (via API clean-test-users).
 *
 *   node scripts/mobile/setup/cleanup-smoke-users.js --dry-run
 *   node scripts/mobile/setup/cleanup-smoke-users.js --confirm
 */

const path = require('path');
const ROOT = path.join(__dirname, '../../..');
const { loadRootEnv, requestJson, loginAdminToken } = require(
  path.join(ROOT, 'scripts/ops/load-root-env.cjs'),
);

loadRootEnv(ROOT);

function keepEmails(env) {
  const emails = new Set();
  for (const key of [
    'ADMIN_EMAIL',
    'TEST_ADMIN_EMAIL',
    'TEST_USER_EMAIL',
    'PROTECTED_USER_EMAILS',
  ]) {
    const raw = env[key];
    if (!raw) continue;
    if (key === 'PROTECTED_USER_EMAILS') {
      raw.split(',').forEach((e) => {
        const t = e.trim().toLowerCase();
        if (t) emails.add(t);
      });
    } else {
      emails.add(raw.trim().toLowerCase());
    }
  }
  return [...emails];
}

async function listUsers(token, apiBase) {
  const res = await requestJson(`${apiBase}/api/v1/auth/users?limit=500`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status !== 200 || !res.data?.users) {
    throw new Error(`Liste users HTTP ${res.status}`);
  }
  return res.data.users;
}

function isSmokeCandidate(u) {
  const email = (u.email || '').toLowerCase();
  if (u.isTestData) return true;
  if (email.endsWith('@jobbingtrack.test')) return true;
  if (email.endsWith('@mailhog.local')) return true;
  if (email.endsWith('@example.com')) return true;
  if (email.endsWith('@test.com')) return true;
  if (/^test\+mob/i.test(email)) return true;
  if (/^test\+e2e/i.test(email)) return true;
  if (/^test\+api/i.test(email)) return true;
  if (/^e2e-/i.test(email)) return true;
  if (/^mob-/i.test(email)) return true;
  if (/^verify-/i.test(email)) return true;
  if (email.includes('+mob') && email.includes('@delhomme.ovh')) return true;
  if ((u.firstName === 'Porteur' || u.firstName === 'Porteur2') && u.lastName === 'Auto') {
    return true;
  }
  if (email === 'candidatures@delhomme.ovh') return true;
  return false;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const confirm = process.argv.includes('--confirm');
  if (!dryRun && !confirm) {
    console.error('Ajoutez --dry-run ou --confirm');
    process.exit(1);
  }

  const env = loadRootEnv(ROOT);
  const keep = new Set(keepEmails(env));
  console.log('Comptes conservés (env):', [...keep].join(', ') || '(aucun explicite)');

  const { token, apiBase } = await loginAdminToken(ROOT);
  const before = await listUsers(token, apiBase);
  const toRemove = before.filter((u) => {
    const email = (u.email || '').toLowerCase();
    if (keep.has(email)) return false;
    return isSmokeCandidate(u);
  });

  console.log(`\nUtilisateurs total: ${before.length}`);
  console.log(`Candidats suppression smoke: ${toRemove.length}`);
  for (const u of toRemove.slice(0, 20)) {
    console.log(`  - ${u.email} (${u.role}, actif=${u.isActive})`);
  }
  if (toRemove.length > 20) console.log(`  … +${toRemove.length - 20} autres`);

  const afterKeep = before.filter((u) => !toRemove.some((r) => r.id === u.id));
  console.log(`\nAprès nettoyage attendu: ${afterKeep.length} compte(s)`);
  for (const u of afterKeep) {
    console.log(`  ✓ ${u.email} (${u.role})`);
  }

  if (dryRun) {
    console.log('\nDry-run — aucune suppression.');
    return;
  }

  const clean = await requestJson(`${apiBase}/api/v1/auth/users/clean-test-users`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (clean.status !== 200 || !clean.data?.success) {
    throw new Error(`clean-test-users échoué: ${JSON.stringify(clean.data)}`);
  }
  console.log(`\n✅ ${clean.data.deletedCount ?? clean.data.message}`);

  const after = await listUsers(token, apiBase);
  console.log(`Utilisateurs restants: ${after.length}`);
  for (const u of after) {
    console.log(`  • ${u.email} (${u.role}, actif=${u.isActive})`);
  }
}

main().catch((e) => {
  console.error('KO cleanup-smoke-users:', e.message);
  process.exit(1);
});
