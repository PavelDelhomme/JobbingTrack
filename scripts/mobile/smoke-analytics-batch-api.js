#!/usr/bin/env node
/**
 * Smoke batch analytics + stats cohérentes.
 *   node scripts/mobile/smoke-analytics-api.js  (inclus stats)
 *   node scripts/mobile/smoke-analytics-batch-api.js
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
  if (!res.ok) throw new Error(`Login admin HTTP ${res.status}`);
  const data = await res.json();
  return data.token || data.accessToken;
}

(async () => {
  const admin = await resolveWorkingAdminCredentials();
  const token = await loginAdmin(admin.email, admin.password);

  const batchBody = {
    events: [
      {
        sessionId: `smoke-batch-${Date.now()}`,
        eventType: 'navigation',
        eventName: 'screen_view',
        page: '/home',
        platform: 'android',
      },
      {
        sessionId: `smoke-batch-${Date.now()}`,
        eventType: 'navigation',
        eventName: 'screen_view',
        page: '/applications',
        platform: 'android',
      },
    ],
  };

  const batch = await fetch(`${GATEWAY_URL}/api/v1/analytics/events/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(batchBody),
  });
  const batchJson = await batch.json();
  if (batch.status !== 200 || !batchJson.success) {
    throw new Error(`batch HTTP ${batch.status}: ${JSON.stringify(batchJson)}`);
  }
  console.log('Batch events OK:', batchJson.data?.count ?? batchJson.data);

  console.log('\nSmoke analytics batch API OK');
})().catch((err) => {
  console.error('Smoke analytics batch KO:', err.message);
  process.exit(1);
});
