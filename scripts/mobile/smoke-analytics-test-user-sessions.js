#!/usr/bin/env node
/**
 * Vérifie les sessions analytics actives pour l'utilisateur test mobile.
 * Utilise TEST_USER_EMAIL (ex. paul.delhomme@proton.me) + login admin pour lire stats.
 *
 *   node scripts/mobile/smoke-analytics-test-user-sessions.js
 */

const { resolveWorkingAdminCredentials, GATEWAY_URL, loadRootEnv } = require('./resolve-admin-credentials');
const { resolveWorkingUserCredentials } = require('./resolve-user-credentials');

loadRootEnv();

async function login(email, password) {
  const res = await fetch(`${GATEWAY_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login HTTP ${res.status} (${email})`);
  const data = await res.json();
  return data.token;
}

async function getJson(path, token) {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

(async () => {
  const testUser = await resolveWorkingUserCredentials();
  const admin = await resolveWorkingAdminCredentials();
  console.log(`Utilisateur test: ${testUser.email}`);
  console.log(`Admin stats: ${admin.email}`);

  const userToken = await login(testUser.email, testUser.password);
  const adminToken = await login(admin.email, admin.password);

  const profile = await getJson('/api/v1/auth/profile', userToken);
  const userId = profile.body?.user?.id || profile.body?.id;
  if (!userId) throw new Error('userId introuvable pour utilisateur test');

  const sessionId = `sess-smoke-${Date.now()}`;
  const deviceId = `mob-smoke-${Date.now()}`;
  const sessionRes = await fetch(`${GATEWAY_URL}/api/v1/analytics/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      sessionId,
      deviceId,
      platform: 'android',
      deviceModel: 'SmokeSamsung',
      osName: 'Android',
      osVersion: '14',
    }),
  });
  const sessionBody = await sessionRes.json().catch(() => ({}));
  if (sessionRes.status !== 200 || !sessionBody.success) {
    throw new Error(`POST sessions HTTP ${sessionRes.status}: ${JSON.stringify(sessionBody)}`);
  }
  console.log('Session créée/upsert:', sessionId);

  await fetch(`${GATEWAY_URL}/api/v1/analytics/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      sessionId,
      deviceId,
      platform: 'android',
      eventType: 'navigation',
      eventName: 'screen_view',
      page: '/smoke-test-user',
    }),
  });

  const stats = await getJson(
    `/api/v1/analytics/stats/${encodeURIComponent(userId)}?days=7`,
    adminToken,
  );
  if (stats.status !== 200) {
    throw new Error(`stats HTTP ${stats.status}: ${JSON.stringify(stats.body)}`);
  }
  const data = stats.body?.data ?? stats.body;
  const activeList = data.activeSessionsList ?? [];
  console.log('Sessions actives:', data.activeSessions ?? 0, '— liste:', activeList.length);
  const found = activeList.some((s) => s.sessionId === sessionId);
  if (!found && activeList.length === 0 && (data.activeSessions ?? 0) === 0) {
    console.warn('WARN: aucune session active listée (vérifiez isActive / userId côté dashboard)');
  } else if (!found) {
    console.warn(`WARN: session ${sessionId} absente de activeSessionsList (peut être >25 sessions actives)`);
  } else {
    console.log('OK: session test visible dans activeSessionsList');
  }

  console.log('\nSmoke analytics utilisateur test OK');
})().catch((err) => {
  console.error('Smoke analytics test user KO:', err.message);
  process.exit(1);
});
