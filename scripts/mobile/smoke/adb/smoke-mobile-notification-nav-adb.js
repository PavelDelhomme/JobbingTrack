#!/usr/bin/env node
/**
 * Smoke : tap notification in-app → écran détail candidature (ou entité liée).
 *   node scripts/mobile/smoke/adb/smoke-mobile-notification-nav-adb.js
 */
const adbLib = require('../../../../tools/adb-lib');
require('../../lib/smoke-runtime');
const {
  ensureUserShell,
  boundsCenter,
  ensureHomeTab,
  openNotificationSheet,
  isNotificationSheetOpen,
} = require('../../lib/adb-smoke-helpers');
const { resolveWorkingUserCredentials } = require('../../lib/resolve-user-credentials');
const { loadRootEnv } = require('../../lib/resolve-admin-credentials');

loadRootEnv();

async function ensureLoggedIn(phone, email, password) {
  await ensureUserShell(phone, email, password);
  await ensureHomeTab(phone);
  await phone.assertVisible('Bonjour');
}

async function tapFirstNotificationTile(phone) {
  const nodes = await phone.uiNodes();
  const patterns = [/changement/i, /statut/i, /rappel/i, /relance/i, /entretien/i, /candidature/i, /notification/i];
  for (const n of nodes) {
    const label = `${n.text} ${n.contentDesc}`.trim();
    if (!label || label === 'Notifications' || label === 'Tout marquer lu') continue;
    if (!patterns.some((re) => re.test(label)) && !n.clickable) continue;
    const c = boundsCenter(n.bounds);
    if (!c || c.cy < 420) continue;
    if (label.length < 4) continue;
    await phone.tapXY(c.cx, c.cy);
    await phone.wait(2500);
    return label.slice(0, 60);
  }
  const tile = nodes.find(
    (n) =>
      n.clickable &&
      n.bounds &&
      boundsCenter(n.bounds)?.cy > 480 &&
      boundsCenter(n.bounds)?.cy < 1200 &&
      n.text &&
      n.text.length > 6 &&
      !['Notifications', 'Tout marquer lu', 'Fermer'].includes(n.text),
  );
  if (tile) {
    const c = boundsCenter(tile.bounds);
    await phone.tapXY(c.cx, c.cy);
    await phone.wait(2500);
    return tile.text.slice(0, 60);
  }
  throw new Error('Aucune notification métier cliquable dans la sheet');
}

(async () => {
  const { email, password } = await resolveWorkingUserCredentials();
  const phone = await adbLib.connect();
  console.log(`Device: ${(await phone.listDevices()).map((d) => d.id).join(', ')}`);
  console.log(`User: ${email}`);

  await ensureLoggedIn(phone, email, password);
  await ensureHomeTab(phone);
  await phone.wait(700);

  await openNotificationSheet(phone);
  if (!(await isNotificationSheetOpen(phone))) {
    throw new Error('Sheet notifications non ouverte');
  }
  await phone.wait(800);

  if (await phone.uiContains('Aucune notification candidature')) {
    console.log('⚠️ Aucune notification métier — smoke navigation ignoré');
    process.exit(0);
  }

  const tapped = await tapFirstNotificationTile(phone);
  console.log(`  Tap notification: "${tapped}"`);

  const onDetail =
    (await phone.uiContains('Changer statut')) ||
    (await phone.uiContains('Relances')) ||
    (await phone.uiContains('Entretiens')) ||
    (await phone.uiContains('Appels')) ||
    (await phone.uiContains('Contacts')) ||
    (await phone.uiContains('Agent Administratif'));
  if (!onDetail) {
    throw new Error('Écran détail non ouvert après tap notification');
  }
  console.log('✅ Notification → écran détail OK');
})().catch((err) => {
  console.error('Smoke notification navigation KO:', err.message);
  process.exit(1);
});
