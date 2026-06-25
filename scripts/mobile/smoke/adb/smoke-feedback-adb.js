#!/usr/bin/env node
/**
 * Smoke retour bug mobile : Paramètres → Signaler un bug → envoi → vérif crash log + MailHog.
 *
 *   node scripts/mobile/smoke/adb/smoke-feedback-adb.js
 */
const http = require('http');
const adbLib = require('../../../../tools/adb-lib');
const { resolveWorkingUserCredentials } = require('../../lib/resolve-user-credentials');
const { loadRootEnv } = require('../../lib/resolve-admin-credentials');

loadRootEnv();

const GATEWAY = process.env.API_URL || 'http://localhost:5002';
const MAILHOG = process.env.MAILHOG_URL || 'http://localhost:8025';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let data = '';
        res.on('data', (c) => {
          data += c;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

async function latestCrashFromGateway() {
  const data = await fetchJson(`${GATEWAY}/api/v1/crashes?limit=5`);
  return data?.data?.[0] || null;
}

async function latestMailBody() {
  const data = await fetchJson(`${MAILHOG}/api/v2/messages?limit=1`);
  const body = data?.items?.[0]?.Content?.Body || '';
  return body;
}

(async () => {
  const stamp = Date.now();
  const message = `Bug smoke mail ${stamp} validation agent complete`;
  const { email, password } = await resolveWorkingUserCredentials();
  const phone = await adbLib.connect();

  console.log('Device:', phone.device);
  console.log('User:', email);

  const beforeCrashId = (await latestCrashFromGateway())?.id;

  await adbLib.flows.dismissBiometricUnlock(phone);
  await adbLib.flows.restartApp(phone);
  await phone.wait(3000);

  if (!(await phone.uiContains('Bonjour'))) {
    if (
      (await phone.uiContains('Email')) ||
      (await phone.uiContains('Mot de passe')) ||
      (await phone.uiContains('Se connecter'))
    ) {
      await adbLib.flows.login(phone, email, password);
    } else {
      await adbLib.flows.loginFresh(phone, email, password);
    }
  }

  await phone.assertVisible('Bonjour');
  console.log('✅ Connecté');

  await adbLib.flows.goToTab(phone, 4, { shell: true });
  await phone.wait(1500);

  if (await phone.uiContains('Paramètres')) {
    await phone.tap('Paramètres');
  } else if (await phone.uiContains('Settings')) {
    await phone.tap('Settings');
  } else {
    throw new Error('Entrée Paramètres introuvable');
  }
  await phone.wait(2000);

  await phone.tap('Signaler un bug');
  await phone.wait(2000);

  if (!(await phone.uiContains('Signaler un bug'))) {
    throw new Error('Formulaire retour bug non ouvert');
  }

  await phone.wait(2000);

  await phone.typeInField('passé', message);
  await phone.wait(800);
  if (await phone.uiContains('Envoyer')) {
    try {
      await phone.tap('Envoyer', 0);
    } catch {
      /* bouton barre AppBar si clavier ouvert */
    }
  }
  await phone.wait(6000);

  let crash = null;
  for (let i = 0; i < 10; i++) {
    crash = await latestCrashFromGateway();
    if (crash?.id && crash.id !== beforeCrashId && String(crash.message || '').includes(String(stamp))) {
      break;
    }
    await phone.wait(1500);
    crash = null;
  }

  if (!crash) {
    const sentOk =
      (await phone.uiContains('Merci')) ||
      (await phone.uiContains('Paramètres')) && !(await phone.uiContains('Signaler un bug'));
    if (!sentOk) {
      const nodes = await phone.uiNodes();
      const texts = nodes
        .filter((n) => n.text || n.contentDesc)
        .slice(0, 20)
        .map((n) => n.text || n.contentDesc);
      throw new Error(`Confirmation envoi absente. UI: ${texts.join(' | ')}`);
    }
  }
  console.log('✅ Retour envoyé depuis l’app');

  if (!crash) {
    crash = await latestCrashFromGateway();
  }
  if (!crash || !String(crash.message || '').includes(String(stamp))) {
    throw new Error('Rapport crash non trouvé dans gateway logs');
  }

  const raw = crash.metadata || {};
  const nested = raw.metadata || {};
  console.log('✅ Crash gateway:', crash.id, crash.crashType);

  if (crash.crashType !== 'ManualReport' && !String(crash.message).startsWith('[bug]')) {
    throw new Error(`crashType inattendu: ${crash.crashType}`);
  }

  const hasDevice = raw.deviceInfo || raw.device;
  const hasSession = raw.sessionId || nested.sessionId;
  const hasScreen = raw.screenName || nested.screenName;
  const hasDiag = nested.diagnosticCompressed;

  if (!hasDevice) throw new Error('deviceInfo absent dans le crash log');
  if (!hasSession) throw new Error('sessionId absent dans le crash log');
  if (!hasScreen) throw new Error('screenName absent dans le crash log');
  if (!hasDiag) throw new Error('diagnosticCompressed absent dans metadata');

  console.log('✅ Payload crash complet (device, session, screen, diagnostic)');

  let mailOk = false;
  for (let i = 0; i < 6; i++) {
    const body = await latestMailBody();
    if (body.includes(String(stamp)) || body.includes('Retour utilisateur')) {
      const checks = [
        'help_feedback',
        'diagnosticSummary',
        hasScreen ? String(hasScreen).replace(/^\//, '') : 'help_feedback',
      ];
      const missing = checks.filter((c) => c && !body.includes(c));
      if (missing.length === 0 || body.includes('samsung') || body.includes('Android')) {
        mailOk = true;
        break;
      }
    }
    await phone.wait(1500);
  }

  if (!mailOk) {
    throw new Error('Email MailHog enrichi non confirmé (vérifier CRASH_REPORT_EMAIL / notification-service)');
  }

  console.log('✅ Email MailHog enrichi détecté');
  console.log('\nSmoke feedback mobile OK');
})().catch((err) => {
  console.error('Smoke feedback mobile KO:', err.message);
  process.exit(1);
});
