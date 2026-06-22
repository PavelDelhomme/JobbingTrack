#!/usr/bin/env node
/**
 * Smoke navigation entretien → candidature (Lot D ligne 325).
 *
 *   node scripts/mobile/smoke-mobile-interview-nav-adb.js
 */

const adbLib = require('../../tools/adb-lib');
const { resolveWorkingUserCredentials } = require('./resolve-user-credentials');
const { loadRootEnv } = require('./resolve-admin-credentials');

loadRootEnv();

function nodeLabel(n) {
  return `${n.text || ''}\n${n.contentDesc || ''}`.trim();
}

async function ensureLoggedIn(phone, email, password) {
  await adbLib.flows.dismissBiometricUnlock(phone, { password });
  if (
    (await phone.uiContains('Bonjour')) ||
    (await phone.uiContains('Tab 1 of 4')) ||
    (await phone.uiContains('Open navigation menu'))
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

async function openDrawerEntretiens(phone) {
  await adbLib.flows.goToTab(phone, 1, { shell: true });
  await phone.wait(1200);
  if (await phone.uiContains('Open navigation menu')) {
    await phone.tap('Open navigation menu');
  } else {
    await phone.openDrawer();
  }
  await phone.wait(1200);
  if (!(await phone.uiContains('Entretiens'))) {
    await phone.drawerScrollDown();
    await phone.wait(700);
  }
  await phone.tap('Entretiens');
  await phone.wait(2500);
}

(async () => {
  const { email, password } = await resolveWorkingUserCredentials();
  const phone = await adbLib.connect();
  console.log('User:', email);

  await ensureLoggedIn(phone, email, password);
  await openDrawerEntretiens(phone);

  if (await phone.uiContains('Aucun entretien')) {
    throw new Error('Aucun entretien — données insuffisantes pour test navigation');
  }

  const nodes = await phone.uiNodes();
  const tile = nodes.find(
    (n) =>
      n.clickable &&
      nodeLabel(n).length > 6 &&
      !nodeLabel(n).includes('Tab ') &&
      !nodeLabel(n).includes('Entretiens') &&
      !nodeLabel(n).includes('Open navigation') &&
      (nodeLabel(n).includes('Entretien') ||
        nodeLabel(n).includes('Présentiel') ||
        /\d/.test(nodeLabel(n))),
  );
  if (tile) {
    const m = tile.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    await phone.tapXY(
      Math.floor((+m[1] + +m[3]) / 2),
      Math.floor((+m[2] + +m[4]) / 2),
    );
  } else {
    await phone.tapXY(540, 900);
  }
  await phone.wait(2500);

  if (!(await phone.uiContains('Candidature liée'))) {
    for (let i = 0; i < 5; i++) {
      await phone.scrollDown(400);
      await phone.wait(600);
      if (await phone.uiContains('Candidature liée')) break;
    }
  }
  if (!(await phone.uiContains('Candidature liée'))) {
    throw new Error('Détail entretien : section « Candidature liée » introuvable');
  }

  const nodesAfter = await phone.uiNodes();
  const headerIdx = nodesAfter.findIndex((n) =>
    nodeLabel(n).includes('Candidature liée'),
  );
  let linkTile = null;
  if (headerIdx >= 0) {
    const hm = nodesAfter[headerIdx].bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    const headerY2 = hm ? +hm[4] : 0;
    linkTile = nodesAfter.find((n) => {
      if (!n.clickable) return false;
      const label = nodeLabel(n);
      if (
        label.includes('Candidature liée') ||
        label.includes('Entreprise') ||
        label.includes('Contact') ||
        label.includes('Modifier') ||
        label.includes('Back')
      ) {
        return false;
      }
      const bm = n.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
      if (!bm) return false;
      return +bm[2] >= headerY2 - 2 && +bm[2] < headerY2 + 320;
    });
  }
  if (linkTile) {
    const m = linkTile.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    await phone.tapXY(
      Math.floor((+m[1] + +m[3]) / 2),
      Math.floor((+m[2] + +m[4]) / 2),
    );
  } else {
    await phone.tapXY(540, 820);
  }
  await phone.wait(2500);

  const onAppDetail =
    (await phone.uiContains('Ajouter')) ||
    (await phone.uiContains('Résultat / statut')) ||
    (await phone.uiContains('Changer statut'));
  if (!onAppDetail) {
    throw new Error('Navigation entretien → candidature : détail introuvable');
  }
  console.log('✅ Entretien → candidature : navigation OK');

  await phone.back();
  await phone.wait(1500);
  await phone.back();
  await phone.wait(1500);
  await adbLib.flows.goToTab(phone, 1, { shell: true });

  console.log('\nSmoke navigation entretien → candidature OK');
})().catch((err) => {
  console.error('Smoke interview nav KO:', err.message);
  process.exit(1);
});
