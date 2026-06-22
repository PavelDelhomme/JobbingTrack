#!/usr/bin/env node
/**
 * Smoke accueil — bloc « À venir » (Lot D ligne 321).
 *
 *   node scripts/mobile/smoke-mobile-home-upcoming-adb.js
 */

const adbLib = require('../../tools/adb-lib');
const { resolveWorkingUserCredentials, GATEWAY_URL } = require('./resolve-user-credentials');
const { loadRootEnv } = require('./resolve-admin-credentials');

loadRootEnv();

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

async function countUpcomingFromApi(token) {
  const now = new Date().toISOString();
  let count = 0;
  for (const path of [
    '/api/v1/interviews?limit=30',
    '/api/v1/followups?limit=30',
  ]) {
    const res = await fetch(`${GATEWAY_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json().catch(() => ({}));
    const list = body.interviews || body.followUps || body.data || [];
    if (Array.isArray(list)) {
      count += list.filter((item) => {
        const d = item.interviewDate || item.scheduledDate || item.followUpDate;
        return d && String(d) >= now.slice(0, 10);
      }).length;
    }
  }
  return count;
}

(async () => {
  const { email, password } = await resolveWorkingUserCredentials();
  const loginRes = await fetch(`${GATEWAY_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const { token } = await loginRes.json();
  const upcomingApi = token ? await countUpcomingFromApi(token) : 0;

  const phone = await adbLib.connect();
  console.log('User:', email);
  console.log('Événements à venir (API approx):', upcomingApi);

  await ensureLoggedIn(phone, email, password);
  await adbLib.flows.goToTab(phone, 1, { shell: true });
  await phone.wait(2500);

  let hasUpcomingUi = false;
  for (let i = 0; i < 10; i++) {
    if (await phone.uiContains('À venir')) {
      hasUpcomingUi = true;
      break;
    }
    await phone.scrollDown(450);
    await phone.wait(600);
  }

  const dashboardOk =
    (await phone.uiContains('Bonjour')) &&
    ((await phone.uiContains('Vue d')) ||
      (await phone.uiContains('Candidatures')) ||
      (await phone.uiContains('Actions rapides')));
  if (!dashboardOk) {
    throw new Error('Dashboard accueil introuvable');
  }
  console.log('✅ Accueil : dashboard OK');

  if (hasUpcomingUi) {
    console.log('✅ Accueil : bloc « À venir » visible');
  } else if (upcomingApi > 0) {
    throw new Error(
      `Bloc « À venir » absent alors que l'API signale ~${upcomingApi} entrée(s)`,
    );
  } else {
    console.log('✅ Accueil : « À venir » masqué (aucun événement à venir côté API)');
  }

  console.log('\nSmoke accueil à venir OK');
})().catch((err) => {
  console.error('Smoke home upcoming KO:', err.message);
  process.exit(1);
});
