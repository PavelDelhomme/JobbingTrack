#!/usr/bin/env node
/**
 * Smoke impersonnalisation admin → désimpersonnalisation (drawer + bannière).
 *
 *   node scripts/mobile/smoke/adb/smoke-mobile-impersonation-adb.js
 */

const adbLib = require('../../../../tools/adb-lib');
require('../../lib/smoke-runtime');
const { openAppDrawer, ensureUserShell, ensureHomeTab } = require('../../lib/adb-smoke-helpers');
const {
  resolveWorkingAdminCredentials,
  loadRootEnv,
} = require('../../lib/resolve-admin-credentials');
const { resolveWorkingUserCredentials } = require('../../lib/resolve-user-credentials');
const { ensureTestAccountsReady } = require('../../setup/ensure-test-accounts-ready');

loadRootEnv();

async function loginAdmin(phone, admin) {
  await adbLib.flows.dismissBiometricUnlock(phone, { password: admin.password });
  if (await phone.uiContains('Bonjour')) {
    await adbLib.flows.goToTab(phone, 1, { shell: true });
    await openAppDrawer(phone);
    const isAdmin = (await phone.uiContains('Hub administration')) || (await phone.uiContains('Administration'));
    await phone.back();
    await phone.wait(400);
    if (isAdmin) return;
  }
  if (await phone.uiContains('Connexion ADMIN')) {
    await phone.tap('Connexion ADMIN');
    await phone.wait(3500);
  } else {
    for (let i = 0; i < 8; i++) {
      if (await phone.uiContains('Connexion ADMIN')) break;
      await phone.scrollDown(700);
      await phone.wait(400);
    }
    if (await phone.uiContains('Connexion ADMIN')) {
      await phone.tap('Connexion ADMIN');
      await phone.wait(3500);
    } else {
      await adbLib.flows.prepareSmokeSession(phone, { restart: false });
      await adbLib.flows.loginFresh(phone, admin.email, admin.password);
    }
  }
  await adbLib.flows.dismissBiometricUnlock(phone, { password: admin.password });
  await phone.assertVisible('Bonjour');
}

async function openUsersList(phone) {
  await adbLib.flows.goToTab(phone, 1, { shell: true });
  await phone.wait(1200);
  await openAppDrawer(phone);
  await phone.wait(1000);
  for (let i = 0; i < 8; i++) {
    if (await phone.uiContains('Hub administration')) break;
    await phone.drawerScrollDown();
    await phone.wait(500);
  }
  await phone.tapReliable('Hub administration');
  await phone.wait(2500);
  await phone.tapReliable('Utilisateurs');
  await phone.wait(2500);
}

(async () => {
  const admin = await resolveWorkingAdminCredentials();
  const user = await resolveWorkingUserCredentials();
  const phone = await adbLib.connect();
  const shared = process.env.SMOKE_SHARED_SHELL === '1';

  console.log('Device:', phone.device);
  console.log('Admin:', admin.email);

  if (process.env.SMOKE_PREFLIGHT_DONE !== '1') {
    await ensureTestAccountsReady();
  }

  if (!shared) {
    await adbLib.flows.clearAppDataForSmoke(phone);
    await adbLib.flows.prepareSmokeSession(phone, { restart: false });
  }
  await loginAdmin(phone, admin);
  await openUsersList(phone);

  const targetEmail = user.email;
  try {
    await phone.typeInField('Rechercher email', targetEmail.split('@')[0]);
    await phone.wait(1500);
  } catch {
    /* champ recherche optionnel */
  }

  let opened = false;
  for (const label of [targetEmail, targetEmail.split('@')[0], 'proton']) {
    if (await phone.uiContains(label)) {
      await phone.tapReliable(label);
      opened = true;
      break;
    }
  }
  if (!opened) {
    for (let i = 0; i < 12; i++) {
      await phone.scrollDown(700);
      await phone.wait(400);
      if (await phone.uiContains(targetEmail)) {
        await phone.tapReliable(targetEmail);
        opened = true;
        break;
      }
    }
  }
  if (!opened) {
    throw new Error(`Utilisateur cible introuvable dans la liste admin (${targetEmail})`);
  }
  await phone.wait(2500);

  if (!(await phone.uiContains('Détail utilisateur'))) {
    throw new Error('Écran détail utilisateur non ouvert');
  }

  await phone.scrollDown(500);
  await phone.wait(500);
  const actionLabel = "Ouvrir l'app en tant que cet utilisateur";
  if (!(await phone.uiContains(actionLabel))) {
    await phone.scrollDown(600);
    await phone.wait(500);
  }
  if (!(await phone.uiContains(actionLabel))) {
    throw new Error(`Action impersonation introuvable (« ${actionLabel} »)`);
  }
  await phone.tapReliable(actionLabel);
  await phone.wait(800);

  if (await phone.uiContains('Impersonation')) {
    await phone.tapReliable('Confirmer');
  } else if (await phone.uiContains('OK')) {
    await phone.tap('OK');
  }
  await phone.wait(3500);

  await openAppDrawer(phone);
  await phone.wait(1000);
  if (!(await phone.uiContains('Désimpersonnaliser'))) {
    throw new Error('Entrée drawer Désimpersonnaliser absente après impersonate');
  }
  console.log('✅ Drawer Désimpersonnaliser visible (sans bannière persistante)');
  await phone.tapReliable('Désimpersonnaliser');
  await phone.wait(3500);

  const onAdmin =
    (await phone.uiContains('Utilisateurs')) ||
    (await phone.uiContains('Administration')) ||
    (await phone.uiContains('Hub'));
  if (!onAdmin) {
    throw new Error('Liste utilisateurs / hub admin non restauré après désimpersonnalisation');
  }
  if (await phone.uiContains('Impersonnalisation —')) {
    throw new Error('Bannière impersonnalisation persistante encore visible après sortie');
  }
  console.log('✅ Désimpersonnalisation drawer → liste utilisateurs OK');

  // Restaurer session USER pour les smokes suivants
  await adbLib.flows.restartApp(phone);
  await phone.wait(3500);
  await adbLib.flows.dismissBiometricUnlock(phone, { password: user.password });
  if (await phone.uiContains('Connexion USER')) {
    await phone.tap('Connexion USER');
    await phone.wait(4000);
  }
  await ensureHomeTab(phone);
  if (!(await phone.uiContains('Bonjour'))) {
    throw new Error('Session USER non restaurée après impersonation');
  }
  console.log('✅ Session USER restaurée');

  console.log('\nSmoke impersonnalisation mobile OK');
})().catch((err) => {
  console.error('Smoke impersonnalisation mobile KO:', err.message);
  process.exit(1);
});
