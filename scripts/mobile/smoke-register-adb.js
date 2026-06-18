#!/usr/bin/env node
/**
 * Smoke inscription mobile : formulaire + écran attente vérification email.
 *
 *   node scripts/mobile/smoke-register-adb.js
 */

const adbLib = require('../../tools/adb-lib');

(async () => {
  const phone = await adbLib.connect();
  const devices = await phone.listDevices();
  console.log('Devices:', devices.map((d) => d.id).join(', ') || '(aucun)');

  const email = `mob-smoke-${Date.now()}@example.com`;
  await adbLib.flows.clearAppDataForSmoke(phone);
  await adbLib.flows.goToRegister(phone);
  await adbLib.flows.register(phone, {
    firstName: 'Smoke',
    lastName: 'Register',
    email,
    password: 'Test123!',
  });

  const markers = [
    'Vérifiez votre email',
    'Vérification requise',
    'lien de vérification',
    'Un lien de vérification',
  ];
  let ok = false;
  for (let i = 0; i < 10; i++) {
    await phone.wait(2000);
    for (const m of markers) {
      if (await phone.uiContains(m)) {
        ok = true;
        break;
      }
    }
    if (ok) break;
  }
  if (!ok) {
    throw new Error('Écran post-inscription introuvable (Vérifiez votre email / Vérification requise)');
  }
  console.log(`Smoke inscription mobile OK (${email})`);
})().catch((err) => {
  console.error('Smoke inscription mobile KO:', err.message);
  process.exit(1);
});
