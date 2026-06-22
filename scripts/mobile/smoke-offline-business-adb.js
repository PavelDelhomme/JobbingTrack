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
const { ensureUserShell, typeInLabeledField } = require('./adb-smoke-helpers');
const { execSync } = require('child_process');
const { resolveWorkingUserCredentials, GATEWAY_URL } = require('./resolve-user-credentials');

const GATEWAY_PORT = process.env.API_GATEWAY_PORT || '5002';

function adbReverseRemove(port = GATEWAY_PORT) {
  try {
    execSync(`adb reverse --remove tcp:${port}`, { stdio: 'pipe' });
  } catch {
    /* déjà absent */
  }
}

function adbReverseRestore(port = GATEWAY_PORT) {
  try {
    execSync(`adb reverse tcp:${port} tcp:${port}`, { stdio: 'pipe' });
  } catch {
    /* appareil déconnecté */
  }
}

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
    adbReverseRemove();
    await phone.shellCommand('svc wifi disable');
    await phone.shellCommand('svc data disable');
  } else {
    await phone.shellCommand('svc wifi enable');
    await phone.shellCommand('svc data enable');
    adbReverseRestore();
  }
  await phone.wait(offline ? 2500 : 6000);
}

async function isApplicationFormOpen(phone) {
  return (
    (await phone.uiContains('Choisir ou créer une entreprise')) ||
    ((await phone.uiContains('Poste')) &&
      ((await phone.uiContains('Entreprise')) || (await phone.uiContains('Nouvelle candidature'))))
  );
}

async function tapShellFab(phone) {
  if (await phone.uiContains('Nouvelle candidature')) {
    try {
      await phone.tap('Nouvelle candidature');
      return;
    } catch {
      /* fallback coords */
    }
  }
  const sizeOut = await phone.shellCommand('wm size');
  const m = String(sizeOut).match(/(\d+)x(\d+)/);
  const w = m ? parseInt(m[1], 10) : 1080;
  const h = m ? parseInt(m[2], 10) : 2400;
  const fabX = Math.floor(w - 44);
  const fabY = Math.floor(h - 56 - 48 - 44);
  await phone.tapXY(fabX, fabY);
}

async function waitApplicationsTabReady(phone, timeoutMs = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await phone.uiContains('Créer ma première candidature')) return 'empty';
    if (await phone.uiContains('Candidatures') && !(await phone.uiContains('CircularProgressIndicator'))) {
      const nodes = await phone.uiNodes();
      const hasListItem = nodes.some(
        (n) => n.clickable && n.text && n.text.length > 3 && !['Candidatures', 'Entreprises', 'Contacts'].includes(n.text),
      );
      if (hasListItem) return 'list';
    }
    await phone.wait(1000);
  }
  return 'timeout';
}

async function openNewApplicationForm(phone) {
  await adbLib.flows.goToTab(phone, 1, { shell: true });
  await phone.wait(2000);
  try {
    await phone.tap('Nouvelle candidature');
  } catch {
    await tapShellFab(phone);
  }
  await phone.wait(2500);
  if (await isApplicationFormOpen(phone)) return;

  await adbLib.flows.goToTab(phone, 2, { shell: true });
  await phone.wait(1500);
  try {
    await phone.tap('Candidatures', 0);
  } catch {
    try {
      await phone.tap('Candidatures');
    } catch {
      /* déjà sur l’onglet candidatures */
    }
  }
  await waitApplicationsTabReady(phone);

  if (await phone.uiContains('Créer ma première candidature')) {
    await phone.tap('Créer ma première candidature');
  } else {
    await tapShellFab(phone);
  }
  await phone.wait(2500);
  if (!(await isApplicationFormOpen(phone))) {
    throw new Error('Formulaire candidature non ouvert');
  }
}

