#!/usr/bin/env node
/**
 * Smoke télémétrie offline — file + diagnostic Paramètres (Lot D ligne 323).
 *
 *   node scripts/mobile/smoke-mobile-offline-telemetry-adb.js
 */

const adbLib = require('../../tools/adb-lib');
const { execSync } = require('child_process');
const { resolveWorkingUserCredentials } = require('./resolve-user-credentials');
const { loadRootEnv } = require('./resolve-admin-credentials');

loadRootEnv();

const GATEWAY_PORT = process.env.API_GATEWAY_PORT || '5002';

function adbReverseRemove(port = GATEWAY_PORT) {
  try {
    execSync(`adb reverse --remove tcp:${port}`, { stdio: 'pipe' });
  } catch {
    /* ok */
  }
}

function adbReverseRestore(port = GATEWAY_PORT) {
  try {
    execSync(`adb reverse tcp:${port} tcp:${port}`, { stdio: 'pipe' });
  } catch {
    /* ok */
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
  await phone.wait(offline ? 2500 : 8000);
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

async function openSettingsDiagnostics(phone) {
  await adbLib.flows.goToTab(phone, 4, { shell: true });
  await phone.wait(1500);
  try {
    await phone.tap('Paramètres');
  } catch {
    await phone.tap('confidentialité');
  }
  await phone.wait(2000);
  for (let i = 0; i < 8; i++) {
    if (await phone.uiContains('Diagnostic local')) break;
    await phone.scrollDown(450);
    await phone.wait(600);
  }
  await phone.tap('Diagnostic local');
  await phone.wait(2500);
}

(async () => {
  const { email, password } = await resolveWorkingUserCredentials();
  const phone = await adbLib.connect();
  console.log('User:', email);

  await ensureLoggedIn(phone, email, password);

  try {
    await setNetworkOffline(phone, true);
    await adbLib.flows.goToTab(phone, 2, { shell: true });
    await phone.wait(2000);
    await adbLib.flows.goToTab(phone, 3, { shell: true });
    await phone.wait(2000);
    await adbLib.flows.goToTab(phone, 1, { shell: true });
    await phone.wait(2000);
    console.log('✅ Offline : navigation shell sans crash');

    await setNetworkOffline(phone, false);
    await phone.wait(5000);

    await openSettingsDiagnostics(phone);
    const diagOk =
      (await phone.uiContains('telemetryQueuePending')) ||
      (await phone.uiContains('--- Session ---')) ||
      (await phone.uiContains('consentTelemetry'));
    if (!diagOk) {
      throw new Error('Diagnostic local : contenu télémétrie introuvable');
    }
    console.log('✅ Diagnostic local : résumé télémétrie visible après retour réseau');

    if (await phone.uiContains('Fermer')) {
      await phone.tap('Fermer');
    } else {
      await phone.back();
    }
    await phone.wait(1000);
    await phone.back();
    await phone.wait(1000);
    await adbLib.flows.goToTab(phone, 1, { shell: true });

    console.log('\nSmoke offline télémétrie mobile OK');
  } finally {
    await setNetworkOffline(phone, false);
  }
})().catch((err) => {
  console.error('Smoke offline telemetry KO:', err.message);
  process.exit(1);
});
