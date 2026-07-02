#!/usr/bin/env node
/**
 * Aligne admin BDD + comptes debug mobile (APK debug).
 *
 * À lancer après changement de ADMIN_PASSWORD / ADMIN_EMAIL dans .env :
 *   node scripts/mobile/setup/sync-admin-mobile-login.js
 *
 * Puis rebuild + réinstall APK debug (les mots de passe sont compilés dans l'APK).
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { loadRootEnv, probeLogin, GATEWAY_URL } = require('../lib/resolve-admin-credentials');

const ROOT = path.resolve(__dirname, '../../..');
const GENERATED = path.join(ROOT, 'mobile/lib/config/debug_test_accounts.generated.dart');

function run(cmd, args, opts = {}) {
  execFileSync(cmd, args, { stdio: 'inherit', cwd: ROOT, ...opts });
}

async function main() {
  loadRootEnv();

  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD?.trim();
  const testAdminEmail = process.env.TEST_ADMIN_EMAIL?.trim();
  const testAdminPassword = process.env.TEST_ADMIN_PASSWORD?.trim();

  console.log('\n=== Sync admin — mobile + BDD ===\n');

  if (!email || !password) {
    console.error('❌ ADMIN_EMAIL et ADMIN_PASSWORD requis dans .env');
    process.exit(1);
  }

  if (testAdminEmail && testAdminEmail !== email) {
    console.warn(
      `⚠️  TEST_ADMIN_EMAIL (${testAdminEmail}) ≠ ADMIN_EMAIL (${email}) — bouton « Connexion ADMIN » utilisera TEST_ADMIN_*`,
    );
  }
  if (testAdminPassword && testAdminPassword !== password) {
    console.warn(
      '⚠️  TEST_ADMIN_PASSWORD ≠ ADMIN_PASSWORD — le bouton debug mobile n’utilise pas ADMIN_PASSWORD',
    );
  }

  console.log('1/3 — Resync hash bcrypt admin (create-admin-user.sh)…');
  run('bash', [path.join(ROOT, 'backend/scripts/database/create-admin-user.sh')]);

  console.log('\n2/3 — Génération debug_test_accounts.generated.dart…');
  run('node', [path.join(ROOT, 'scripts/mobile/setup/generate-debug-test-accounts.js')]);

  if (!fs.existsSync(GENERATED)) {
    console.error('❌ Fichier généré absent — vérifiez generate-debug-test-accounts.js');
    process.exit(1);
  }

  console.log('\n3/3 — Probe login API…');
  const adminOk = await probeLogin(email, password);
  const debugEmail = testAdminEmail || email;
  const debugPass = testAdminPassword || password;
  const debugOk = await probeLogin(debugEmail, debugPass);

  console.log(`   ADMIN_*  ${email} → ${adminOk ? 'OK' : 'KO'}`);
  console.log(`   TEST_ADMIN_* ${debugEmail} → ${debugOk ? 'OK' : 'KO'}`);
  console.log(`   Gateway : ${GATEWAY_URL}`);

  if (!adminOk) {
    console.error('\n❌ Login API KO — vérifiez ADMIN_PASSWORD dans .env et auth-service up');
    process.exit(1);
  }

  console.log(`
✅ BDD et .env alignés.

Sur Samsung (APK **debug** obligatoire pour les boutons rapides) :

  bash scripts/mobile/setup/build-apk-debug.sh
  adb install -r mobile/build/app/outputs/flutter-apk/app-debug.apk
  node scripts/mobile/setup/diagnose-mobile-api-connection.js

Sur l'écran login :
  • Touchez « Connexion ADMIN » (remplit email + mot de passe depuis .env)
  • Ou « Afficher le formulaire » si l'empreinte propose un ancien mot de passe

Ne pas retaper ADMIN_PASSWORD à la main (souvent 64 caractères) — utilisez le bouton debug ou copiez depuis le bloc « Administrateur » affiché sous les boutons.

Si « Mot de passe incorrect » persiste après changement de .env :
  • Désactivez empreinte sur l'écran login → formulaire complet
  • Paramètres app → déconnexion → reconnexion via « Connexion ADMIN »
`);
}

main().catch((err) => {
  console.error('❌', err.message || err);
  process.exit(1);
});
