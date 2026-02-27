#!/usr/bin/env node
/**
 * Exemple : Login rapide sur l'app mobile.
 *
 *   node tools/adb-lib/examples/quick-login.js
 */

const adb = require('..');

(async () => {
  const phone = await adb.connect();
  console.log('Appareil connecte:', phone.device);

  await adb.flows.ensureLoggedOut(phone);
  await adb.flows.login(phone, 'admin@jobbingtrack.com', 'password123');

  await phone.assertVisible('Bonjour');
  console.log('Login OK !');
})().catch(err => { console.error('Erreur:', err.message); process.exit(1); });
