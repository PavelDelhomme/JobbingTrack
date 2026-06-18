#!/usr/bin/env node
/**
 * Smoke sync métier offline mobile (Samsung / ADB) :
 * 1. login utilisateur test
 * 2. réseau OFF → formulaire candidature → file offline_business_sync_queue
 * 3. réseau ON → flush → vérif API
 * 4. finally : réseau restauré
 *
 *   node scripts/mobile/smoke-offline-business-adb.js
 */

const adbLib = require('../../tools/adb-lib');
const { resolveWorkingUserCredentials, GATEWAY_URL } = require('./resolve-user-credentials');

async function readBusinessPending(phone) {
  try {
    const out = await phone.shellCommand(
      'run-as com.example.jobbingtrack_mobile wc -l app_flutter/offline_business_sync_queue.jsonl 2>/dev/null || echo 0',
    );
    const n = parseInt(String(out).trim().split(/\s/)[0], 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return -1;
  }
}

async function setNetworkOffline(phone, offline) {
  if (offline) {
    await phone.shellCommand('svc wifi disable');
    await phone.shellCommand('svc data disable');
  } else {
    await phone.shellCommand('svc wifi enable');
    await phone.shellCommand('svc data enable');
  }
  await phone.wait(offline ? 2500 : 6000);
}

async function openNewApplicationForm(phone) {
  await adbLib.flows.goToTab(phone, 2);
  if (await phone.uiContains('Créer ma première candidature')) {
    await phone.tap('Créer ma première candidature');
  } else {
    const sizeOut = await phone.shellCommand('wm size');
    const m = String(sizeOut).match(/(\d+)x(\d+)/);
    const w = m ? parseInt(m[1], 10) : 1080;
    const h = m ? parseInt(m[2], 10) : 2400;
    await phone.tapXY(Math.floor(w * 0.88), Math.floor(h * 0.88));
  }
  await phone.wait(2500);
  if (!(await phone.uiContains('Nouvelle candidature'))) {
    throw new Error('Formulaire candidature non ouvert');
  }
}

async function loginApi(email, password) {
  const res = await fetch(`${GATEWAY_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login API HTTP ${res.status}`);
  const data = await res.json();
  if (!data.token) throw new Error('Token API absent');
  return data.token;
}

async function findApplicationByPosition(token, position) {
  const res = await fetch(`${GATEWAY_URL}/api/v1/applications?limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`GET applications HTTP ${res.status}`);
  const data = await res.json();
  const list = data.applications || [];
  return list.find((a) => a.position === position || a.title === position);
}

(async () => {
  const user = await resolveWorkingUserCredentials();
  const phone = await adbLib.connect();
  const devices = await phone.listDevices();
  if (!devices.length) throw new Error('Aucun appareil ADB');

  const stamp = Date.now();
  const companyName = `OfflineCo-${stamp}`;
  const position = `OfflinePoste-${stamp}`;

  console.log('Device:', devices[0].id);
  console.log(`User: ${user.source} (${user.email})`);
  console.log(`Candidature test: ${position}`);

  let networkWasDisabled = false;
  try {
    await adbLib.flows.restartApp(phone);
    if (await phone.uiContains('Bonjour')) {
      console.log('Session déjà active après restart');
    } else {
      await adbLib.flows.login(phone, user.email, user.password);
    }
    await phone.assertVisible('Bonjour');
    await phone.wait(2000);

    await openNewApplicationForm(phone);

    await setNetworkOffline(phone, true);
    networkWasDisabled = true;
    console.log('Réseau OFF (wifi+data)');

    await phone.typeInEditTextByIndex(0, companyName);
    await phone.typeInEditTextByIndex(1, position);
    await phone.tap('Créer');
    await phone.wait(3000);

    const pendingOffline = await readBusinessPending(phone);
    console.log(`Lignes file métier (offline): ${pendingOffline}`);
    if (pendingOffline <= 0) {
      throw new Error('File métier vide en offline — mutation non enfilée');
    }

    const queuedMsg =
      (await phone.uiContains('file')) ||
      (await phone.uiContains('synchronisation')) ||
      (await phone.uiContains('Modification en file'));
    if (queuedMsg) {
      console.log('OK: retour UI file offline détecté');
    } else {
      console.warn('WARN: message UI file non détecté (file disque OK)');
    }

    await setNetworkOffline(phone, false);
    networkWasDisabled = false;
    console.log('Réseau ON — attente sync métier…');
    await phone.wait(12000);

    const pendingAfter = await readBusinessPending(phone);
    console.log(`Lignes file métier (après réseau): ${pendingAfter}`);

    const apiToken = await loginApi(user.email, user.password);
    const app = await findApplicationByPosition(apiToken, position);
    if (!app?.id) {
      throw new Error(`Candidature ${position} introuvable via API après sync`);
    }
    console.log(`API OK: candidature synchronisée → ${app.id}`);

    console.log('\nSmoke offline métier ADB OK (Samsung)');
  } finally {
    if (networkWasDisabled) {
      await setNetworkOffline(phone, false).catch(() => {});
      console.log('Réseau restauré (finally)');
    }
  }
})().catch((err) => {
  console.error('Smoke offline métier KO:', err.message);
  process.exit(1);
});
