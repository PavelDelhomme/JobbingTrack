#!/usr/bin/env node
/**
 * Vérifie que GET /notifications?scope=in_app exclut crash/erreurs/système.
 * Usage : node scripts/mobile/smoke-notifications-in-app-scope-api.js
 */
const { resolveWorkingUserCredentials, GATEWAY_URL } = require('./resolve-user-credentials');
const { loadRootEnv } = require('./resolve-admin-credentials');

loadRootEnv();

const EXCLUDED = new Set(['CRASH_REPORT', 'ERROR_REPORT', 'SYSTEM']);
const ALLOWED = new Set([
  'REMINDER',
  'APPLICATION_UPDATE',
  'INTERVIEW_SCHEDULED',
  'FOLLOWUP_DUE',
  'DEADLINE',
  'STATUS_CHANGE',
]);

async function api(method, path, body, token) {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data };
}

async function main() {
  console.log(`\n=== Smoke notifications scope=in_app — ${GATEWAY_URL} ===\n`);
  const creds = await resolveWorkingUserCredentials();
  const login = await api('POST', '/api/v1/auth/login', { email: creds.email, password: creds.password }, null);
  if (login.status !== 200 || !login.data.token) {
    console.error(`❌ Login KO ${login.status}`);
    process.exit(1);
  }
  const token = login.data.token;
  console.log(`✅ Login ${creds.email}`);

  const inApp = await api('GET', '/api/v1/notifications?limit=100&scope=in_app', null, token);
  if (inApp.status !== 200) {
    console.error(`❌ GET in_app KO ${inApp.status}`);
    process.exit(1);
  }
  const list = inApp.data.notifications || [];
  const bad = list.filter((n) => EXCLUDED.has(String(n.type || '').toUpperCase()));
  if (bad.length > 0) {
    console.error(`❌ Types exclus présents dans in_app: ${bad.map((n) => n.type).join(', ')}`);
    process.exit(1);
  }
  const unknown = list.filter((n) => !ALLOWED.has(String(n.type || '').toUpperCase()));
  if (unknown.length > 0) {
    console.error(`❌ Types inattendus dans in_app: ${unknown.map((n) => n.type).join(', ')}`);
    process.exit(1);
  }
  console.log(`✅ scope=in_app — ${list.length} notif(s), aucun crash/erreur/système`);

  const stats = await api('GET', '/api/v1/notifications/stats?scope=in_app', null, token);
  if (stats.status !== 200) {
    console.error(`❌ Stats in_app KO ${stats.status}`);
    process.exit(1);
  }
  console.log(
    `✅ stats in_app — total=${stats.data.stats?.notifications?.total ?? '?'} unread=${stats.data.stats?.notifications?.unread ?? '?'}`,
  );

  const all = await api('GET', '/api/v1/notifications?limit=100&scope=all', null, token);
  if (all.status !== 200) {
    console.error(`❌ GET scope=all KO ${all.status}`);
    process.exit(1);
  }
  const allList = all.data.notifications || [];
  const crashCount = allList.filter((n) => String(n.type).toUpperCase() === 'CRASH_REPORT').length;
  console.log(`✅ scope=all — ${allList.length} notif(s) dont ${crashCount} CRASH_REPORT (hors cloche)`);

  console.log('\nSmoke notifications scope=in_app OK\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
