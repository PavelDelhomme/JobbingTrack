#!/usr/bin/env node
/**
 * Smoke édition profil — sauvegarde téléphone (Lot D ligne 320).
 *
 *   node scripts/mobile/smoke/adb/smoke-mobile-profile-save-adb.js
 */

const adbLib = require('../../../../tools/adb-lib');
const { ensureUserShell, openProfileEdit, typeInLabeledField } = require('../../lib/adb-smoke-helpers');
const { resolveWorkingUserCredentials } = require('../../lib/resolve-user-credentials');
const { loadRootEnv } = require('../../lib/resolve-admin-credentials');

loadRootEnv();

(async () => {
  const { email, password } = await resolveWorkingUserCredentials();
  const phone = await adbLib.connect();
  const testPhone = `06${String(Date.now()).slice(-8)}`;
  console.log('User:', email);
  console.log('Téléphone test:', testPhone);

  await ensureUserShell(phone, email, password);
  await openProfileEdit(phone);

  await typeInLabeledField(phone, 'Téléphone', testPhone);
  await phone.closeKeyboard();
  await phone.wait(400);

  try {
    await phone.tap('Enregistrer');
  } catch {
    await phone.tap('Enregistrer', 1);
  }
  await phone.wait(2500);

  if (!(await phone.uiContains('Profil'))) {
    throw new Error('Retour profil après enregistrement introuvable');
  }
  if (!(await phone.uiContains(testPhone))) {
    await phone.scrollDown(400);
    await phone.wait(600);
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
