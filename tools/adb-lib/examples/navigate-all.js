#!/usr/bin/env node
/**
 * Exemple : Login puis navigation complete (onglets + drawer).
 *
 *   node tools/adb-lib/examples/navigate-all.js
 */

const adb = require('..');

(async () => {
  const phone = await adb.connect();

  await adb.flows.loginFresh(phone);
  console.log('Connecte, navigation...');

  await adb.flows.navigateAllTabs(phone);
  console.log('Tous les onglets OK');

  const drawerResults = await adb.flows.visitDrawerItems(phone, [
    'Relances',
    { text: 'Statistiques', scroll: true },
  ]);
  console.log('Drawer:', drawerResults);

  await adb.flows.logout(phone);
  console.log('Deconnecte. Termine !');
})().catch(err => { console.error('Erreur:', err.message); process.exit(1); });
