#!/usr/bin/env node
/**
 * Vérifie l'isolation des données métier par utilisateur (pas de fuite inter-comptes).
 *
 * Usage : node scripts/mobile/smoke/api/smoke-user-data-isolation-api.js
 * Prérequis : stack up, TEST_USER_* et TEST_ADMIN_* dans .env, gateway 5002.
 */

const { loadRootEnv, probeLogin, GATEWAY_URL } = require('../../lib/resolve-admin-credentials');
const { resolveWorkingUserCredentials } = require('../../lib/resolve-user-credentials');

loadRootEnv();

async function login(email, password) {
  const res = await fetch(`${GATEWAY_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status !== 200 || !data.token) {
    throw new Error(`Login KO ${email} → ${res.status}`);
  }
  return data.token;
}

async function api(method, path, token, body) {
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
    data = { raw: text.slice(0, 200) };
  }
  return { status: res.status, data };
}

function pass(name, detail = '') {
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  console.error(`❌ ${name}${detail ? ` — ${detail}` : ''}`);
  process.exitCode = 1;
}

async function main() {
  console.log(`\n=== Smoke isolation données utilisateur — ${GATEWAY_URL} ===\n`);

  const userCreds = await resolveWorkingUserCredentials();
  const adminEmail = process.env.TEST_ADMIN_EMAIL?.trim();
  const adminPass = process.env.TEST_ADMIN_PASSWORD || '';
  if (!adminEmail || !adminPass) {
    fail('Config', 'TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD requis');
    return;
  }
  if (!(await probeLogin(adminEmail, adminPass))) {
    fail('Login admin', adminEmail);
    return;
  }

  const userToken = await login(userCreds.email, userCreds.password);
  const adminToken = await login(adminEmail, adminPass);
  pass('Tokens', `${userCreds.email} + ${adminEmail}`);

  const stamp = Date.now();
  const contactRes = await api('POST', '/api/v1/contacts', userToken, {
    firstName: 'Iso',
    lastName: `User-${stamp}`,
    email: `iso-${stamp}@example.com`,
  });
  const contactId = contactRes.data.contact?.id || contactRes.data.id;
  if (!contactId || (contactRes.status !== 200 && contactRes.status !== 201)) {
    fail('Créer contact USER', `${contactRes.status}`);
    return;
  }
  pass('Contact USER créé', contactId);

  const appRes = await api('POST', '/api/v1/applications', userToken, {
    position: `IsoApp-${stamp}`,
    companyName: `IsoCo-${stamp}`,
    contractType: 'CDI',
    applicationType: 'OFFRE',
    applicationDate: new Date().toISOString(),
  });
  const appId = appRes.data.application?.id || appRes.data.id;
  if (!appId || (appRes.status !== 200 && appRes.status !== 201)) {
    fail('Créer candidature USER', `${appRes.status}`);
    return;
  }
  pass('Candidature USER créée', appId);

  const adminContacts = await api('GET', '/api/v1/contacts', adminToken);
  const adminList = adminContacts.data.contacts || adminContacts.data.data || [];
  const leakedContact = Array.isArray(adminList) &&
    adminList.some((c) => c.id === contactId || c.id?.toString() === contactId);
  if (leakedContact) {
    fail('Fuite contact', `visible dans liste admin (${contactId})`);
  } else {
    pass('Liste contacts admin', 'ne contient pas le contact USER');
  }

  const adminGetContact = await api('GET', `/api/v1/contacts/${contactId}`, adminToken);
  if (adminGetContact.status === 200) {
    fail('GET contact cross-user', `admin accède ${contactId}`);
  } else {
    pass('GET contact cross-user', `refus ${adminGetContact.status}`);
  }

  const adminApps = await api('GET', '/api/v1/applications?limit=200', adminToken);
  const apps = adminApps.data.applications || adminApps.data.data || [];
  const leakedApp = Array.isArray(apps) &&
    apps.some((a) => a.id === appId || a.id?.toString() === appId);
  if (leakedApp) {
    fail('Fuite candidature', `visible dans liste admin (${appId})`);
  } else {
    pass('Liste candidatures admin', 'ne contient pas la candidature USER');
  }

  const adminGetApp = await api('GET', `/api/v1/applications/${appId}`, adminToken);
  if (adminGetApp.status === 200) {
    fail('GET candidature cross-user', `admin accède ${appId}`);
  } else {
    pass('GET candidature cross-user', `refus ${adminGetApp.status}`);
  }

  const notifRes = await api('GET', '/api/v1/notifications?scope=in_app&limit=50', adminToken);
  const notifs = notifRes.data.notifications || notifRes.data.data || [];
  const userOwned = Array.isArray(notifs) &&
    notifs.some((n) => n.userId && n.userId !== adminEmail && n.metadata?.contactId === contactId);
  if (userOwned) {
    fail('Notifications cross-user', 'entrée USER visible chez admin');
  } else {
    pass('Notifications admin', 'pas de fuite évidente contact USER');
  }

  console.log('\n=== Fin smoke isolation ===\n');
}

main().catch((e) => {
  fail('Exception', e.message);
  process.exit(1);
});
