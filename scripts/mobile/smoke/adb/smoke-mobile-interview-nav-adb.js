#!/usr/bin/env node
/**
 * Smoke navigation entretien → candidature (Lot D ligne 325).
 *
 * Crée un entretien via API si la liste est vide, puis ouvre le détail
 * et suit le lien « Candidature liée ».
 *
 *   SMOKE_USE_ADMIN=1 MOBILE_ADB_DEVICE=R5CT7263YJL ADB_FAST=1 \
 *   SMOKE_API_GATEWAY_URL=https://api.jobbingtrack.com \
 *   node scripts/mobile/smoke/adb/smoke-mobile-interview-nav-adb.js
 */

const adbLib = require('../../../../tools/adb-lib');
require('../../lib/smoke-runtime');
const { ensureUserShell, connectSmokePhone, recoverFromOfflineMode } = require('../../lib/adb-smoke-helpers');
const { resolveWorkingUserCredentials } = require('../../lib/resolve-user-credentials');
const {
  loadRootEnv,
  resolveWorkingAdminCredentials,
  listAdminCredentialCandidates,
  getGatewayUrl,
} = require('../../lib/resolve-admin-credentials');
const {
  loginSmokeToken,
  ensureSmokeApplication,
} = require('../../lib/smoke-application-target');

loadRootEnv();

async function resolveSmokeCredentials() {
  if (process.env.SMOKE_USE_ADMIN === '1') {
    try {
      return await resolveWorkingAdminCredentials();
    } catch (err) {
      console.warn('probe admin KO — fallback .env:', err.message);
      return listAdminCredentialCandidates()[0];
    }
  }
  try {
    return await resolveWorkingUserCredentials();
  } catch (err) {
    console.warn('TEST_USER KO — fallback ADMIN:', err.message);
    return resolveWorkingAdminCredentials();
  }
}

function nodeLabel(n) {
  return `${n.text || ''}\n${n.contentDesc || ''}`.trim();
}

async function ensureLoggedIn(phone, email, password) {
  console.log(await adbLib.flows.loginFresh(phone, email, password));
  await adbLib.flows.dismissBiometricUnlock(phone, { password });
  const ok =
    (await phone.uiContains('Bonjour')) ||
    (await phone.uiContains('Tab 1 of 4')) ||
    (await phone.uiContains('Accueil'));
  if (!ok) {
    throw new Error('Shell utilisateur introuvable après login');
  }
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

async function ensureInterviewExists(token) {
  const base = getGatewayUrl();
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  const listRes = await fetch(`${base}/api/v1/interviews?limit=50`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listData = await listRes.json().catch(() => ({}));
  const interviews = listData.interviews || listData.data || [];
  if (interviews.length > 0) {
    return interviews[0];
  }
  const app = await ensureSmokeApplication(token, { forceNew: true });
  const when = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const createRes = await fetch(`${base}/api/v1/interviews`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      applicationId: app.id,
      interviewDate: when,
      location: 'Paris — smoke MOB-NAV',
      notes: '[Format: Présentiel]\nSmoke ADB entretien nav',
    }),
  });
  const created = await createRes.json().catch(() => ({}));
  if (createRes.status !== 201 && createRes.status !== 200) {
    throw new Error(
      `Création entretien API KO (${createRes.status}) ${JSON.stringify(created).slice(0, 160)}`,
    );
  }
  console.log('Entretien créé via API pour', app.position);
  return created.interview || created.data || created;
}

(async () => {
  const { email, password } = await resolveSmokeCredentials();
  const token = await loginSmokeToken(email, password);
  await ensureInterviewExists(token);

  const phone = await connectSmokePhone();
  console.log('User:', email);

  await ensureLoggedIn(phone, email, password);
  await recoverFromOfflineMode(phone);
  await openDrawerEntretiens(phone);
  await recoverFromOfflineMode(phone);

  // Pull-to-refresh si liste encore vide après création API
  if (await phone.uiContains('Aucun entretien')) {
    await phone.scrollUp(900);
    await phone.wait(2500);
  }
  if (await phone.uiContains('Aucun entretien')) {
    throw new Error('Aucun entretien — création API non visible sur l’appareil');
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
        nodeLabel(n).includes('smoke') ||
        nodeLabel(n).includes('Paris') ||
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
    const hm = nodesAfter[headerIdx].bounds.match(
      /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/,
    );
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
