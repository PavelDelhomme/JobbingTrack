#!/usr/bin/env node
/**
 * Smoke API analytics utilisateur (stats/events/errors) — fenêtre days=7 cohérente.
 *
 *   node scripts/mobile/smoke-analytics-api.js
 */

const {
  resolveWorkingAdminCredentials,
  GATEWAY_URL,
} = require('./resolve-admin-credentials');

async function loginAdmin(email, password) {
  const res = await fetch(`${GATEWAY_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`Login admin HTTP ${res.status}`);
  }
  const data = await res.json();
  const token = data.token || data.accessToken;
  if (!token) throw new Error('Token admin absent');
  return token;
}

async function getJson(path, token) {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return { status: res.status, body };
}

(async () => {
  const admin = await resolveWorkingAdminCredentials();
  console.log(`Admin: ${admin.source} (${admin.email})`);
  const token = await loginAdmin(admin.email, admin.password);

  const stats = await getJson('/api/v1/analytics/stats?days=7', token);
  if (stats.status !== 200) {
    throw new Error(`stats HTTP ${stats.status}: ${JSON.stringify(stats.body)}`);
  }
  const s = stats.body?.data ?? stats.body;
  console.log('Stats 7j:', {
    totalEvents: s.totalEvents,
    totalSessions: s.totalSessions,
    topPagesCount: (s.topPages ?? []).length,
    topActionsCount: (s.topActions ?? []).length,
    eventsByTypeCount: (s.eventsByType ?? []).length,
  });

  if (!Array.isArray(s.topPages)) {
    throw new Error('topPages doit être un tableau');
  }
  for (const row of s.topPages.slice(0, 3)) {
    if (typeof row.count !== 'number' || row.count < 0) {
      throw new Error(`topPages count invalide: ${JSON.stringify(row)}`);
    }
  }

  const events = await getJson('/api/v1/analytics/events?days=7&limit=5', token);
  if (events.status !== 200) {
    throw new Error(`events HTTP ${events.status}`);
  }
  const evList = events.body?.data ?? events.body?.events ?? events.body;
  const evCount = Array.isArray(evList) ? evList.length : 0;
  console.log(`Events 7j (limit 5): ${evCount} lignes`);

  const adminUserId = stats.body?.data?.userId || stats.body?.userId;
  const profile = await getJson('/api/v1/auth/profile', token);
  const profileId = profile.body?.user?.id || profile.body?.id;
  if (profileId) {
    const scopedEvents = await getJson(
      `/api/v1/analytics/events?days=7&limit=5&userId=${encodeURIComponent(profileId)}`,
      token,
    );
    if (scopedEvents.status !== 200) {
      throw new Error(`events scoped HTTP ${scopedEvents.status}`);
    }
    const scopedList = scopedEvents.body?.data ?? [];
    console.log(`Events scoped userId (${profileId}): ${scopedList.length} lignes`);
  }

  const errors = await getJson('/api/v1/analytics/errors?days=7&limit=5', token);
  if (errors.status !== 200) {
    throw new Error(`errors HTTP ${errors.status}`);
  }
  console.log('Errors 7j: HTTP', errors.status);

  const duplicateSessionId = `sess-smoke-dup-${Date.now()}`;
  const sessionPayload = {
    sessionId: duplicateSessionId,
    deviceId: `mob-smoke-${Date.now()}`,
    platform: 'android',
    deviceModel: 'SmokeTest',
    osName: 'Android',
    osVersion: '14',
  };
  for (let i = 0; i < 2; i += 1) {
    const res = await fetch(`${GATEWAY_URL}/api/v1/analytics/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(sessionPayload),
    });
    const body = await res.json().catch(() => ({}));
    if (res.status !== 200 || !body.success) {
      throw new Error(`sessions duplicate test HTTP ${res.status}: ${JSON.stringify(body)}`);
    }
  }
  const healthAfterDup = await fetch(`${GATEWAY_URL}/api/v1/health`);
  if (healthAfterDup.status !== 200) {
    throw new Error(`gateway unhealthy after duplicate session POST (${healthAfterDup.status})`);
  }
  console.log('Duplicate sessionId upsert OK (service stable)');

  const staleSessionId = `sess-smoke-stale-${Date.now()}`;
  const errorPost = await fetch(`${GATEWAY_URL}/api/v1/analytics/errors`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      sessionId: staleSessionId,
      deviceId: `mob-smoke-${Date.now()}`,
      errorType: 'smoke',
      errorName: 'SmokeAnalyticsError',
      errorMessage: 'POST errors with unknown sessionId must upsert session first',
      page: '/smoke',
      platform: 'android',
      severity: 'warning',
    }),
  });
  const errorPostBody = await errorPost.json().catch(() => ({}));
  if (errorPost.status !== 200 || !errorPostBody.success) {
    throw new Error(
      `POST analytics/errors stale session HTTP ${errorPost.status}: ${JSON.stringify(errorPostBody)}`,
    );
  }
  console.log('POST analytics/errors with stale sessionId OK');

  console.log('\nSmoke analytics API OK');
})().catch((err) => {
  console.error('Smoke analytics API KO:', err.message);
  process.exit(1);
});
