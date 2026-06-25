#!/usr/bin/env node
/**
 * Smoke login mobile sur appareil ADB connecté (lecture seule UI + login si creds .env).
 *
 *   node scripts/mobile/smoke/adb/smoke-login-adb.js
 *
 * Variables : TEST_USER_EMAIL/TEST_USER_PASSWORD ou TEST_ADMIN_EMAIL/TEST_ADMIN_PASSWORD
 */

const path = require('path');
const fs = require('fs');

function loadRootEnv() {
  const envPath = path.resolve(__dirname, '../../../../.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadRootEnv();

const adbLib = require('../../../tools/adb-lib');

(async () => {
  const phone = await adbLib.connect();
  const devices = await phone.listDevices();
  console.log('Devices:', devices.map((d) => d.id).join(', ') || '(aucun)');

  const hasLogin = await phone.uiContains('Connexion') || await phone.uiContains('Se connecter');
  console.log('Ecran connexion visible:', hasLogin ? 'oui' : 'non');

  if (!hasLogin) {
    console.log('UI actuelle (extraits):');
    const nodes = await phone.uiNodes();
    nodes
      .filter((n) => n.text || n.contentDesc)
      .slice(0, 12)
      .forEach((n) => console.log(`  - ${n.text || n.contentDesc}`));
    return;
  }

  await adbLib.flows.loginFresh(phone);
  await phone.assertVisible('Bonjour');
  console.log('Smoke login mobile OK');
})().catch((err) => {
  console.error('Smoke login mobile KO:', err.message);
  process.exit(1);
});
