#!/usr/bin/env node
/**
 * Smoke GET /api/v1/auth/users — pagination + recherche serveur.
 *
 *   node scripts/mobile/smoke/api/smoke-auth-users-search-api.js
 */

const {
  resolveWorkingAdminCredentials,
  GATEWAY_URL,
} = require('../../lib/resolve-admin-credentials');

async function loginAdmin(email, password) {
  const res = await fetch(`${GATEWAY_URL}/api/v1/auth/login`, {
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

async function getJson(path, token) {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

(async () => {
  const admin = await resolveWorkingAdminCredentials();
  console.log(`Admin: ${admin.source} (${admin.email})`);
  const token = await loginAdmin(admin.email, admin.password);

  const page1 = await getJson('/api/v1/auth/users?limit=5&offset=0', token);
  if (page1.status !== 200) {
    throw new Error(`users HTTP ${page1.status}: ${JSON.stringify(page1.body)}`);
  }
  const total = page1.body?.pagination?.total ?? page1.body?.total;
  const count = (page1.body?.users ?? []).length;
  console.log(`Page 1: ${count} lignes, total=${total}`);

  if (typeof total !== 'number') {
    throw new Error('pagination.total manquant');
  }

  const search = await getJson(
    `/api/v1/auth/users?limit=10&search=${encodeURIComponent(admin.email.split('@')[0])}`,
    token,
  );
  if (search.status !== 200) {
    throw new Error(`search HTTP ${search.status}`);
  }
  const searchCount = (search.body?.users ?? []).length;
  console.log(`Recherche "${admin.email.split('@')[0]}": ${searchCount} ligne(s)`);

  console.log('\nSmoke auth users search OK');
})().catch((e) => {
  console.error('Smoke auth users search KO:', e.message);
  process.exit(1);
});
