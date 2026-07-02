#!/usr/bin/env node
/**
 * Smoke navigation retour + admin + relances (Lot D ligne 318).
 * Bypass biométrique — ne nécessite pas d'empreinte sur l'appareil.
 *
 *   node scripts/mobile/smoke/adb/smoke-mobile-navigation-adb.js
 */

const adbLib = require('../../../../tools/adb-lib');
const { resolveWorkingUserCredentials } = require('../../lib/resolve-user-credentials');
const { loadRootEnv } = require('../../lib/resolve-admin-credentials');

loadRootEnv();

async function ensureLoggedIn(phone, email, password) {
  await adbLib.flows.prepareSmokeSession(phone, { restart: false });
  await adbLib.flows.ensureAuthenticatedShell(phone, email, password);
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

  // ── Retour Calendrier (onglet shell) → Profil (pas accueil forcé)
  await adbLib.flows.goToTab(phone, 4, { shell: true });
  await phone.wait(1200);
  await phone.assertVisible('Profil');

  await adbLib.flows.goToTab(phone, 3, { shell: true });
  await phone.wait(2000);
  const onCalendar =
    (await phone.uiContains('Événements & Rappels')) ||
    (await phone.uiContains('Calendrier')) ||
    (await phone.uiContains('Tab 3 of 4'));
  if (!onCalendar) {
    throw new Error('Écran Calendrier introuvable (onglet shell 3)');
  }
  console.log('✅ Onglet Calendrier OK');

  await phone.back();
  await phone.wait(1500);
  await phone.assertVisible('Profil');
  if (await phone.uiContains('Bonjour') && !(await phone.uiContains('Profil'))) {
    throw new Error('Retour Calendrier → Profil échoué (accueil forcé)');
  }
  console.log('✅ Retour Calendrier → Profil OK');

  // ── Admin : retour hub → écran précédent (si compte admin)
  await phone.openDrawer();
  await phone.wait(1200);
  const hasAdminHub = await phone.uiContains('Hub administration');
  if (hasAdminHub) {
    await phone.drawerScrollDown();
    await phone.wait(600);
    await phone.tap('Hub administration');
    await phone.wait(2500);
    const onAdmin =
      (await phone.uiContains('Administration')) ||
      (await phone.uiContains('Utilisateurs')) ||
      (await phone.uiContains('Hub'));
    if (!onAdmin) {
      throw new Error('Hub administration introuvable');
    }
    console.log('✅ Hub administration ouvert');

    await phone.back();
    await phone.wait(1500);
    if (await phone.uiContains('Accès refusé')) {
      throw new Error('Compte admin refusé sur hub — vérifier AdminAccess');
    }
    const backOk =
      (await phone.uiContains('Profil')) ||
      (await phone.uiContains('Bonjour')) ||
      (await phone.uiContains('Tab'));
    if (!backOk) {
      throw new Error('Retour hub admin → écran précédent échoué');
    }
    console.log('✅ Retour hub admin OK');
  } else {
    console.log('✅ Section admin absente — skip retour hub');
  }

  // ── Admin masqué pour compte USER (drawer)
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

  // ── Re-tap onglet Candidatures (barre basse) → liste candidatures (sous-onglet 0)
  await adbLib.flows.goToTab(phone, 2, { shell: true });
  await phone.wait(1500);
  if (await phone.uiContains('Relances')) {
    await phone.tap('Relances');
    await phone.wait(2000);
  }
  await adbLib.flows.goToTab(phone, 2, { shell: true });
  await phone.wait(2000);
  const onCandidaturesList =
    (await phone.uiContains('Candidatures')) &&
    !(await phone.uiContains('Aucune relance')) &&
    ((await phone.uiContains('Nouvelle candidature')) ||
      (await phone.uiContains('Aucune candidature')) ||
      (await phone.uiContains('Postulé')));
  if (!onCandidaturesList) {
    const fallback =
      (await phone.uiContains('Candidatures')) &&
      !(await phone.uiContains('relance planifiée'));
    if (!fallback) {
      throw new Error('Re-tap Candidatures : retour liste sous-onglet 0 échoué');
    }
  }
  console.log('✅ Re-tap onglet Candidatures → liste OK');

  // ── FAB contact sur sous-onglet Contacts
  if (await phone.uiContains('Contacts')) {
    await phone.tap('Contacts');
  } else {
    await phone.openDrawer();
    await phone.wait(800);
    await phone.tap('Contacts');
    await phone.back();
    await phone.wait(800);
  }
  await phone.wait(2000);
  try {
    await phone.tap('Nouveau contact');
  } catch {
    const fab = await phone.findElement('Nouveau contact');
    if (fab?.bounds) {
      const m = fab.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
      if (m) {
        await phone.tapCoords(
          Math.floor((+m[1] + +m[3]) / 2),
          Math.floor((+m[2] + +m[4]) / 2),
        );
      }
    }
  }
  await phone.wait(2000);
  const contactSheet =
    (await phone.uiContains('Prénom')) ||
    (await phone.uiContains('Nom')) ||
    (await phone.uiContains('Entreprise')) ||
    (await phone.uiContains('Nouveau contact'));
  if (!contactSheet) {
    throw new Error('FAB Contacts : sheet création contact introuvable');
  }
  console.log('✅ FAB Contacts : sheet création OK');
  await phone.back();
  await phone.wait(800);

  console.log('\nSmoke navigation mobile OK');
})().catch((err) => {
  console.error('Smoke navigation mobile KO:', err.message);
  process.exit(1);
});
