#!/usr/bin/env node
/**
 * Configure le compte Gmail pro sur l'émulateur Android à partir du `.env` racine.
 *
 * Variables lues :
 *   EMAIL_GMAIL_PRO_ACCOUNT              — adresse Gmail (ex. pauldelhomme.pro@gmail.com)
 *   EMAIL_GMAIL_PRO_PASSWORD             — mot de passe compte Google (connexion écran Android)
 *   EMAIL_GMAIL_PRO_PASSWORD_APPLICATION — mot de passe d'application (info seulement, non utilisé ici)
 *
 * Prérequis :
 *   - Émulateur booté (`setup-android-emulator.sh start` ou `up`)
 *   - Contrôleur ADB sur EMULATOR_CONTROLLER_URL (défaut 127.0.0.1:5055)
 *
 * Limites :
 *   - La validation 2FA Google peut exiger une intervention manuelle sur l'émulateur.
 *   - Le mot de passe d'application Google ne sert pas à ajouter le compte sur Android.
 *
 * Usage :
 *   node scripts/mobile/configure-emulator-gmail.js
 *   node scripts/mobile/configure-emulator-gmail.js --check-only
 */

const { execFileSync } = require('child_process');
const path = require('path');
const adbLib = require('../../../tools/adb-lib');

const ROOT = path.resolve(__dirname, '../../..');
const ENV_GET = path.join(ROOT, 'scripts/env/env-get-key.cjs');

