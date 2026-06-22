#!/usr/bin/env node
/**
 * Smoke parcours live appareil (Lot D ligne 322) — sans création destructive.
 *
 *   node scripts/mobile/smoke-mobile-live-journey-adb.js
 */

const adbLib = require('../../tools/adb-lib');
const {
  ensureApplicationsListTab,
  waitApplicationsTabReady,
  ensureUserShell,
} = require('./adb-smoke-helpers');
const { resolveWorkingUserCredentials } = require('./resolve-user-credentials');
const { loadRootEnv } = require('./resolve-admin-credentials');

loadRootEnv();

async function ensureLoggedIn(phone, email, password) {
  await ensureUserShell(phone, email, password);
  await phone.assertVisible('Bonjour');
}

async function openSettings(phone) {
  await adbLib.flows.goToTab(phone, 4, { shell: true });
  try {
    await phone.tap('Paramètres');
  } catch {
    await phone.tap('confidentialité');
  }
  await phone.wait(900);
}

(async () => {
  const { email, password } = await resolveWorkingUserCredentials();
  const phone = await adbLib.connect();
  console.log('User:', email);

  await ensureLoggedIn(phone, email, password);

  // ── Accueil : sheet nouvelle candidature + champ entreprise
  await adbLib.flows.goToTab(phone, 1, { shell: true });
  try {
    await phone.tap('Nouvelle candidature');
  } catch {
    const info = await phone.screenInfo();
    await phone.tapXY((info.width || 1080) - 56, (info.height || 2340) - 170);
  }
  await phone.wait(900);
  const formSnap = await phone.uiSnapshot();
  const formOk =
    formSnap.contains('Nouvelle candidature') &&
    (formSnap.contains('Choisir ou créer une entreprise') ||
      formSnap.contains('Entreprise') ||
      formSnap.contains('Poste'));
  if (!formOk) {
    throw new Error('Sheet nouvelle candidature / champ entreprise introuvable');
  }
  console.log('✅ Parcours : popup candidature + entreprise OK');
  await phone.back();
  await phone.wait(600);

  // ── Calendrier
  await adbLib.flows.goToTab(phone, 3, { shell: true });
  const calSnap = await phone.uiSnapshot();
  const calOk =
    calSnap.contains('Événements') ||
    calSnap.contains('Aucun événement') ||
    calSnap.contains('événement');
  if (!calOk) {
    throw new Error('Onglet Calendrier introuvable');
  }
  console.log('✅ Parcours : calendrier OK');

  // ── Paramètres → Aide retours
  await openSettings(phone);
  const bugVisible = await phone.waitUntil(({ contains }) => {
    if (contains('Signaler un bug')) return true;
    return null;
  }, { timeoutMs: 8000, pollMs: 400 });
  if (!bugVisible) {
    for (let i = 0; i < 6; i++) {
      await phone.scrollDown(450);
      if ((await phone.uiSnapshot(true)).contains('Signaler un bug')) break;
    }
  }
  if (!(await phone.uiContains('Signaler un bug'))) {
    throw new Error('Paramètres : entrée Aide/retours introuvable');
  }
  await phone.tap('Signaler un bug');
  await phone.wait(900);
  const feedbackSnap = await phone.uiSnapshot();
  const feedbackOk =
    feedbackSnap.contains('Envoyer') ||
    feedbackSnap.contains('Description') ||
    feedbackSnap.contains('bug');
  if (!feedbackOk) {
    throw new Error('Formulaire retour bug introuvable');
  }
  console.log('✅ Parcours : Paramètres → retour bug OK');
  await phone.back();
  await phone.wait(600);
  await phone.back();
  await phone.wait(600);

  // ── Candidatures liste
  await ensureApplicationsListTab(phone);
  const listState = await waitApplicationsTabReady(phone);
  if (listState === 'error') {
    throw new Error('Liste candidatures : erreur chargement');
  }
  if (listState === 'timeout') {
    throw new Error('Liste candidatures : état introuvable');
  }
  console.log('✅ Parcours : liste candidatures OK');

  await adbLib.flows.goToTab(phone, 1, { shell: true });
  console.log('\nSmoke parcours live appareil OK');
})().catch((err) => {
  console.error('Smoke live journey KO:', err.message);
  process.exit(1);
});
