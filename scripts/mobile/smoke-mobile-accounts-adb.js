#!/usr/bin/env node
/**
 * Smoke dual comptes mobile : admin (menu ADMIN visible) puis user (menu ADMIN absent).
 *
 *   node scripts/mobile/smoke-mobile-accounts-adb.js
 */

const { resolveWorkingAdminCredentials } = require('./resolve-admin-credentials');
const { resolveWorkingUserCredentials } = require('./resolve-user-credentials');
const adbLib = require('../../tools/adb-lib');

async function drawerHasAdminSection(phone) {
  await phone.openDrawer();
  await phone.wait(2000);
  for (let i = 0; i < 5; i++) {
    if (
      (await phone.uiContains('Hub administration')) ||
      (await phone.uiContains('ADMINISTRATION'))
    ) {
      await phone.back();
      await phone.wait(800);
      return true;
    }
    await phone.drawerScrollDown();
    await phone.wait(700);
  }
  await phone.back();
  await phone.wait(800);
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
  await adbLib.flows.clearAppDataForSmoke(phone);
  await adbLib.flows.login(phone, admin.email, admin.password);
  await phone.wait(3000);
  await phone.assertVisible('Bonjour');
  const adminMenu = await drawerHasAdminSection(phone);
  if (!adminMenu) {
    throw new Error('Section ADMINISTRATION absente pour le compte admin');
  }
  console.log('OK: menu ADMINISTRATION visible');
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
