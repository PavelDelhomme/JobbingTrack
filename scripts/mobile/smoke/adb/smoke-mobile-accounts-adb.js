#!/usr/bin/env node
/**
 * Smoke dual comptes mobile : admin (menu ADMIN visible) puis user (menu ADMIN absent).
 *
 *   node scripts/mobile/smoke/adb/smoke-mobile-accounts-adb.js
 */

const { resolveWorkingAdminCredentials, GATEWAY_URL } = require('../../lib/resolve-admin-credentials');
const { resolveWorkingUserCredentials } = require('../../lib/resolve-user-credentials');
const adbLib = require('../../../../tools/adb-lib');

async function loginAdminViaApi(email, password) {
  const res = await fetch(`${GATEWAY_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login admin API HTTP ${res.status}`);
  const data = await res.json();
  const role = data.user?.role;
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    throw new Error(`Compte ${email} sans rôle admin (role=${role || '?'})`);
  }
  return data;
}

async function drawerHasAdminSection(phone) {
  await adbLib.flows.goToTab(phone, 1, { shell: true });
  await phone.openNavigationDrawer();
  await phone.wait(1000);
  for (let i = 0; i < 8; i++) {
    if (
      (await phone.uiContains('Hub administration')) ||
      (await phone.uiContains('ADMINISTRATION'))
    ) {
      await phone.back();
      await phone.wait(500);
      return true;
    }
    await phone.drawerScrollDown();
    await phone.wait(400);
  }
  await phone.back();
  await phone.wait(500);
  return false;
}

(async () => {
  const admin = await resolveWorkingAdminCredentials();
  const user = await resolveWorkingUserCredentials();

  const phone = await adbLib.connect();
  const devices = await phone.listDevices();
  if (!devices.length) {
    throw new Error('Aucun appareil ADB détecté');
  }
  console.log('Devices:', devices.map((d) => d.id).join(', '));

  console.log('\n=== Compte ADMIN ===');
  console.log(`Source: ${admin.source} (${admin.email})`);
  await loginAdminViaApi(admin.email, admin.password);
  await adbLib.flows.clearAppDataForSmoke(phone);
  await adbLib.flows.login(phone, admin.email, admin.password);
  await phone.wait(3000);
  await phone.assertVisible('Bonjour');
  const adminMenu = await drawerHasAdminSection(phone);
  if (!adminMenu) {
    throw new Error('Section ADMINISTRATION absente pour le compte admin');
  }
  console.log('OK: menu ADMINISTRATION visible');

  await phone.openNavigationDrawer();
  await phone.wait(1500);
  let hubOpened = false;
  for (let i = 0; i < 8; i++) {
    if (await phone.uiContains('Hub administration')) {
      await phone.tapReliable('Hub administration');
      hubOpened = true;
      break;
    }
    await phone.drawerScrollDown();
    await phone.wait(600);
  }
  if (!hubOpened) {
    throw new Error('Hub administration introuvable pour compte admin');
  }
  await phone.wait(2500);
  try {
    await phone.tap('Donnees test');
  } catch {
    await phone.tap('Données de test');
  }
  await phone.wait(2000);
  const testDataOk =
    (await phone.uiContains('backoffice web')) ||
    (await phone.uiContains('Générateur de données')) ||
    (await phone.uiContains('Données de test'));
  if (!testDataOk) {
    throw new Error('Écran Données de test : message backoffice introuvable');
  }
  console.log('OK: Données de test → renvoi backoffice');
  await phone.back();
  await phone.wait(800);
  await phone.back();
  await phone.wait(800);

  await adbLib.flows.ensureLoggedOut(phone);

  console.log('\n=== Compte UTILISATEUR TEST ===');
  console.log(`Source: ${user.source} (${user.email})`);
  await adbLib.flows.clearAppDataForSmoke(phone);
  await adbLib.flows.login(phone, user.email, user.password);
  await phone.wait(3000);
  await phone.assertVisible('Bonjour');
  const userAdminMenu = await drawerHasAdminSection(phone);
  if (userAdminMenu) {
    throw new Error('Section ADMINISTRATION visible pour un compte utilisateur (faille UI)');
  }
  console.log('OK: menu ADMINISTRATION masqué pour utilisateur test');

  console.log('\nSmoke dual comptes mobile OK (admin + user)');
})().catch((err) => {
  console.error('Smoke dual comptes mobile KO:', err.message);
  process.exit(1);
});
