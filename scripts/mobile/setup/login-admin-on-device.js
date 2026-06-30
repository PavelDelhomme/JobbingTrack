#!/usr/bin/env node
/**
 * Connexion admin sur appareil ADB (TEST_ADMIN_* depuis .env).
 * Laisse la session admin active avec menu ADMINISTRATION visible.
 *
 *   node scripts/mobile/setup/login-admin-on-device.js
 */
const { execSync } = require('child_process');
const adbLib = require('../../../tools/adb-lib');
const { resolveWorkingAdminCredentials, loadRootEnv } = require('../lib/resolve-admin-credentials');

loadRootEnv();

async function ensureReverse() {
  try {
    execSync('adb reverse tcp:5002 tcp:5002', { stdio: 'pipe' });
    execSync('adb reverse tcp:5003 tcp:5003', { stdio: 'pipe' });
    console.log('OK adb reverse 5002/5003');
  } catch (e) {
    console.warn('WARN adb reverse:', e.message);
  }
}

async function scrollToDebugLogin(phone) {
  for (let i = 0; i < 12; i++) {
    if (await phone.uiContains('Connexion ADMIN')) return true;
    await phone.scrollDown(600);
    await phone.wait(400);
  }
  return phone.uiContains('Connexion ADMIN');
}

async function loginAsAdmin(phone, email, password) {
  await adbLib.flows.prepareSmokeSession(phone, { restart: false, skipBiometric: true });

  const onShell =
    (await phone.uiContains('Bonjour')) || (await phone.uiContains('Tab 1 of 4'));

  if (onShell) {
    try {
      await adbLib.flows.goToTab(phone, 1, { shell: true });
    } catch {
      /* shell partiel */
    }
    await phone.openNavigationDrawer();
    await phone.wait(800);
    await phone.drawerScrollDown();
    if (
      (await phone.uiContains('Hub administration')) ||
      (await phone.uiContains('ADMINISTRATION'))
    ) {
      await phone.back();
      console.log(`Déjà connecté en admin (${email})`);
      return;
    }
    await phone.back();
    await adbLib.flows.ensureLoggedOut(phone);
  }

  if (await scrollToDebugLogin(phone)) {
    console.log('Connexion via bouton debug ADMIN…');
    await phone.tap('Connexion ADMIN');
  } else {
    console.log('Connexion via saisie manuelle…');
    await adbLib.flows.ensureFullLoginForm(phone);
    await adbLib.flows.login(phone, email, password);
  }

  await phone.wait(2500);
  const home =
    (await phone.uiContains('Bonjour')) || (await phone.uiContains('Tab 1 of 4'));
  if (!home) {
    if (await phone.uiContains('Erreur')) throw new Error('Erreur API visible à l\'écran');
    throw new Error('Accueil introuvable après login admin');
  }
}

async function openAdminHub(phone) {
  if (!(await phone.uiContains('Tab 1 of 4'))) {
    throw new Error('Shell introuvable — reconnectez-vous');
  }
  await adbLib.flows.goToTab(phone, 1, { shell: true });
  await phone.openNavigationDrawer();
  await phone.wait(900);
  await phone.drawerScrollDown();
  if (!(await phone.uiContains('Hub administration'))) {
    throw new Error('Menu admin absent — compte non ADMIN ?');
  }
  await phone.tap('Hub administration');
  await phone.wait(2000);
  if (!(await phone.uiContains('Outils d\'administration'))) {
    throw new Error('Hub administration non ouvert');
  }
  console.log('Hub administration ouvert');
}

async function main() {
  await ensureReverse();
  const { email, password, source } = await resolveWorkingAdminCredentials();
  const phone = await adbLib.connect();
  console.log('Appareil:', phone.device || '(adb)');
  console.log('Compte:', email, `(${source})`);

  await loginAsAdmin(phone, email, password);
  await openAdminHub(phone);

  console.log('\nOK — connecté admin sur mobile.');
  console.log('Drawer → ADMINISTRATION → Hub administration / Logs');
  console.log('Backoffice web (navigateur PC) : http://localhost:5003/backoffice/administration/mobile-logs');
}

main().catch((e) => {
  console.error('\nKO login-admin-on-device:', e.message);
  console.error('Essayez : node scripts/mobile/setup/ensure-device-api-ready.js');
  process.exit(1);
});
