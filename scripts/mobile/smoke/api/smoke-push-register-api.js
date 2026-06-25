#!/usr/bin/env node
/**
 * Smoke enregistrement token push via gateway :
 * POST /api/v1/notifications/push/register (token dev)
 *
 *   node scripts/mobile/smoke/api/smoke-push-register-api.js
 */

const { resolveWorkingUserCredentials, GATEWAY_URL } = require('../../lib/resolve-user-credentials');

async function loginApi(email, password) {
  const res = await fetch(`${GATEWAY_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login HTTP ${res.status}`);
  const data = await res.json();
  if (!data.token) throw new Error('Token absent');
  return data.token;
}

(async () => {
  const user = await resolveWorkingUserCredentials();
  const token = await loginApi(user.email, user.password);
  const deviceId = `smoke-push-${Date.now()}`;
  const pushToken = `dev-push-${deviceId}`;

  const res = await fetch(`${GATEWAY_URL}/api/v1/notifications/push/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      token: pushToken,
      platform: 'android',
      provider: 'dev',
      deviceId,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (res.status !== 201 || !body.success) {
    throw new Error(`push/register HTTP ${res.status}: ${JSON.stringify(body)}`);
  }
  console.log('Push register OK:', body.data?.device?.token?.slice(0, 32));
  console.log('\nSmoke push register API OK');
})().catch((err) => {
  console.error('Smoke push register API KO:', err.message);
  process.exit(1);
});
