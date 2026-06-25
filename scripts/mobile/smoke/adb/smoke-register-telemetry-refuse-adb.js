#!/usr/bin/env node
/**
 * Smoke inscription : refus télémétrie bloque la création (Test A — étape 1 porteur).
 * Usage: node scripts/mobile/smoke/adb/smoke-register-telemetry-refuse-adb.js
 * @used-by docs/mobile/VALIDATION_ETAPE_1_INSCRIPTION.md
 *
 * Prénom/Nom = libellés de test automation (pas un état produit « bloqué sur Telemetry »).
 * Email @example.com = pas de mail réel (test UI blocage télémétrie uniquement).
 */

const adbLib = require('../../../../tools/adb-lib');

async function registerFormWithTelemetry(adb, { firstName, lastName, email, password, telemetryChecked }) {
  await adb.typeInEditTextByIndex(0, firstName);
  await adb.wait(400);
  await adb.typeInEditTextByIndex(1, lastName);
  await adb.wait(400);
  await adb.typeInEditTextByIndex(2, email, { isEmail: true });
  await adb.wait(400);
  await adb.typeInEditTextByIndex(3, password);
  await adb.wait(400);
  await adb.typeInEditTextByIndex(4, password);
  await adb.wait(400);
  await adb.closeKeyboard();
  await adb.scrollDown(400);
  await adb.wait(400);

  try {
    await adb.tap('conditions');
  } catch {
    try {
      await adb.tap("J'accepte les conditions");
    } catch {
      /* CGU */
    }
  }
  await adb.wait(400);
  await adb.scrollDown(400);
  await adb.wait(400);

  if (!telemetryChecked) {
    try {
      await adb.tap('collecte anonyme');
    } catch {
      try {
        await adb.tap('Accepter la collecte anonyme');
      } catch {
        await adb.tap('données techniques');
      }
    }
    await adb.wait(600);
  }

  await adb.scrollDown(600);
  await adb.wait(500);
  try {
    await adb.tap('inscrire');
  } catch {
    await adb.tap("S'inscrire");
  }
  await adb.wait(4000);
}

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

  await registerFormWithTelemetry(phone, {
    firstName: 'Test',
    lastName: 'RefuseTel',
    email,
    password: 'Test123!',
    telemetryChecked: false,
  });

  const registered =
    (await phone.uiContains('Vérifiez votre email')) ||
    (await phone.uiContains('Vérification requise'));
  if (registered) {
    throw new Error('Inscription réussie malgré refus télémétrie (attendu : blocage)');
  }

  const blocked =
    (await phone.uiContains('collecte anonyme de données techniques est requise')) ||
    (await phone.uiContains('requis pour créer un compte')) ||
    (await phone.uiContains('Obligatoire pour créer'));

  if (!blocked) {
    throw new Error('État inconnu après refus télémétrie (ni blocage snackbar ni succès détecté)');
  }
  console.log('✅ Refus télémétrie : création bloquée (snackbar attendu)');

  console.log('\nSmoke refus télémétrie inscription OK');
})().catch((err) => {
  console.error('Smoke refus télémétrie KO:', err.message);
  process.exit(1);
});
