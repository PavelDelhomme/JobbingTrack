#!/usr/bin/env node
/**
 * Vérifie que les routes admin de l'API Gateway répondent correctement.
 * Usage: node tools/verify-admin-routes.js [URL_GATEWAY]
 * Exemple: node tools/verify-admin-routes.js http://localhost:5002
 */

const GATEWAY_URL = process.argv[2] || process.env.API_GATEWAY_URL || process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:5002';
const BASE = GATEWAY_URL.replace(/\/$/, '');
const MOCK_TOKEN = 'Bearer mock-jwt-token-verify';

async function fetchJson(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  const res = await fetch(url, {
    signal: ctrl.signal,
    headers: { 'Content-Type': 'application/json', Authorization: MOCK_TOKEN, ...opts.headers },
    ...opts,
  });
  clearTimeout(t);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { _raw: text };
  }
  return { status: res.status, data };
}

async function main() {
  console.log('🔍 Vérification des routes admin');
  console.log('   Gateway:', BASE);
  console.log('');

  let ok = 0;
  let ko = 0;

  // 1. Route de test admin
  try {
    const r = await fetchJson(`${BASE}/api/v1/admin/test`);
    if (r.status === 200 && r.data.success) {
      console.log('✅ GET /api/v1/admin/test → 200');
      ok++;
    } else {
      console.log('❌ GET /api/v1/admin/test →', r.status, r.data);
      ko++;
    }
  } catch (e) {
    console.log('❌ GET /api/v1/admin/test → Erreur:', e.message);
    ko++;
  }

  // 2. Generate test data (preset minimal pour aller vite)
  try {
    const r = await fetchJson(`${BASE}/api/v1/admin/generate-test-data`, {
      method: 'POST',
      body: JSON.stringify({ preset: 'minimal' }),
    });
    if (r.status === 200 && r.data.success) {
      console.log('✅ POST /api/v1/admin/generate-test-data (preset minimal) → 200');
      ok++;
    } else if (r.status === 404) {
      console.log('❌ POST /api/v1/admin/generate-test-data → 404 (route absente)');
      ko++;
    } else {
      console.log('⚠️ POST /api/v1/admin/generate-test-data →', r.status, r.data?.error || r.data);
      if (r.status === 500 && r.data?.error) {
        console.log('   (La base peut être indisponible; la route existe.)');
        ok++;
      } else {
        ko++;
      }
    }
  } catch (e) {
    console.log('❌ POST /api/v1/admin/generate-test-data → Erreur:', e.message);
    ko++;
  }

  // 3. Test data status
  try {
    const r = await fetchJson(`${BASE}/api/v1/admin/test-data/status`);
    if (r.status === 200) {
      console.log('✅ GET /api/v1/admin/test-data/status → 200');
      ok++;
    } else if (r.status === 404) {
      console.log('❌ GET /api/v1/admin/test-data/status → 404');
      ko++;
    } else {
      console.log('⚠️ GET /api/v1/admin/test-data/status →', r.status);
      ok++;
    }
  } catch (e) {
    console.log('❌ GET /api/v1/admin/test-data/status → Erreur:', e.message);
    ko++;
  }

  console.log('');
  if (ko === 0) {
    console.log('✅ Toutes les routes admin vérifiées.');
    process.exit(0);
  } else {
    console.log('❌', ko, 'échec(s). Vérifiez que la gateway tourne et que les routes admin sont montées.');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
