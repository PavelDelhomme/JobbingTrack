#!/usr/bin/env node
/**
 * Vérifie le jeu seedé entremêlé — assertions génériques depuis interleaved-scenarios.js.
 *
 * Prérequis : seed-realistic-user-data-api.js exécuté avant.
 * Usage : node scripts/mobile/smoke/api/smoke-interleaved-entities-api.js
 */

const { resolveWorkingUserCredentials, GATEWAY_URL } = require('../../lib/resolve-user-credentials');
const { loadRootEnv } = require('../../lib/resolve-admin-credentials');
const {
  INTERLEAVED_SCENARIOS,
  verifyScenario,
  verifyGlobalExpect,
} = require('../../lib/interleaved-scenarios');

loadRootEnv();

const results = [];
let token = null;

function pass(name, detail = '') {
  results.push({ name, ok: true, detail });
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  results.push({ name, ok: false, detail });
  console.error(`❌ ${name}${detail ? ` — ${detail}` : ''}`);
}

async function api(method, path, body) {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  let data = {};
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text?.slice(0, 200) };
  }
  return { status: res.status, data };
}

async function main() {
  console.log(`\n=== Smoke entités entremêlées — ${GATEWAY_URL} ===`);
  console.log(`Scénarios déclarés : ${INTERLEAVED_SCENARIOS.length}\n`);

  const creds = await resolveWorkingUserCredentials();
  const login = await api('POST', '/api/v1/auth/login', {
    email: creds.email,
    password: creds.password,
  });
  if (login.status !== 200 || !login.data.token) {
    fail('Login TEST_USER', `${login.status}`);
    return summary();
  }
  token = login.data.token;
  pass('Login TEST_USER', creds.email);

  const appsRes = await api('GET', '/api/v1/applications?limit=200');
  const apps = appsRes.data.applications || [];
  if (appsRes.status !== 200) {
    fail('Liste candidatures', `${appsRes.status}`);
    return summary();
  }
  pass('Liste candidatures', `${apps.length} ligne(s)`);

  const interviewsRes = await api('GET', '/api/v1/interviews?limit=200');
  const interviewsCache = interviewsRes.data.interviews || [];
  const contactsRes = await api('GET', '/api/v1/contacts?limit=200');
  const contactsCache = contactsRes.data.contacts || [];

  const ctx = {
    apps,
    pass,
    fail,
    api,
    interviewsCache: interviewsRes.data.interviews || [],
    contactsCache: contactsRes.data.contacts || [],
  };

  for (const scenario of INTERLEAVED_SCENARIOS) {
    await verifyScenario(scenario, ctx);
  }

  await verifyGlobalExpect(ctx);

  summary();
}

function summary() {
  const ok = results.filter((r) => r.ok).length;
  const ko = results.filter((r) => !r.ok).length;
  console.log(`\n=== Bilan entités entremêlées : ${ok} OK, ${ko} KO ===\n`);
  if (ko > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

module.exports = { results: () => results };
