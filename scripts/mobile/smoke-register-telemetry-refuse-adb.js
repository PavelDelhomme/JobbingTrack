#!/usr/bin/env node
/**
 * Smoke inscription : refus télémétrie bloque la création (Lot D ligne 317).
 *
 *   node scripts/mobile/smoke-register-telemetry-refuse-adb.js
 */

const adbLib = require('../../tools/adb-lib');

(async () => {
  const phone = await adbLib.connect();
  const email = `mob-tel-refuse-${Date.now()}@example.com`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await adbLib.flows.clearAppDataForSmoke(phone);
      break;
    } catch (err) {
      if (attempt === 1) throw err;
      await phone.wait(5000);
    }
  }
  await adbLib.flows.goToRegister(phone);
  await phone.wait(2000);

  await phone.typeInField('Prénom', 'Refuse');
  await phone.typeInField('Nom', 'Telemetry');
  await phone.typeInField('Email', email);
  await phone.scrollDown(400);
  await phone.wait(500);
  try {
    await phone.typeInField('Mot de passe', 'Test123!');
    await phone.typeInField('Confirmer', 'Test123!');
  } catch {
    await phone.typeInEditTextByIndex(3, 'Test123!');
    await phone.typeInEditTextByIndex(4, 'Test123!');
  }
  await phone.closeKeyboard();
  await phone.scrollDown(500);
  await phone.wait(500);
  try {
    await phone.tap('conditions');
  } catch {
    try {
      await phone.tap("J'accepte les conditions");
    } catch {
      /* CGU */
    }
  }
  await phone.wait(400);
  await phone.scrollDown(500);
  await phone.wait(500);

  try {
    await phone.tap('collecte anonyme');
  } catch {
    try {
      await phone.tap('Accepter la collecte anonyme');
    } catch {
      await phone.tap('données techniques');
    }
  }
  await phone.wait(600);

  await phone.scrollDown(600);
  await phone.wait(500);
  try {
    await phone.tap('inscrire');
  } catch {
    await phone.tap("S'inscrire");
  }
  await phone.wait(4000);

  const registered =
    (await phone.uiContains('Vérifiez votre email')) ||
    (await phone.uiContains('Vérification requise'));
  if (registered) {
    throw new Error('Inscription réussie malgré refus télémétrie (attendu : blocage)');
  }

  const blocked =
    (await phone.uiContains('collecte anonyme de données techniques est requise')) ||
    (await phone.uiContains('requis pour créer un compte')) ||
    (await phone.uiContains('Obligatoire pour créer')) ||
    (await phone.uiContains("S'inscrire"));

  if (!blocked) {
    throw new Error('État inconnu après refus télémétrie (ni blocage ni succès détecté)');
  }
  console.log('✅ Refus télémétrie : création bloquée');

  console.log('\nSmoke refus télémétrie inscription OK');
})().catch((err) => {
  console.error('Smoke refus télémétrie KO:', err.message);
  process.exit(1);
});
