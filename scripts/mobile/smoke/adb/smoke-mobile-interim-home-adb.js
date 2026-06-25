#!/usr/bin/env node
/**
 * Smoke intérim, notifications, accueil « À venir », entretiens (Lot D lignes 319/321).
 * Bypass biométrique — sans intervention sur l'appareil.
 *
 *   node scripts/mobile/smoke/adb/smoke-mobile-interim-home-adb.js
 */

const adbLib = require('../../../tools/adb-lib');
const { resolveWorkingUserCredentials } = require('../../lib/resolve-user-credentials');
const { loadRootEnv } = require('../../lib/resolve-admin-credentials');

loadRootEnv();

async function ensureLoggedIn(phone, email, password) {
  await adbLib.flows.dismissBiometricUnlock(phone, { password });
  await adbLib.flows.restartApp(phone);
  await phone.wait(3000);
  if (!(await phone.uiContains('Bonjour'))) {
    if (
      (await phone.uiContains('Email')) ||
      (await phone.uiContains('Mot de passe')) ||
      (await phone.uiContains('Se connecter'))
    ) {
      await adbLib.flows.login(phone, email, password);
    } else {
      await adbLib.flows.loginFresh(phone, email, password);
    }
  }
  await adbLib.flows.dismissBiometricUnlock(phone, { password });
  await phone.assertVisible('Bonjour');
}

async function openAppDrawer(phone) {
  if (await phone.uiContains('Open navigation menu')) {
    await phone.tap('Open navigation menu');
  } else {
    await phone.openDrawer();
  }
  await phone.wait(1200);
}

async function openDrawerItemWithScroll(phone, label) {
  await openAppDrawer(phone);
  if (!(await phone.uiContains(label))) {
    await phone.drawerScrollDown();
    await phone.wait(700);
  }
  if (!(await phone.uiContains(label)) && label === 'Intérim') {
    await phone.back();
    await phone.wait(400);
    await openAppDrawer(phone);
  }
  await phone.tap(label);
  await phone.wait(2500);
}

