#!/usr/bin/env node
/**
 * Smoke popup nouvelle candidature + statuts FR (Lot D lignes 326/327).
 *
 *   node scripts/mobile/smoke/adb/smoke-mobile-application-sheet-adb.js
 */

const adbLib = require('../../../../tools/adb-lib');
const { resolveWorkingUserCredentials } = require('../../lib/resolve-user-credentials');
const { loadRootEnv } = require('../../lib/resolve-admin-credentials');
const {
  loginSmokeToken,
  ensureSmokeApplication,
  openSmokeApplicationDetail,
} = require('../../lib/smoke-application-target');

loadRootEnv();

async function ensureLoggedIn(phone, email, password) {
  await adbLib.flows.dismissBiometricUnlock(phone, { password });
  if (
    (await phone.uiContains('Bonjour')) ||
    (await phone.uiContains('Tab 1 of 4'))
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

async function openCreateSheetFromHome(phone) {
  await adbLib.flows.goToTab(phone, 1, { shell: true });
  await phone.wait(2000);
  try {
    await phone.tap('Nouvelle candidature');
  } catch {
    const info = await phone.screenInfo();
    const w = info.width || 1080;
    const h = info.height || 2340;
    await phone.tapXY(w - 56, h - 56 - 120);
  }
  await phone.wait(2500);
}

(async () => {
  const { email, password } = await resolveWorkingUserCredentials();
  const token = await loginSmokeToken(email, password);
  const target = await ensureSmokeApplication(token);
  const phone = await adbLib.connect();
  console.log('User:', email);
  console.log('Candidature cible:', target.position);

  await ensureLoggedIn(phone, email, password);

  // ── Accueil : FAB / bouton → bottom sheet (pas page pleine)
  await openCreateSheetFromHome(phone);
  const sheetOk =
    (await phone.uiContains('Nouvelle candidature')) &&
    ((await phone.uiContains('Créer')) || (await phone.uiContains('Entreprise')));
  if (!sheetOk) {
    throw new Error('Bottom sheet nouvelle candidature introuvable');
  }
  console.log('✅ Accueil : popup « Nouvelle candidature » OK');
  await phone.back();
  await phone.wait(1500);

  // ── Liste : libellés statut en français
  await adbLib.flows.goToTab(phone, 2, { shell: true });
  await phone.wait(2000);
  try {
    await phone.tap('Tab 1 of 5');
  } catch {
    try {
      await phone.tap('Candidatures', 0);
    } catch {
      /* ok */
    }
  }
  await phone.wait(2000);
  const frStatus =
    (await phone.uiContains(target.position)) &&
    ((await phone.uiContains('Candidaté et en attente')) ||
      (await phone.uiContains('En attente')) ||
      (await phone.uiContains('Relancé')) ||
      (await phone.uiContains('Refusée')) ||
      (await phone.uiContains('Retenue')));
  if (!frStatus) {
    throw new Error(
      `Libellé statut FR introuvable sur la carte « ${target.position} »`,
    );
  }
  console.log('✅ Candidatures : statut affiché en français');

  // ── Détail : picker « Résultat / statut »
  await openSmokeApplicationDetail(phone, target);
  if (!(await phone.uiContains('Résultat / statut'))) {
    throw new Error('Bouton « Résultat / statut » introuvable');
  }
  await phone.tap('Résultat / statut');
  await phone.wait(2000);
  const pickerFr =
    (await phone.uiContains('Refusée')) ||
    (await phone.uiContains('Retenue')) ||
    (await phone.uiContains('Offre')) ||
    (await phone.uiContains('Choisir un statut'));
  if (!pickerFr) {
    throw new Error('Picker statut FR introuvable');
  }
  console.log('✅ Détail : picker statut français OK');
  await phone.back();
  await phone.wait(1000);
  await phone.back();
  await phone.wait(1500);

  await adbLib.flows.goToTab(phone, 1, { shell: true });
  console.log('\nSmoke popup candidature + statuts FR OK');
})().catch((err) => {
  console.error('Smoke application sheet KO:', err.message);
  process.exit(1);
});
