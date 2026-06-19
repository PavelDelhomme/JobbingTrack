#!/usr/bin/env node
/**
 * Smoke entreprises, contacts, édition profil (Lot D ligne 320).
 * Bypass biométrique — sans intervention sur l'appareil.
 *
 *   node scripts/mobile/smoke-mobile-entities-adb.js
 */

const adbLib = require('../../tools/adb-lib');
const { resolveWorkingUserCredentials } = require('./resolve-user-credentials');
const { loadRootEnv } = require('./resolve-admin-credentials');

loadRootEnv();

async function ensureLoggedIn(phone, email, password) {
  await adbLib.flows.dismissBiometricUnlock(phone, { password });
  if (await phone.uiContains('Bonjour')) return;
  await adbLib.flows.loginFresh(phone, email, password);
  await phone.assertVisible('Bonjour');
}

async function openDrawerItemWithScroll(phone, label) {
  await phone.openDrawer();
  await phone.wait(1200);
  if (!(await phone.uiContains(label))) {
    await phone.drawerScrollDown();
    await phone.wait(700);
  }
  await phone.tap(label);
  await phone.wait(2500);
}

(async () => {
  const { email, password } = await resolveWorkingUserCredentials();
  const phone = await adbLib.connect();
  console.log('User:', email);

  await ensureLoggedIn(phone, email, password);

  // ── Entreprises
  await openDrawerItemWithScroll(phone, 'Entreprises');
  if (!(await phone.uiContains('Entreprises'))) {
    throw new Error('Écran Entreprises introuvable');
  }
  const companiesOk =
    (await phone.uiContains('Aucune entreprise')) ||
    (await phone.uiContains('entreprise'));
  if (!companiesOk) {
    throw new Error('Liste entreprises : état vide/chargé introuvable');
  }
  console.log('✅ Entreprises : écran OK');
  await phone.back();
  await phone.wait(1500);

  // ── Contacts (+ FAB attendu sur cet écran)
  await openDrawerItemWithScroll(phone, 'Contacts');
  if (!(await phone.uiContains('Contacts'))) {
    throw new Error('Écran Contacts introuvable');
  }
  const contactsOk =
    (await phone.uiContains('Aucun contact')) || (await phone.uiContains('contact'));
  if (!contactsOk) {
    throw new Error('Liste contacts : état vide/chargé introuvable');
  }
  console.log('✅ Contacts : écran OK');
  await phone.back();
  await phone.wait(1500);

  // ── Profil → Modifier (sans sauvegarde pour ne pas altérer les données)
  await adbLib.flows.goToTab(phone, 4, { shell: true });
  await phone.wait(1500);
  try {
    await phone.tap('Modifier');
  } catch {
    await phone.tap('Modifier le profil');
  }
  await phone.wait(2000);
  const editOk =
    (await phone.uiContains('Prénom')) ||
    (await phone.uiContains('Enregistrer')) ||
    (await phone.uiContains('Modifier le profil'));
  if (!editOk) {
    throw new Error('Écran modification profil introuvable');
  }
  console.log('✅ Profil : écran modification OK');
  await phone.back();
  await phone.wait(1500);
  await phone.assertVisible('Profil');
  console.log('✅ Retour édition profil → Profil OK');

  console.log('\nSmoke entités mobile OK');
})().catch((err) => {
  console.error('Smoke entités mobile KO:', err.message);
  process.exit(1);
});