async function tapNotificationBell(phone) {
  const nodes = await phone.uiNodes();
  const menu = nodes.find((n) => n.contentDesc === 'Menu');
  if (menu) {
    const menuLeft = +menu.bounds.match(/\[(\d+),/)[1];
    const bell = nodes.find((n) => {
      if (!n.clickable) return false;
      const desc = n.contentDesc || '';
      if (desc === 'Menu' || desc === 'Open navigation menu') return false;
      const m = n.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
      if (!m) return false;
      const y1 = +m[2];
      const y2 = +m[4];
      const x2 = +m[3];
      return x2 <= menuLeft + 5 && y1 > 250 && y2 < 500;
    });
    if (bell) {
      const m = bell.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
      await phone.tapXY(Math.floor((+m[1] + +m[3]) / 2), Math.floor((+m[2] + +m[4]) / 2));
      if (await phone.waitFor('Notifications', 8000, 1000)) return;
    }
  }
  if (await phone.uiContains('Notifications')) {
    await phone.tap('Notifications');
    if (await phone.waitFor('Notifications', 8000, 1000)) return;
  }
  throw new Error('Icône notifications introuvable');
}

async function enableInterimMode(phone, email, password) {
  await adbLib.flows.setInterimModeForSmoke(phone, true);
  await adbLib.flows.restartApp(phone);
  await phone.wait(3000);
  if (
    (await phone.uiContains('Déverrouiller')) ||
    (await phone.uiContains('Mot de passe JobbingTrack')) ||
    (await phone.uiContains('Connexion par empreinte'))
  ) {
    await adbLib.flows.dismissBiometricUnlock(phone, { password });
  }
  if (!(await phone.uiContains('Tab 1 of 4'))) {
    if (
      (await phone.uiContains('Email')) ||
      (await phone.uiContains('Mot de passe')) ||
      (await phone.uiContains('Se connecter'))
    ) {
      await adbLib.flows.login(phone, email, password);
    } else if (!(await phone.uiContains('Bonjour'))) {
      await adbLib.flows.loginFresh(phone, email, password);
    }
    await adbLib.flows.dismissBiometricUnlock(phone, { password });
  }
  if (!(await phone.uiContains('Tab 1 of 4'))) {
    throw new Error('Shell introuvable après activation mode intérim');
  }
  if (!(await drawerHasInterimFromProfile(phone))) {
    throw new Error('Menu Intérim introuvable après activation du mode intérim');
  }
}

async function drawerHasInterimFromProfile(phone) {
  await adbLib.flows.goToTab(phone, 1, { shell: true });
  await phone.wait(2000);
  for (let attempt = 0; attempt < 3; attempt++) {
    await openAppDrawer(phone);
    await phone.wait(1500);
    if (await phone.uiContains('Intérim')) {
      await phone.back();
      await phone.wait(500);
      return true;
    }
    await phone.drawerScrollDown();
    await phone.wait(800);
    if (await phone.uiContains('Intérim')) {
      await phone.back();
      await phone.wait(500);
      return true;
    }
    await phone.back();
    await phone.wait(600);
  }
  return false;
}

(async () => {
  const { email, password } = await resolveWorkingUserCredentials();
  const phone = await adbLib.connect();
  console.log('Device:', phone.device);
  console.log('User:', email);

  await ensureLoggedIn(phone, email, password);

  // ── Accueil : dashboard (+ bloc « À venir » si données)
  await adbLib.flows.goToTab(phone, 1, { shell: true });
  await phone.wait(2000);
  await phone.assertVisible('Bonjour');
  let homeOk = false;
  for (let i = 0; i < 8; i++) {
    homeOk =
      (await phone.uiContains('Vue d')) ||
      (await phone.uiContains('Gérez vos candidatures')) ||
      (await phone.uiContains('Candidatures')) ||
      (await phone.uiContains('Actions rapides'));
    if (homeOk) break;
    await phone.scrollDown(500);
    await phone.wait(1500);
  }
  if (!homeOk) {
    throw new Error('Dashboard accueil introuvable (Vue d\'ensemble / stats)');
  }
  if (await phone.uiContains('À venir')) {
    console.log('✅ Accueil : bloc « À venir » visible');
  } else {
    console.log('✅ Accueil : Vue d\'ensemble OK (bloc « À venir » masqué si aucun événement)');
  }

  // ── Notifications : cloche → sheet
  await tapNotificationBell(phone);
  await phone.wait(2500);
  await phone.assertVisible('Notifications');
  const notifState =
    (await phone.uiContains('Aucune notification')) ||
    (await phone.uiContains('notification')) ||
    (await phone.uiContains('Tout marquer lu'));
  if (!notifState) {
    throw new Error('Sheet notifications : état vide/chargé introuvable');
  }
  if (await phone.uiContains('Tout marquer lu')) {
    await phone.tap('Tout marquer lu');
    await phone.wait(2000);
    console.log('✅ Notifications : « Tout marquer lu » actionné');
  } else {
    console.log('✅ Notifications : sheet ouverte (aucun non-lu)');
  }
  await phone.back();
  await phone.wait(1500);

  // ── Entretiens (sous-onglet Candidatures via drawer)
  await openDrawerItemWithScroll(phone, 'Entretiens');
  const onInterviewsTab =
    (await phone.uiContains('Entretiens')) &&
    ((await phone.uiContains('Aucun entretien')) ||
      (await phone.uiContains('entretien')) ||
      (await phone.uiContains('Tab 4 of 5')));
  if (!onInterviewsTab) {
    throw new Error('Sous-onglet Entretiens introuvable');
  }
  console.log('✅ Entretiens : sous-onglet Candidatures OK');

  // ── Relances : sections À venir / Terminées (drawer → shell)
  await openDrawerItemWithScroll(phone, 'Relances');
  const relancesOk =
    (await phone.uiContains('Relances')) ||
    (await phone.uiContains('Aucune relance')) ||
    (await phone.uiContains('venir')) ||
    (await phone.uiContains('Terminées'));
  if (!relancesOk) {
    throw new Error('Sous-onglet Relances introuvable');
  }
  console.log('✅ Relances : sous-onglet avec libellés à venir/terminées OK');
  await adbLib.flows.goToTab(phone, 1, { shell: true });
  await phone.wait(1500);

  // ── Mode intérim : pref (switch Material non fiable ADB) → drawer → formulaire
  await enableInterimMode(phone, email, password);

  await openDrawerItemWithScroll(phone, 'Intérim');
  await phone.assertVisible('Suivi intérim');
  console.log('✅ Intérim : menu drawer + écran Suivi intérim OK');
  await phone.back();
  await phone.wait(1500);

  await adbLib.flows.goToTab(phone, 1, { shell: true });
  await phone.wait(1500);
  try {
    await phone.tap('Nouvelle candidature');
  } catch {
    const fab = await phone.findElement('Nouvelle candidature');
    if (!fab) throw new Error('FAB nouvelle candidature introuvable');
    const m = fab.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    const cx = Math.floor((+m[1] + +m[3]) / 2);
    const cy = Math.floor((+m[2] + +m[4]) / 2);
    await phone.tapXY(cx, cy);
  }
  await phone.wait(2500);
  const interimField =
    (await phone.uiContains("Boîte d'intérim")) ||
    (await phone.uiContains('intérim'));
  if (!interimField) {
    await phone.scrollDown(600);
    await phone.wait(600);
  }
  if (
    !(await phone.uiContains("Boîte d'intérim")) &&
    !(await phone.uiContains('intérim'))
  ) {
    throw new Error('Champ « Boîte d\'intérim » introuvable sur nouvelle candidature');
  }
  console.log('✅ Intérim : champ agence sur nouvelle candidature OK');
  await phone.back();
  await phone.wait(1500);

  console.log('\nSmoke intérim + accueil + notifications + entretiens OK');
})().catch((err) => {
  console.error('Smoke intérim/home mobile KO:', err.message);
  process.exit(1);
});