async function fillApplicationForm(phone, companyName, position) {
  await phone.wait(800);
  try {
    await phone.tap('Entreprise');
  } catch {
    try {
      await phone.tap('Choisir ou créer une entreprise');
    } catch {}
  }
  await phone.wait(1200);
  if (!(await phone.uiContains('Choisir une entreprise'))) {
    throw new Error('Sélecteur entreprise non ouvert');
  }
  try {
    await typeInLabeledField(phone, 'Entreprise', companyName, {
      hints: ['Rechercher ou saisir', 'Rechercher une entreprise', 'Entreprise'],
      editIndex: 0,
    });
  } catch {
    await phone.typeText(companyName);
  }
  await phone.wait(1200);
  const createLabel = `Créer « ${companyName} »`;
  if (await phone.uiContains(createLabel)) {
    await phone.tap(createLabel);
  } else {
    try {
      await phone.tap('Créer');
    } catch {
      throw new Error(`Option créer entreprise « ${companyName} » introuvable`);
    }
  }
  await phone.wait(1500);
  for (let i = 0; i < 8; i++) {
    if (await phone.uiContains('Poste')) {
      try {
        await phone.typeInField('Poste', position);
        break;
      } catch {
        /* scroll */
      }
    }
    await phone.scrollDown(700);
    await phone.wait(500);
  }
  if (!(await phone.uiContains(position))) {
    try {
      await phone.typeInEditTextByIndex(1, position);
    } catch {
      throw new Error('Champ Poste introuvable dans le formulaire candidature');
    }
  }
  await phone.closeKeyboard();
  await phone.wait(600);
  for (let i = 0; i < 8; i++) {
    if (await phone.uiContains('Créer')) {
      try {
        await phone.tap('Créer', 0);
        return;
      } catch {
        try {
          await phone.tap('Créer');
          return;
        } catch {}
      }
    }
    await phone.scrollDown(900);
    await phone.wait(500);
  }
  throw new Error('Bouton Créer introuvable dans le formulaire candidature');
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
    await adbLib.flows.dismissBiometricUnlock(phone, { password: user.password });
    if (!(await phone.uiContains('Bonjour'))) {
      await ensureUserShell(phone, user.email, user.password);
    } else {
      await phone.assertVisible('Bonjour');
    }
    await phone.wait(2000);

    await setNetworkOffline(phone, true);
    networkWasDisabled = true;
    console.log('Réseau OFF (wifi+data)');

    await openNewApplicationForm(phone);

    await fillApplicationForm(phone, companyName, position);
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
    console.log('Réseau ON — relance app pour flush métier…');
    await adbLib.flows.restartApp(phone);
    await adbLib.flows.dismissBiometricUnlock(phone, { password: user.password });
    await phone.wait(4000);
    if (!(await phone.uiContains('Bonjour'))) {
      await adbLib.flows.login(phone, user.email, user.password);
      await phone.wait(3000);
    }

    let pendingAfter = -1;
    for (let attempt = 0; attempt < 10; attempt++) {
      pendingAfter = await readBusinessPending(phone);
      console.log(`Lignes file métier (tentative ${attempt + 1}): ${pendingAfter}`);
      if (pendingAfter === 0) break;
      await phone.wait(4000);
      if (attempt === 4) {
        await phone.shellCommand('input keyevent 3');
        await phone.wait(1500);
        await phone.returnToApp();
        await phone.wait(3000);
      }
    }
    console.log(`Lignes file métier (après sync): ${pendingAfter}`);

    const apiToken = await loginApi(user.email, user.password);
    let app = null;
    for (let attempt = 0; attempt < 8; attempt++) {
      app = await findApplicationByPosition(apiToken, position);
      if (app?.id) break;
      await phone.wait(3000);
    }
    if (!app?.id) {
      throw new Error(`Candidature ${position} introuvable via API après sync`);
    }
    console.log(`API OK: candidature synchronisée → ${app.id}`);

    console.log('\nSmoke offline métier ADB OK (Samsung)');
  } finally {
    if (networkWasDisabled) {
      await setNetworkOffline(phone, false).catch(() => {});
      console.log('Réseau restauré (finally)');
    } else {
      adbReverseRestore();
    }
  }
})().catch((err) => {
  console.error('Smoke offline métier KO:', err.message);
  process.exit(1);
});
