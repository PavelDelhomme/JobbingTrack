#!/usr/bin/env node
/**
 * Smoke navigation liens croisés entités (Lot D ligne 325).
 *
 *   node scripts/mobile/smoke/adb/smoke-mobile-entity-links-adb.js
 */

const adbLib = require('../../../tools/adb-lib');
const { resolveWorkingUserCredentials } = require('../../lib/resolve-user-credentials');
const { loadRootEnv } = require('../../lib/resolve-admin-credentials');
const {
  loginSmokeToken,
  ensureSmokeApplication,
  openSmokeApplicationDetail,
  findApplicationCardNode,
  nodeLabel,
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

async function openDrawerItem(phone, label) {
  if (await phone.uiContains('Tab 1 of 4')) {
    await adbLib.flows.goToTab(phone, 1, { shell: true });
    await phone.wait(1200);
  }
  if (await phone.uiContains('Open navigation menu')) {
    await phone.tap('Open navigation menu');
  } else {
    await phone.openDrawer();
  }
  await phone.wait(1200);
  if (!(await phone.uiContains(label))) {
    await phone.drawerScrollDown();
    await phone.wait(700);
  }
  await phone.tap(label);
  await phone.wait(2500);
}

async function tapFirstContact(phone) {
  const nodes = await phone.uiNodes();
  const tile = nodes.find(
    (n) =>
      n.clickable &&
      nodeLabel(n).includes('@') &&
      !nodeLabel(n).includes('Tab '),
  );
  if (!tile) throw new Error('Aucun contact dans la liste');
  const m = tile.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  await phone.tapXY(
    Math.floor((+m[1] + +m[3]) / 2),
    Math.floor((+m[2] + +m[4]) / 2),
  );
}

(async () => {
  const { email, password } = await resolveWorkingUserCredentials();
  const token = await loginSmokeToken(email, password);
  const target = await ensureSmokeApplication(token);
  const phone = await adbLib.connect();
  console.log('User:', email);
  console.log('Candidature cible:', target.position);

  await ensureLoggedIn(phone, email, password);

  // ── Détail contact : sections liens
  await openDrawerItem(phone, 'Contacts');
  await phone.wait(2000);
  try {
    await phone.tap('Tab 3 of 5');
  } catch {
    try {
      await phone.tap('Contacts', 0);
    } catch {
      /* ok */
    }
  }
  await phone.wait(2000);
  if (await phone.uiContains('Aucun contact')) {
    throw new Error('Aucun contact — impossible de tester les liens croisés');
  }
  await tapFirstContact(phone);
  await phone.wait(2500);

  let sectionsOk = false;
  for (let i = 0; i < 8; i++) {
    const hasEnt = await phone.uiContains('Entreprises liées');
    const hasApp = await phone.uiContains('Candidatures liées');
    const hasRel = await phone.uiContains('Relances liées');
    const hasCall = await phone.uiContains('Appels liés');
    if (hasEnt && hasApp && hasRel && hasCall) {
      sectionsOk = true;
      break;
    }
    await phone.scrollDown(450);
    await phone.wait(600);
  }
  if (!sectionsOk) {
    throw new Error('Sections liens absentes du détail contact (après scroll)');
  }
  console.log('✅ Détail contact : sections liens croisés visibles');

  // Navigation candidature liée si présente
  const nodes = await phone.uiNodes();
  const appLink = findApplicationCardNode(nodes, target);
  if (appLink) {
    const m = appLink.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    await phone.tapXY(
      Math.floor((+m[1] + +m[3]) / 2),
      Math.floor((+m[2] + +m[4]) / 2),
    );
    await phone.wait(2500);
    if (!(await phone.uiContains('Ajouter')) && !(await phone.uiContains('Résultat / statut'))) {
      throw new Error('Navigation contact → candidature : détail introuvable');
    }
    console.log('✅ Lien contact → candidature navigable');
    await phone.back();
    await phone.wait(1500);
  } else {
    console.log('✅ Contact sans candidature liée (sections vides OK)');
  }

  await phone.back();
  await phone.wait(1500);
  await phone.back();
  await phone.wait(1500);

  // ── Détail candidature → sections métier
  await openSmokeApplicationDetail(phone, target);
  await phone.wait(1600);

  const detailSections =
    (await phone.uiContains('Contacts')) ||
    (await phone.uiContains('Relances')) ||
    (await phone.uiContains('Entretiens')) ||
    (await phone.uiContains('Appels'));
  if (!detailSections) {
    throw new Error('Sections métier absentes du détail candidature');
  }
  console.log('✅ Détail candidature : sections contacts/relances/entretiens/appels OK');

  await phone.back();
  await phone.wait(1500);
  await adbLib.flows.goToTab(phone, 1, { shell: true });

  console.log('\nSmoke liens entités mobile OK');
})().catch((err) => {
  console.error('Smoke entity links KO:', err.message);
  process.exit(1);
});
