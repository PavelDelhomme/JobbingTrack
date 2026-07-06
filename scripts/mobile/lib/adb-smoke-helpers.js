#!/usr/bin/env node
/**
 * Helpers partagés smokes ADB — session shell réutilisée, champs labelText Flutter.
 */
require('./smoke-runtime');

const adbLib = require('../../../tools/adb-lib');
const smokeApp = require('../lib/smoke-application-target');

function nodeLabel(n) {
  return smokeApp.nodeLabel(n);
}

function boundsCenter(bounds) {
  const m = String(bounds || '').match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!m) return null;
  return {
    cx: Math.round((+m[1] + +m[3]) / 2),
    cy: Math.round((+m[2] + +m[4]) / 2),
  };
}

async function isNotificationSheetOpen(phone) {
  return (
    (await phone.uiContains('Aucune notification candidature')) ||
    (await phone.uiContains('Tout marquer lu')) ||
    (await phone.uiContains('Aucune notification'))
  );
}

/**
 * Ouvre la sheet notifications — cloche AppBar (écrans détail) ou Menu ⋮ → Notifications (accueil shell).
 */
async function openNotificationSheet(phone, { timeoutMs = 10000 } = {}) {
  const waitSheet = () =>
    phone.waitUntil(
      ({ contains }) =>
        contains('Aucune notification candidature') ||
        contains('Tout marquer lu') ||
        contains('Aucune notification'),
      { timeoutMs, pollMs: 400 },
    );

  const nodes = await phone.uiNodes();
  const directBell = nodes.find((n) => {
    if (!n.clickable || n.contentDesc !== 'Notifications') return false;
    const c = boundsCenter(n.bounds);
    return c && c.cy > 200 && c.cy < 550;
  });
  if (directBell?.bounds) {
    const c = boundsCenter(directBell.bounds);
    await phone.tapXY(c.cx, c.cy);
    await phone.wait(800);
    if (await waitSheet()) return;
  }

  if (await phone.uiContains('Menu')) {
    try {
      await phone.tap('Menu');
    } catch {
      const menuNode = (await phone.uiNodes()).find(
        (n) => n.clickable && (n.contentDesc === 'Menu' || n.text === 'Menu'),
      );
      const c = boundsCenter(menuNode?.bounds);
      if (c) await phone.tapXY(c.cx, c.cy);
    }
    await phone.wait(700);
    const menuNodes = await phone.uiNodes();
    const notifItem = menuNodes.find(
      (n) => n.text && /^Notifications(\s*\(|$)/.test(String(n.text).trim()),
    );
    if (notifItem?.bounds) {
      const c = boundsCenter(notifItem.bounds);
      await phone.tapXY(c.cx, c.cy);
    } else {
      await phone.tapReliable('Notifications');
    }
    await phone.wait(900);
    if (await waitSheet()) return;
  }

  const menu = nodes.find((n) => n.contentDesc === 'Menu');
  if (menu?.bounds) {
    const menuLeft = +menu.bounds.match(/\[(\d+),/)[1];
    const legacyBell = nodes.find((n) => {
      if (!n.clickable) return false;
      const desc = n.contentDesc || '';
      if (desc === 'Menu' || desc === 'Open navigation menu') return false;
      const m = n.bounds?.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
      if (!m) return false;
      const x2 = +m[3];
      const y1 = +m[2];
      const y2 = +m[4];
      return x2 <= menuLeft + 8 && y1 > 250 && y2 < 500;
    });
    if (legacyBell?.bounds) {
      const c = boundsCenter(legacyBell.bounds);
      await phone.tapXY(c.cx, c.cy);
      await phone.wait(800);
      if (await waitSheet()) return;
    }
  }

  throw new Error('Centre notifications non ouvert');
}

/** Connexion sans restart si le shell est déjà visible. */
async function ensureUserShell(phone, email, password) {
  return adbLib.flows.ensureAuthenticatedShell(phone, email, password);
}

async function openProfileEdit(phone) {
  await adbLib.flows.goToTab(phone, 4, { shell: true });
  await phone.wait(800);
  let opened = false;
  // Icône crayon AppBar (tooltip « Modifier ») — plus fiable que le ListTile sur émulateur
  if (await phone.uiContains('Modifier')) {
    try {
      const nodes = await phone.uiNodes();
      const editBtn = nodes.find(
        (n) =>
          n.clickable &&
          (n.contentDesc === 'Modifier' || n.text === 'Modifier') &&
          !`${n.text || ''}${n.contentDesc || ''}`.includes('profil'),
      );
      if (editBtn?.bounds) {
        const m = editBtn.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
        if (m) {
          await phone.tapXY(
            Math.round((+m[1] + +m[3]) / 2),
            Math.round((+m[2] + +m[4]) / 2),
          );
          opened = true;
        }
      }
    } catch {
      /* fallback list tile */
    }
  }
  if (!opened) {
    for (const label of ['Modifier le profil', 'Modifier', 'Edit profile']) {
      if (!(await phone.uiContains(label))) continue;
      try {
        await phone.tapReliable(label);
        opened = true;
        break;
      } catch {
        /* label suivant */
      }
    }
  }
  if (!opened) {
    throw new Error('Bouton modification profil introuvable');
  }
  const editVisible = ({ contains, nodes }) =>
    contains('Enregistrer') ||
    contains('Sauvegarder') ||
    contains('Modifier le profil') ||
    (contains('Email') && (contains('Prénom') || contains('Nom'))) ||
    nodes.some(
      (n) =>
        n.className.includes('EditText') &&
        ((n.text || '').length > 0 || (n.contentDesc || '').includes('Prénom')),
    );
  let ok = await phone.waitUntil(editVisible, { timeoutMs: 20000, pollMs: 500 });
  if (!ok) {
    await phone.scrollDown(600);
    await phone.wait(800);
    ok = await phone.waitUntil(editVisible, { timeoutMs: 12000, pollMs: 500 });
  }
  if (!ok && (await phone.uiContains('Enregistrer'))) {
    ok = true;
  }
  if (!ok) {
    throw new Error('Écran modification profil introuvable');
  }
}

async function openAppDrawer(phone) {
  const onShell =
    (await phone.uiContains('Bonjour')) ||
    (await adbLib.flows.isShellVisible(phone));
  if (onShell) {
    try {
      await adbLib.flows.goToTab(phone, 1, { shell: true });
      await phone.wait(800);
    } catch {
      /* déjà sur accueil ou onglets absents du dump émulateur */
    }
  }
  await phone.openNavigationDrawer();
  await phone.wait(1000);
}

async function typeInLabeledField(phone, label, value, opts = {}) {
  return phone.typeInLabeledField(label, value, opts);
}

/** Onglet Candidatures (Tab 1/5), pas Entreprises après navigation Profil/Paramètres. */
async function ensureApplicationsListTab(phone) {
  return smokeApp.ensureApplicationsListTab(phone);
}

async function waitApplicationsTabReady(phone, target, timeoutMs = 12000) {
  if (!target?.position) {
    throw new Error('waitApplicationsTabReady : target.position requis (nom exact poste)');
  }
  return smokeApp.waitApplicationTargetVisible(phone, target, timeoutMs);
}

async function openSmokeApplicationDetail(phone, target) {
  return smokeApp.openSmokeApplicationDetail(phone, target);
}

module.exports = {
  nodeLabel,
  boundsCenter,
  isNotificationSheetOpen,
  openNotificationSheet,
  ensureUserShell,
  openProfileEdit,
  openAppDrawer,
  typeInLabeledField,
  ensureApplicationsListTab,
  waitApplicationsTabReady,
  openSmokeApplicationDetail,
  ...smokeApp,
};
