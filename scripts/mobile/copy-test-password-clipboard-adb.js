#!/usr/bin/env node
/**
 * Copie TEST_USER_PASSWORD dans le presse-papier Android via ADB.
 *
 *   node scripts/mobile/copy-test-password-clipboard-adb.js
 */

const { execSync } = require('child_process');
const { loadRootEnv } = require('./resolve-admin-credentials');

function resolvePassword() {
  return (
    process.env.TEST_USER_PASSWORD?.trim() ||
    process.env.TEST_VERIFICATION_PASSWORD?.trim() ||
    ''
  );
}

function adb(args) {
  return execSync(`adb ${args}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function setClipboard(text) {
  const attempts = [
    () => adb(`shell cmd clipboard set-text ${JSON.stringify(text)}`),
    () => adb(`shell am broadcast -a clipper.set -e text ${JSON.stringify(text)}`),
  ];
  for (const fn of attempts) {
    try {
      fn();
      return true;
    } catch (_) {
      /* try next */
    }
  }
  return false;
}

(function main() {
  loadRootEnv();
  const password = resolvePassword();
  if (!password) {
    console.error('TEST_USER_PASSWORD absent du .env');
    process.exit(1);
  }

  let devices;
  try {
    devices = adb('devices').split('\n').filter((l) => l.includes('\tdevice'));
  } catch (e) {
    console.error('ADB indisponible:', e.message);
    process.exit(1);
  }
  if (devices.length === 0) {
    console.error('Aucun appareil ADB connecté');
    process.exit(1);
  }

  if (!setClipboard(password)) {
    console.error('Impossible de définir le presse-papier (essayez Android 10+)');
    process.exit(1);
  }

  console.log('Presse-papier appareil mis à jour (TEST_USER_PASSWORD).');
  console.log('Dans Paramètres → biométrie → « Coller depuis le presse-papier ».');
})();
