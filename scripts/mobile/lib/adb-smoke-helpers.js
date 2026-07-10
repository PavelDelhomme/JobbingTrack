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

async function closeDrawerIfOpen(phone) {
  if (
    (await phone.uiContains('Recherche globale')) &&
    (await phone.uiContains('Entreprises')) &&
    !(await phone.uiContains('Bonjour'))
  ) {
    await phone.back();
    await phone.wait(700);
  }
}

async function ensureHomeTab(phone) {
  await closeDrawerIfOpen(phone);
  await adbLib.flows.goToTab(phone, 1, { shell: true });
  await phone.wait(800);
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
  await closeDrawerIfOpen(phone);

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
    const menuCandidates = (await phone.uiNodes())
      .filter((n) => n.clickable && (n.contentDesc === 'Menu' || n.text === 'Menu'))
      .map((n) => ({ n, c: boundsCenter(n.bounds) }))
      .filter((x) => x.c && x.c.cy > 140 && x.c.cy < 400)
      .sort((a, b) => b.c.cx - a.c.cx);
    const menuBtn = menuCandidates[0];
    if (menuBtn?.c) {
      await phone.tapXY(menuBtn.c.cx, menuBtn.c.cy);
    } else {
      try {
        await phone.tap('Menu');
      } catch {
        throw new Error('Bouton menu AppBar introuvable');
      }
    }
    await phone.wait(900);
    const popupNodes = await phone.uiNodes();
    const notifItem = popupNodes.find((n) => {
      const label = `${n.text || ''} ${n.contentDesc || ''}`.trim();
      if (!label) return false;
      if (/^menu$/i.test(label.trim())) return false;
      return /notifications/i.test(label);
    });
    if (notifItem?.bounds) {
      const c = boundsCenter(notifItem.bounds);
      await phone.tapXY(c.cx, c.cy);
    } else {
      const popupMenuBtn = popupNodes
        .filter((n) => n.clickable && n.contentDesc === 'Menu')
        .map((n) => ({ n, c: boundsCenter(n.bounds) }))
        .filter((x) => x.c)
        .sort((a, b) => b.c.cx - a.c.cx)[0];
      const mc = popupMenuBtn?.c;
      if (mc) {
        await phone.tapXY(mc.cx, Math.min(mc.cy + 140, 420));
      } else {
        throw new Error('Entrée Notifications introuvable dans le menu');
      }
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
  await closeDrawerIfOpen(phone);
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
  const nodes = await phone.uiNodes();
  const drawerBtn = nodes
    .filter((n) => {
      if (!n.clickable) return false;
      const d = (n.contentDesc || '').toLowerCase();
      return d.includes('navigation menu') || d.includes('menu de navigation');
    })
    .map((n) => ({ n, c: boundsCenter(n.bounds) }))
    .filter((x) => x.c && x.c.cx < 220)
    .sort((a, b) => a.c.cx - b.c.cx)[0];
  if (drawerBtn?.c) {
    await phone.tapXY(drawerBtn.c.cx, drawerBtn.c.cy);
  } else {
    await phone.openNavigationDrawer();
  }
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

/** FAB Accueil (tooltip Ajouter) → sheet → action (ex. Nouvelle candidature). */
async function tapHomeFabQuickCreate(phone, sheetItemLabel = 'Nouvelle candidature') {
  await ensureHomeTab(phone);
  await phone.wait(800);
  let opened = false;
  for (const label of ['Ajouter', 'Add']) {
    if (await phone.uiContains(label)) {
      try {
        await phone.tap(label);
        opened = true;
        break;
      } catch {
        /* essai FAB coordonnées */
      }
    }
  }
  if (!opened) {
    const sizeOut = await phone.shellCommand('wm size');
    const wm = String(sizeOut).match(/(\d+)x(\d+)/);
    const w = wm ? parseInt(wm[1], 10) : 1080;
    const h = wm ? parseInt(wm[2], 10) : 2340;
    await phone.tapXY(w - 90, h - 180);
    opened = true;
  }
  await phone.wait(2000);
  if (!(await phone.uiContains(sheetItemLabel))) {
    throw new Error(`Sheet quick-create : « ${sheetItemLabel} » introuvable après FAB Ajouter`);
  }
  await phone.tapReliable(sheetItemLabel);
  await phone.wait(2500);
}

async function waitForAdminShell(phone, adminPassword, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    await adbLib.flows.dismissBiometricUnlock(phone, { password: adminPassword });
    if (await phone.uiContains('Bonjour')) return;
    if (await phone.uiContains('Connexion ADMIN')) {
      await phone.tap('Connexion ADMIN');
      await phone.wait(4500);
      continue;
    }
    await phone.wait(1500);
  }
  await phone.assertVisible('Bonjour');
}

async function waitForUserShell(phone, userPassword, maxAttempts = 12) {
  for (let i = 0; i < maxAttempts; i++) {
    await adbLib.flows.dismissBiometricUnlock(phone, { password: userPassword });
    if (await adbLib.flows.isShellVisible(phone)) {
      if (await phone.uiContains('Bonjour')) return;
    }
    if (await phone.uiContains('Connexion USER')) {
      await phone.tap('Connexion USER');
      await phone.wait(4500);
      continue;
    }
    if (await phone.uiContains('Bonjour')) return;
    await phone.wait(1500);
  }
  if (await phone.uiContains('Bonjour')) return;
  throw new Error('Shell USER introuvable après restauration session');
}

/** Attente liste entreprises (drawer /companies ou sous-onglet shell Candidatures). */
async function waitForCompaniesListReady(phone, companyNameHint = '', timeoutMs = 45000) {
  const prefix = String(companyNameHint || '').slice(0, 14);
  const markers = [
    'Aucune entreprise',
    'Rechercher une entreprise',
    'Rechercher',
    'Nouvelle entreprise',
    'Réessayer',
    prefix,
    'SmokeCo',
  ].filter(Boolean);
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    for (const m of markers) {
      if (await phone.uiContains(m)) return true;
    }
    const nodes = await phone.uiNodes();
    const tile = nodes.find((n) => {
      if (!n.clickable) return false;
      const label = nodeLabel(n);
      if (label.includes('Tab ') || label.includes('Notifications') || label === 'Menu') {
        return false;
      }
      if (prefix && label.includes(prefix)) return true;
      if (label.includes('SmokeCo')) return true;
      return (
        label.length > 4 &&
        !label.includes('Entreprises') &&
        !label.includes('Candidatures') &&
        (label.includes('.com') || label.includes('http') || /^[A-Z]/.test(label.split('\n')[0]))
      );
    });
    if (tile) return true;
    if (await phone.uiContains('Entreprises')) {
      await phone.scrollDown(500);
    }
    await phone.wait(900);
  }
  return false;
}

module.exports = {
  nodeLabel,
  boundsCenter,
  closeDrawerIfOpen,
  ensureHomeTab,
  isNotificationSheetOpen,
  openNotificationSheet,
  ensureUserShell,
  openProfileEdit,
  openAppDrawer,
  typeInLabeledField,
  ensureApplicationsListTab,
  waitApplicationsTabReady,
  openSmokeApplicationDetail,
  tapHomeFabQuickCreate,
  waitForAdminShell,
  waitForUserShell,
  waitForCompaniesListReady,
  ...smokeApp,
};
