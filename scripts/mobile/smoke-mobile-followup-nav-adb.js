#!/usr/bin/env node
/**
 * Smoke navigation relance → candidature (Lot D ligne 325).
 *
 *   node scripts/mobile/smoke-mobile-followup-nav-adb.js
 */

const adbLib = require('../../tools/adb-lib');
const { resolveWorkingUserCredentials } = require('./resolve-user-credentials');
const { loadRootEnv } = require('./resolve-admin-credentials');
const {
  loginSmokeToken,
  ensureSmokeApplication,
  nodeLabel,
} = require('./smoke-application-target');

loadRootEnv();

async function isInApp(phone) {
  return (
    (await phone.uiContains('Bonjour')) ||
    (await phone.uiContains('Tab 1 of 4')) ||
    (await phone.uiContains('Open navigation menu')) ||
    ((await phone.uiContains('Relance')) && (await phone.uiContains('Candidature liée')))
  );
}

async function ensureLoggedIn(phone, email, password) {
  await adbLib.flows.dismissBiometricUnlock(phone, { password });
  if (await isInApp(phone)) return;
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
  if (!(await isInApp(phone))) {
    await phone.assertVisible('Bonjour');
  }
}

async function openFirstFollowupDetail(phone, target) {
  await openDrawerRelances(phone);
  if (await phone.uiContains('Aucune relance')) {
    throw new Error('Aucune relance — lancer smoke FAB relance ou parcours API avant');
  }
  const nodes = await phone.uiNodes();
  const relanceTile = nodes.find(
    (n) =>
      n.clickable &&
      nodeLabel(n).length > 8 &&
      !nodeLabel(n).includes('Tab ') &&
      !nodeLabel(n).includes('Relances') &&
      !nodeLabel(n).includes('Open navigation') &&
      (nodeLabel(n).includes(target.position) ||
        nodeLabel(n).includes('Email') ||
        nodeLabel(n).includes('Canal') ||
        nodeLabel(n).includes('relance')),
  );
  if (!relanceTile) {
    await phone.tapXY(540, 900);
  } else {
    const m = relanceTile.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    await phone.tapXY(
      Math.floor((+m[1] + +m[3]) / 2),
      Math.floor((+m[2] + +m[4]) / 2),
    );
  }
  await phone.wait(2500);
}

async function openDrawerRelances(phone) {
  await adbLib.flows.goToTab(phone, 1, { shell: true });
  await phone.wait(1200);
  if (await phone.uiContains('Open navigation menu')) {
    await phone.tap('Open navigation menu');
  } else {
    await phone.openDrawer();
  }
  await phone.wait(1200);
  if (!(await phone.uiContains('Relances'))) {
    await phone.drawerScrollDown();
    await phone.wait(700);
  }
  await phone.tap('Relances');
  await phone.wait(2500);
}

(async () => {
  const { email, password } = await resolveWorkingUserCredentials();
  const token = await loginSmokeToken(email, password);
  const target = await ensureSmokeApplication(token);
  const phone = await adbLib.connect();
  console.log('User:', email);
  console.log('Candidature cible:', target.position, '→', target.companyName);

  await ensureLoggedIn(phone, email, password);

  const onFollowupDetail =
    (await phone.uiContains('Candidature liée')) &&
    ((await phone.uiContains('Type')) || (await phone.uiContains('Notes')));
  if (!onFollowupDetail) {
    await openFirstFollowupDetail(phone, target);
  } else {
    console.log('✅ Déjà sur détail relance');
  }

  if (!(await phone.uiContains('Candidature liée'))) {
    for (let i = 0; i < 5; i++) {
      await phone.scrollDown(400);
      await phone.wait(600);
      if (await phone.uiContains('Candidature liée')) break;
    }
  }
  if (!(await phone.uiContains('Candidature liée'))) {
    throw new Error('Détail relance : section « Candidature liée » introuvable');
  }
  console.log('✅ Détail relance : section candidature visible');

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
        label === 'Contact' ||
        label.includes('Modifier') ||
        label.includes('Back')
      ) {
        return false;
      }
      if (!label.includes(target.position)) return false;
      const bm = n.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
      if (!bm) return false;
      const y1 = +bm[2];
      return y1 >= headerY2 - 2 && y1 < headerY2 + 320;
    });
  }
  if (linkTile) {
    const m = linkTile.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    await phone.tapXY(
      Math.floor((+m[1] + +m[3]) / 2),
      Math.floor((+m[2] + +m[4]) / 2),
    );
  } else if (await phone.uiContains('Aucune candidature')) {
    throw new Error('Relance sans candidature liée — données insuffisantes');
  } else {
    await phone.tapXY(540, 820);
  }
  await phone.wait(2500);

  const onAppDetail =
    (await phone.uiContains('Ajouter')) ||
    (await phone.uiContains('Résultat / statut')) ||
    (await phone.uiContains('Changer statut'));
  if (!onAppDetail) {
    throw new Error('Navigation relance → candidature : détail introuvable');
  }
  console.log('✅ Relance → candidature : navigation OK');

  await phone.back();
  await phone.wait(1500);
  await phone.back();
  await phone.wait(1500);
  await adbLib.flows.goToTab(phone, 1, { shell: true });

  console.log('\nSmoke navigation relance → candidature OK');
})().catch((err) => {
  console.error('Smoke followup nav KO:', err.message);
  process.exit(1);
});
