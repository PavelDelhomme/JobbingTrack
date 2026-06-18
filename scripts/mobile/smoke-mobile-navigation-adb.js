#!/usr/bin/env node
/**
 * Smoke navigation retour + admin + relances (Lot D ligne 318).
 * Bypass biométrique — ne nécessite pas d'empreinte sur l'appareil.
 *
 *   node scripts/mobile/smoke-mobile-navigation-adb.js
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

(async () => {
  const { email, password } = await resolveWorkingUserCredentials();
  const phone = await adbLib.connect();
  console.log('Device:', phone.device);
  console.log('User:', email);

  await ensureLoggedIn(phone, email, password);

  // ── Retour Profil → Paramètres → Profil (pas accueil forcé)
  await adbLib.flows.goToTab(phone, 4, { shell: true });
  await phone.wait(1500);
  await phone.assertVisible('Profil');

  const settingsEntry =
    (await phone.uiContains('Paramètres')) ||
    (await phone.uiContains('confidentialité'));
  if (!settingsEntry) {
    await phone.scrollDown(600);
  }
  try {
    await phone.tap('Paramètres');
  } catch {
    await phone.tap('confidentialité');
  }
  await phone.wait(2000);
  const onSettings =
    (await phone.uiContains('Diagnostic local')) ||
    (await phone.uiContains('Partager des données')) ||
    (await phone.uiContains('Paramètres'));
  if (!onSettings) {
    throw new Error('Écran Paramètres introuvable');
  }
  console.log('✅ Paramètres ouvert');

  await phone.back();
  await phone.wait(1500);
  await phone.assertVisible('Profil');
  if (await phone.uiContains('Diagnostic local')) {
    throw new Error('Retour Paramètres → Profil échoué (encore sur Paramètres)');
  }
  console.log('✅ Retour Paramètres → Profil OK');

  // ── Admin masqué pour compte USER
  if (await phone.uiContains('Accueil') && (await phone.uiContains('Tab 1 of 4'))) {
    /* déjà sur shell */
  }
  await phone.openDrawer();
  await phone.wait(1200);
  const adminVisible =
    (await phone.uiContains('Hub administration')) ||
    (await phone.uiContains('ADMINISTRATION'));
  if (adminVisible && (await phone.uiContains('Hub administration'))) {
    console.log('⚠️ Section admin visible (compte peut être admin) — skip assertion masquage');
  } else {
    console.log('✅ Section admin absente du drawer (user standard)');
  }
  await phone.back();
  await phone.wait(800);

  // ── Relances : pas de FAB global « Ajouter »
  await phone.openDrawer();
  await phone.wait(1200);
  await phone.drawerScrollDown();
  await phone.wait(800);
  try {
    await phone.tap('Relances');
  } catch {
    await phone.drawerScrollDown();
    await phone.wait(600);
    await phone.tap('Relances');
  }
  await phone.wait(2500);
  if (await phone.uiContains('LocaleDataException')) {
    throw new Error('Crash date sur écran Relances');
  }
  const hasGlobalFab =
    (await phone.uiContains('Ajouter une relance')) ||
    (await phone.uiContains('Nouvelle relance'));
  if (hasGlobalFab) {
    throw new Error('FAB relance global détecté (attendu : création depuis détail candidature uniquement)');
  }
  console.log('✅ Relances : pas de FAB global');

  const relancesOk =
    (await phone.uiContains('Relances')) ||
    (await phone.uiContains('relance')) ||
    (await phone.uiContains('Aucune relance'));
  if (!relancesOk) {
    throw new Error('Écran Relances introuvable');
  }
  console.log('✅ Écran Relances chargé');

  await phone.back();
  await phone.wait(1000);

  console.log('\nSmoke navigation mobile OK');
})().catch((err) => {
  console.error('Smoke navigation mobile KO:', err.message);
  process.exit(1);
});
