#!/usr/bin/env node
/**
 * Smoke toggle « Mode intérim » via Paramètres (Lot D ligne 319).
 * Complète smoke-mobile-interim-home-adb.js (pref directe) en testant l'UI Paramètres.
 *
 *   node scripts/mobile/smoke/adb/smoke-mobile-settings-interim-adb.js
 */

const adbLib = require('../../../../tools/adb-lib');
const { resolveWorkingUserCredentials } = require('../../lib/resolve-user-credentials');
const { loadRootEnv } = require('../../lib/resolve-admin-credentials');

loadRootEnv();

function nodeLabel(n) {
  return `${n.text || ''}\n${n.contentDesc || ''}`.trim();
}

async function ensureLoggedIn(phone, email, password) {
  await adbLib.flows.dismissBiometricUnlock(phone, { password });
  if (await phone.uiContains('Bonjour')) return;
  await adbLib.flows.loginFresh(phone, email, password);
  await phone.assertVisible('Bonjour');
}

async function openSettings(phone) {
  await adbLib.flows.goToTab(phone, 4, { shell: true });
  await phone.wait(1500);
  if (!(await phone.uiContains('Paramètres'))) {
    await phone.scrollDown(500);
    await phone.wait(600);
  }
  try {
    await phone.tap('Paramètres');
  } catch {
    await phone.tap('confidentialité');
  }
  await phone.wait(2000);
}

async function scrollToInterimSwitch(phone) {
  for (let i = 0; i < 10; i++) {
    if (await phone.uiContains('Mode intérim')) return true;
    await phone.scrollDown(450);
    await phone.wait(600);
  }
  return phone.uiContains('Mode intérim');
}

async function tapInterimSwitch(phone) {
  try {
    await phone.tap('couleurs ambre');
  } catch {
    try {
      await phone.tap('Mode intérim');
    } catch {
      const nodes = await phone.uiNodes();
      const title = nodes.find((n) => {
        if (!nodeLabel(n).includes('Mode intérim')) return false;
        const m = n.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
        if (!m) return false;
        const y1 = +m[2];
        return y1 > 500 && y1 < 1700;
      });
      if (!title) throw new Error('Ligne « Mode intérim » introuvable');
      const m = title.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
      const rowY1 = +m[2];
      const rowY2 = +m[4];
      const rowX2 = +m[3];
      await phone.tapXY(Math.min(rowX2 - 48, 980), Math.floor((rowY1 + rowY2) / 2));
    }
  }
  await phone.wait(1200);
}

async function openAppDrawer(phone) {
  if (await phone.uiContains('Open navigation menu')) {
    await phone.tap('Open navigation menu');
  } else {
    await phone.openDrawer();
  }
  await phone.wait(1200);
}

async function drawerHasInterim(phone) {
  await openAppDrawer(phone);
  await phone.wait(800);
  let found = await phone.uiContains('Intérim');
  if (!found) {
    await phone.drawerScrollDown();
    await phone.wait(700);
    found = await phone.uiContains('Intérim');
  }
  await phone.back();
  await phone.wait(500);
  return found;
}

(async () => {
  const { email, password } = await resolveWorkingUserCredentials();
  const phone = await adbLib.connect();
  console.log('Device:', phone.device);
  console.log('User:', email);

  await ensureLoggedIn(phone, email, password);

  // Partir du mode intérim désactivé (pref) puis activer via Paramètres.
  await adbLib.flows.setInterimModeForSmoke(phone, false);
  await adbLib.flows.restartApp(phone);
  await phone.wait(3000);
  await adbLib.flows.dismissBiometricUnlock(phone, { password });
  if (!(await phone.uiContains('Bonjour'))) {
    await adbLib.flows.login(phone, email, password);
    await adbLib.flows.dismissBiometricUnlock(phone, { password });
  }
  await phone.assertVisible('Bonjour');

  await openSettings(phone);
  if (!(await scrollToInterimSwitch(phone))) {
    throw new Error('Switch « Mode intérim » introuvable dans Paramètres');
  }
  console.log('✅ Paramètres : ligne Mode intérim visible');

  await tapInterimSwitch(phone);
  await phone.back();
  await phone.wait(1500);
  await adbLib.flows.goToTab(phone, 1, { shell: true });
  await phone.wait(1500);

  if (!(await drawerHasInterim(phone))) {
    throw new Error('Menu Intérim absent après activation via Paramètres');
  }
  console.log('✅ Paramètres : toggle ON → menu Intérim visible');

  await openSettings(phone);
  if (!(await scrollToInterimSwitch(phone))) {
    throw new Error('Retour Paramètres : Mode intérim introuvable');
  }
  await tapInterimSwitch(phone);
  await phone.back();
  await phone.wait(1500);
  await adbLib.flows.goToTab(phone, 1, { shell: true });
  await phone.wait(1500);

  if (await drawerHasInterim(phone)) {
    throw new Error('Menu Intérim encore visible après désactivation via Paramètres');
  }
  console.log('✅ Paramètres : toggle OFF → menu Intérim masqué');

  // Réactiver pour les smokes suivants + calendrier
  await openSettings(phone);
  await scrollToInterimSwitch(phone);
  await tapInterimSwitch(phone);
  await phone.back();
  await phone.wait(1000);

  await adbLib.flows.goToTab(phone, 3, { shell: true });
  await phone.wait(2000);
  const calendarOk =
    (await phone.uiContains('Calendrier')) ||
    (await phone.uiContains('Événements')) ||
    (await phone.uiContains('Aucun événement')) ||
    (await phone.uiContains('événement'));
  if (!calendarOk) {
    throw new Error('Onglet Calendrier introuvable en mode intérim');
  }
  console.log(
    '✅ Calendrier : écran chargé en mode intérim (couleur ambre = code isInterim events_screen.dart)',
  );

  await adbLib.flows.goToTab(phone, 1, { shell: true });
  await phone.wait(1500);

  console.log('\nSmoke Paramètres mode intérim OK');
})().catch((err) => {
  console.error('Smoke settings interim mobile KO:', err.message);
  process.exit(1);
});