function readEnvKey(key) {
  try {
    return execFileSync(process.execPath, [ENV_GET, key], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function accountAlreadyPresent(account, dump) {
  const needle = account.toLowerCase();
  return dump.toLowerCase().includes(needle);
}

async function tapIfVisible(phone, labels, timeoutMs = 12000) {
  for (const label of labels) {
    if (!(await phone.uiContains(label))) continue;
    try {
      await phone.tapReliable(label);
      await phone.wait(900);
      return true;
    } catch {
      /* label suivant */
    }
  }
  await phone.waitUntil(({ contains }) => labels.some((l) => contains(l)), {
    timeoutMs,
    pollMs: 500,
  });
  for (const label of labels) {
    if (!(await phone.uiContains(label))) continue;
    await phone.tapReliable(label);
    await phone.wait(900);
    return true;
  }
  return false;
}

(async () => {
  const checkOnly = process.argv.includes('--check-only');
  const account = readEnvKey('EMAIL_GMAIL_PRO_ACCOUNT');
  const password = readEnvKey('EMAIL_GMAIL_PRO_PASSWORD');
  const appPassword = readEnvKey('EMAIL_GMAIL_PRO_PASSWORD_APPLICATION');

  if (!account) {
    console.error('EMAIL_GMAIL_PRO_ACCOUNT absent — renseignez-le dans .env');
    process.exit(1);
  }
  if (!password && !checkOnly) {
    console.error(
      'EMAIL_GMAIL_PRO_PASSWORD absent — requis pour la connexion Google sur l’émulateur.',
    );
    console.error(
      'Le mot de passe d’application (EMAIL_GMAIL_PRO_PASSWORD_APPLICATION) sert au SMTP/IMAP, pas à Android.',
    );
    process.exit(1);
  }
  if (!appPassword) {
    console.warn(
      'Note : EMAIL_GMAIL_PRO_PASSWORD_APPLICATION absent (SMTP/IMAP/tests agent email).',
    );
  }

  const phone = await adbLib.connect();
  const devices = await phone.listDevices();
  console.log('Devices:', devices.map((d) => d.id).join(', ') || '(aucun)');

  const accountsDump = await phone.shellCommand('dumpsys account');
  if (accountAlreadyPresent(account, accountsDump || '')) {
    console.log(`Compte Gmail déjà présent sur l’émulateur : ${account}`);
    return;
  }

  if (checkOnly) {
    console.log(`Compte ${account} absent sur l’émulateur — lancer sans --check-only pour configurer.`);
    process.exit(2);
  }

  console.log(`Configuration Gmail pro sur AVD : ${account}`);

  await phone.shellCommand(
    'am start -a android.settings.ADD_ACCOUNT_SETTINGS -f 0x14000000',
  );
  await phone.wait(1500);

  const googleOpened = await tapIfVisible(phone, ['Google', 'Ajouter un compte Google', 'Add a Google Account']);
  if (!googleOpened) {
    throw new Error('Écran « Ajouter un compte » / Google introuvable — ouvrir Paramètres → Comptes manuellement.');
  }

  await phone.wait(1200);
  if (await phone.uiContains('Sign in') || (await phone.uiContains('Connexion'))) {
    await tapIfVisible(phone, ['Sign in', 'Connexion', 'Se connecter', 'Create account', 'Créer un compte']);
  }

  const emailLabels = ['Email or phone', 'Adresse e-mail ou téléphone', 'Email', 'E-mail'];
  let emailTyped = false;
  for (const label of emailLabels) {
    if (!(await phone.uiContains(label))) continue;
    await phone.typeInLabeledField(label, account, { clearFirst: true });
    emailTyped = true;
    break;
  }
  if (!emailTyped) {
    await phone.typeInLabeledField('Email or phone', account, { clearFirst: true }).catch(async () => {
      await phone.typeInLabeledField('Email', account, { clearFirst: true });
    });
  }

  await tapIfVisible(phone, ['Next', 'Suivant']);
  await phone.wait(1500);

  const passwordLabels = ['Enter your password', 'Saisissez votre mot de passe', 'Password', 'Mot de passe'];
  let passwordTyped = false;
  for (const label of passwordLabels) {
    if (!(await phone.uiContains(label))) continue;
    await phone.typeInLabeledField(label, password, { clearFirst: true, secret: true, isPassword: true });
    passwordTyped = true;
    break;
  }
  if (!passwordTyped) {
    await phone.typeInLabeledField('Password', password, { clearFirst: true, secret: true, isPassword: true });
  }

  await tapIfVisible(phone, ['Next', 'Suivant', 'Sign in', 'Connexion']);
  await phone.wait(3000);

  // Écrans post-login fréquents (sans 2FA)
  for (const round of [0, 1, 2]) {
    await tapIfVisible(phone, [
      'I agree',
      "J'accepte",
      'Accept',
      'Accepter',
      'Agree',
      'More',
      'Plus',
      'Skip',
      'Ignorer',
      'Not now',
      'Pas maintenant',
      'Done',
      'Terminé',
      'Next',
      'Suivant',
    ], 8000);
    await phone.wait(2000);
    const afterRound = await phone.shellCommand('dumpsys account');
    if (accountAlreadyPresent(account, afterRound || '')) break;
    if (round === 2) break;
  }

  await phone.wait(2000);

  const needs2fa =
    (await phone.uiContains('2-Step Verification')) ||
    (await phone.uiContains('Validation en deux étapes')) ||
    (await phone.uiContains('Verify')) ||
    (await phone.uiContains('Confirmer'));

  const afterDump = await phone.shellCommand('dumpsys account');
  if (accountAlreadyPresent(account, afterDump || '')) {
    console.log(`Compte Gmail configuré sur l’émulateur : ${account}`);
    return;
  }

  if (needs2fa) {
    console.warn('');
    console.warn('Validation Google (2FA) requise — terminez la connexion manuellement sur l’émulateur.');
    console.warn('Puis revérifiez : node scripts/mobile/configure-emulator-gmail.js --check-only');
    process.exit(3);
  }

  const wrongPassword =
    (await phone.uiContains('Wrong password')) ||
    (await phone.uiContains('Mot de passe incorrect')) ||
    (await phone.uiContains("Couldn't sign you in"));
  if (wrongPassword) {
    console.error('');
    console.error('Mot de passe Google refusé sur l’émulateur.');
    console.error('Vérifiez EMAIL_GMAIL_PRO_PASSWORD (= mot de passe compte, pas le mot de passe d’application).');
    process.exit(5);
  }

  console.warn('');
  console.warn('Connexion Google non confirmée automatiquement (écran post-login ou captcha).');
  console.warn('La vérification email mobile fonctionne sans Gmail sur l’AVD via MailHog/IMAP/EmailLog.');
  console.warn('Pour le compte Android : terminez manuellement sur l’émulateur, puis --check-only.');
  process.exit(4);
})().catch((err) => {
  console.error('Configuration Gmail AVD KO:', err.message);
  process.exit(1);
});
