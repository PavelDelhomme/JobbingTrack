#!/usr/bin/env node
/**
 * Smoke écran Agent email mobile (drawer + contenu).
 *   node scripts/mobile/smoke-mobile-email-agent-adb.js
 */

const adbLib = require('../../tools/adb-lib');
const { resolveWorkingUserCredentials } = require('./resolve-user-credentials');
const { loadRootEnv } = require('./resolve-admin-credentials');

loadRootEnv();

async function ensureLoggedIn(phone, email, password) {
  await adbLib.flows.dismissBiometricUnlock(phone, { password });
  if (await phone.uiContains('Bonjour')) return;
  try {
    await adbLib.flows.login(phone, email, password);
  } catch {
    await adbLib.flows.loginFresh(phone, email, password);
  }
  await adbLib.flows.dismissBiometricUnlock(phone, { password });
  await phone.assertVisible('Bonjour');
}

async function openEmailAgentFromDrawer(phone) {
  if (await phone.uiContains('Open navigation menu')) {
    await phone.tap('Open navigation menu');
  } else {
    await phone.openDrawer();
  }
  await phone.wait(1200);
  for (let i = 0; i < 6; i++) {
    if (await phone.uiContains('Agent email')) break;
    await phone.scrollDown(350);
    await phone.wait(500);
  }
  try {
    await phone.tap('Agent email');
  } catch {
    await phone.tap('email');
  }
  await phone.wait(2500);
}

async function openEmailAgentFromSettings(phone) {
  await adbLib.flows.goToTab(phone, 4, { shell: true });
  await phone.wait(1500);
  if (!(await phone.uiContains('Paramètres'))) {
    await phone.scrollDown(400);
    await phone.wait(500);
  }
  await phone.tap('Paramètres');
  await phone.wait(2000);
  for (let i = 0; i < 8; i++) {
    if (await phone.uiContains('Agent email')) break;
    await phone.scrollDown(400);
    await phone.wait(500);
  }
  await phone.tap('Agent email');
  await phone.wait(2500);
}

async function main() {
  const { email, password } = await resolveWorkingUserCredentials();
  const phone = await adbLib.connect();
  console.log('[email-agent-adb] Appareil connecté');

  await ensureLoggedIn(phone, email, password);

  console.log('[1/2] Paramètres → Agent email');
  await openEmailAgentFromSettings(phone);
  const ok =
    (await phone.uiContains('À traiter')) ||
    (await phone.uiContains('candidatures@')) ||
    (await phone.uiContains('Consentements')) ||
    (await phone.uiContains('Boîtes connectées')) ||
    (await phone.uiContains('Actif'));
  if (!ok) {
    throw new Error('Contenu agent email non détecté');
  }
  console.log('  → écran agent OK');

  console.log('[2/2] Vérifier messages triage');
  if (await phone.uiContains('À traiter')) {
    console.log('  → section triage visible');
  }

  console.log('SMOKE MOBILE EMAIL AGENT OK');
}

main().catch((err) => {
  console.error('SMOKE FAIL:', err.message);
  process.exit(1);
});
