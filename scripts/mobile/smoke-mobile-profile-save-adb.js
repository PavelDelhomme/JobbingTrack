#!/usr/bin/env node
/**
 * Smoke édition profil — sauvegarde téléphone (Lot D ligne 320).
 *
 *   node scripts/mobile/smoke-mobile-profile-save-adb.js
 */

const adbLib = require('../../tools/adb-lib');
const { resolveWorkingUserCredentials } = require('./resolve-user-credentials');
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

(async () => {
  const { email, password } = await resolveWorkingUserCredentials();
  const phone = await adbLib.connect();
  const testPhone = `06${String(Date.now()).slice(-8)}`;
  console.log('User:', email);
  console.log('Téléphone test:', testPhone);

  await ensureLoggedIn(phone, email, password);

  await adbLib.flows.goToTab(phone, 4, { shell: true });
  await phone.wait(1500);
  try {
    await phone.tap('Modifier');
  } catch {
    await phone.tap('Modifier le profil');
  }
  await phone.wait(2000);

  if (!(await phone.uiContains('Prénom')) && !(await phone.uiContains('Téléphone'))) {
    throw new Error('Écran modification profil introuvable');
  }

  try {
    await phone.typeInField('Téléphone', testPhone);
  } catch {
    await phone.typeInEditTextByIndex(2, testPhone);
  }
  await phone.closeKeyboard();
  await phone.wait(500);

  try {
    await phone.tap('Enregistrer');
  } catch {
    await phone.tap('Enregistrer', 1);
  }
  await phone.wait(4000);

  const saved =
    (await phone.uiContains('Profil mis à jour')) ||
    (await phone.uiContains('Profil')) ||
    (await phone.uiContains(testPhone));
  if (!(await phone.uiContains('Profil'))) {
    throw new Error('Retour profil après enregistrement introuvable');
  }
  if (!(await phone.uiContains(testPhone))) {
    await phone.scrollDown(400);
    await phone.wait(800);
  }
  if (!(await phone.uiContains(testPhone))) {
    throw new Error(`Téléphone « ${testPhone} » non visible sur le profil`);
  }
  console.log(`✅ Profil : téléphone « ${testPhone} » enregistré et affiché`);

  await adbLib.flows.goToTab(phone, 1, { shell: true });
  console.log('\nSmoke sauvegarde profil OK');
})().catch((err) => {
  console.error('Smoke profile save KO:', err.message);
  process.exit(1);
});
