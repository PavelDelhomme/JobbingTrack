#!/usr/bin/env node
/**
 * Purge complète monitoring mobile : erreurs/events/perf (DB) + fichiers crash gateway.
 * Usage : node scripts/ops/purge-mobile-monitoring-data.js [--dry-run]
 */
const { loadRootEnv, GATEWAY_URL } = require('../mobile/lib/resolve-admin-credentials');

loadRootEnv();

const BASE = (process.env.API_GATEWAY_URL || GATEWAY_URL).replace(/\/$/, '');
const dryRun = process.argv.includes('--dry-run');

async function loginAdmin() {
  const email =
    process.env.TEST_ADMIN_EMAIL ||
    process.env.ADMIN_EMAIL ||
    'admin@jobbingtrack.test';
  const password =
    process.env.TEST_ADMIN_PASSWORD ||
    process.env.ADMIN_PASSWORD ||
    'password123';
  const res = await fetch(`${BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login admin HTTP ${res.status}`);
  const data = await res.json();
  const token = data.token || data.accessToken;
  if (!token) throw new Error('Token admin absent');
  return token;
}

async function countOpenErrors(token) {
  const res = await fetch(
    `${BASE}/api/v1/analytics/errors?scope=application&platform=mobile&resolved=false&days=30&limit=1`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json.pagination?.total ?? (json.data || []).length;
}

async function countCrashes() {
  const res = await fetch(`${BASE}/api/v1/crashes?limit=500`);
  if (!res.ok) return null;
  const json = await res.json();
  return (json.data || []).length;
}

async function purgeDb(token) {
  const res = await fetch(`${BASE}/api/v1/analytics/mobile-monitoring/purge`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Purge DB HTTP ${res.status}: ${JSON.stringify(json)}`);
  }
  return json.data || {};
}

async function purgeCrashes(token) {
  const res = await fetch(`${BASE}/api/v1/crashes`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Purge crashes HTTP ${res.status}: ${JSON.stringify(json)}`);
  }
  return json.data || {};
}

async function main() {
  console.log(`Gateway: ${BASE}`);
  const token = await loginAdmin();
  const beforeErrors = await countOpenErrors(token);
  const beforeCrashes = await countCrashes();
  console.log(`Avant purge — erreurs ouvertes (30 j): ${beforeErrors ?? '?'} · fichiers crash: ${beforeCrashes ?? '?'}`);

  if (dryRun) {
    console.log('DRY RUN — aucune suppression effectuée');
    return;
  }

  const db = await purgeDb(token);
  const files = await purgeCrashes(token);
  const afterErrors = await countOpenErrors(token);
  const afterCrashes = await countCrashes();

  console.log('Purge DB:', db);
  console.log('Purge fichiers crash:', files);
  console.log(`Après purge — erreurs ouvertes: ${afterErrors ?? '?'} · fichiers crash: ${afterCrashes ?? '?'}`);
  console.log('OK purge-mobile-monitoring-data');
}

main().catch((e) => {
  console.error('KO purge-mobile-monitoring-data:', e.message);
  process.exit(1);
});
