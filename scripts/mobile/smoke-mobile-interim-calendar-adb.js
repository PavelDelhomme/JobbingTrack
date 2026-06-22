#!/usr/bin/env node
/**
 * Smoke calendrier intérim — événement ambre via API + affichage app (Lot D ligne 319).
 *
 *   node scripts/mobile/smoke-mobile-interim-calendar-adb.js
 */

const adbLib = require('../../tools/adb-lib');
const { resolveWorkingUserCredentials, GATEWAY_URL } = require('./resolve-user-credentials');
const { loadRootEnv } = require('./resolve-admin-credentials');

loadRootEnv();

function nodeLabel(n) {
  return `${n.text || ''}\n${n.contentDesc || ''}`.trim();
}

async function api(method, path, body, token) {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function seedInterimCalendarEvent(token) {
  const stamp = Date.now();
  const agencyRes = await api(
    'POST',
    '/api/v1/companies',
    { name: `SmokeAg-${stamp}`, companyType: 'TEMP_AGENCY' },
    token,
  );
  const agencyId =
    agencyRes.data.company?.id || agencyRes.data.id || agencyRes.data.data?.id;
  if (!agencyId) {
    throw new Error(`Création agence intérim KO: ${agencyRes.status}`);
  }

  const appRes = await api(
    'POST',
    '/api/v1/applications',
    {
      position: `InterimCal-${stamp}`,
      companyName: `ClientCo-${stamp}`,
      agencyId,
      applicationDate: new Date().toISOString(),
    },
    token,
  );
  const appId =
    appRes.data.application?.id || appRes.data.id || appRes.data.data?.id;
  if (!appId) {
    throw new Error(`Candidature intérim KO: ${appRes.status}`);
  }

  const title = `SmokeInterimCal-${stamp}`;
  // Date lointaine → en tête de liste (orderBy startDate desc) pour affichage ADB sans scroll infini.
  const startDate = new Date(Date.now() + 30 * 24 * 3600_000).toISOString();
  const evRes = await api(
    'POST',
    '/api/v1/events',
    { title, applicationId: appId, startDate },
    token,
  );
  const color =
    evRes.data.event?.color || evRes.data.color || evRes.data.data?.color;
  if (evRes.status !== 201 && evRes.status !== 200) {
    throw new Error(`POST event KO: ${evRes.status}`);
  }
  if (!String(color || '').toUpperCase().includes('F59')) {
    console.warn(`WARN: couleur événement inattendue (${color}), ambre attendu #F59E0B`);
  }
  console.log(`✅ API : événement intérim « ${title} » color=${color || '?'}`);
  return title;
}

async function ensureLoggedIn(phone, email, password) {
  await adbLib.flows.dismissBiometricUnlock(phone, { password });
  if (
    (await phone.uiContains('Bonjour')) ||
    (await phone.uiContains('Tab 1 of 4')) ||
    (await phone.uiContains('Open navigation menu'))
  ) {
    return;
  }
  if (
    (await phone.uiContains('Email')) ||
    (await phone.uiContains('Mot de passe')) ||
    (await phone.uiContains('Se connecter'))
  ) {
    await adbLib.flows.login(phone, email, password);
  } else {
    await adbLib.flows.loginFresh(phone, email, password);
  }
  await adbLib.flows.dismissBiometricUnlock(phone, { password });
  await phone.assertVisible('Bonjour');
}

(async () => {
  const { email, password } = await resolveWorkingUserCredentials();
  const loginRes = await fetch(`${GATEWAY_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const loginBody = await loginRes.json();
  const token = loginBody.token;
  if (!token) throw new Error('Login API KO pour seed calendrier');

  const eventTitle = await seedInterimCalendarEvent(token);

  const phone = await adbLib.connect();
  console.log('User:', email);

  await ensureLoggedIn(phone, email, password);
  await adbLib.flows.setInterimModeForSmoke(phone, true);
  await adbLib.flows.restartApp(phone);
  await phone.wait(3500);
  await adbLib.flows.dismissBiometricUnlock(phone, { password });
  if (!(await phone.uiContains('Bonjour'))) {
    await adbLib.flows.login(phone, email, password);
    await adbLib.flows.dismissBiometricUnlock(phone, { password });
  }
  await phone.assertVisible('Bonjour');

  await adbLib.flows.goToTab(phone, 3, { shell: true });
  await phone.wait(4000);

  const key = 'SmokeInterimCal';
  let found = false;
  for (let i = 0; i < 8; i++) {
    if (await phone.uiContains(key)) {
      found = true;
      break;
    }
    await phone.scrollDown(400);
    await phone.wait(600);
  }
  if (!found) {
    throw new Error(`Événement intérim « ${eventTitle} » introuvable au calendrier`);
  }
  console.log(`✅ Calendrier : « ${key} » visible (couleur API #F59E0B → icône ambre)`);

  await adbLib.flows.goToTab(phone, 1, { shell: true });
  console.log('\nSmoke calendrier intérim OK');
})().catch((err) => {
  console.error('Smoke interim calendar KO:', err.message);
  process.exit(1);
});
