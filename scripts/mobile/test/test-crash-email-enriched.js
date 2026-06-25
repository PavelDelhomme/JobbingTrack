#!/usr/bin/env node
/** Smoke curl : retour bug avec capture PNG + diagnostic → vérifie MailHog. @used-by validation manuelle crash reporter mobile */
const http = require('http');
const zlib = require('zlib');

const GATEWAY = process.env.API_URL || 'http://localhost:5002';
const MAILHOG = process.env.MAILHOG_URL || 'http://localhost:8025';

function compressJson(obj) {
  return `gz:${zlib.gzipSync(Buffer.from(JSON.stringify(obj))).toString('base64')}`;
}

function compressPng() {
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );
  return `gz:${zlib.gzipSync(png).toString('base64')}`;
}

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => { raw += c; });
        res.on('end', () => {
          try { resolve(JSON.parse(raw)); } catch { resolve({ raw }); }
        });
      },
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

(async () => {
  const stamp = Date.now();
  const payload = {
    crashType: 'ManualReport',
    message: `[bug] Test capture stack ${stamp}`,
    sessionId: 'testsess-email',
    screenName: 'help_feedback/bug',
    deviceInfo: {
      platform: 'android',
      deviceModel: 'samsung SM-G990B2',
      osVersion: 'Android 16 (API 36)',
      appVersion: '1.0.0+1',
    },
    userActions: ['nav /settings → help_feedback/bug'],
    metadata: {
      feedback: true,
      category: 'bug',
      diagnosticCompressed: compressJson({
        deviceModel: 'samsung SM-G990B2',
        sessionId: 'testsess-email',
        recentErrors: [{ type: 'network_error', message: 'timeout test', screen: '/settings' }],
        analytics: { currentScreen: 'help_feedback/bug' },
      }),
      screenshotCompressed: compressPng(),
    },
  };

  const res = await postJson(`${GATEWAY}/api/v1/crashes`, payload);
  if (!res.success) throw new Error(`Gateway KO: ${JSON.stringify(res)}`);
  console.log('✅ Crash enregistré:', res.file);

  await new Promise((r) => setTimeout(r, 2500));
  const mail = await getJson(`${MAILHOG}/api/v2/messages?limit=15`);
  const item = (mail.items || []).find((m) => {
    const body = m?.Content?.Body || '';
    return body.includes(String(stamp));
  });
  if (!item) throw new Error(`Email avec stamp ${stamp} introuvable dans MailHog`);
  const body = item.Content?.Body || '';
  const checks = [
    ['data:image/png inline', body.includes('data:image/png;base64,')],
    ['contexte technique', body.includes('contexte') || body.includes('contexte technique')],
    ['network_error', body.includes('network_error')],
    ['stamp message', body.includes(String(stamp))],
  ];
  for (const [label, ok] of checks) {
    console.log(ok ? '✅' : '❌', label);
    if (!ok) process.exit(1);
  }
  console.log('\nTest email enrichi OK');
})().catch((e) => {
  console.error('KO:', e.message);
  process.exit(1);
});
