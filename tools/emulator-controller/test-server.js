#!/usr/bin/env node
/**
 * Test du contrôleur d'émulateur (port 5055).
 * Vérifie que les routes /health, /avds, /devices, /flutter-devices répondent correctement.
 * À lancer avec : make test-emulator-controller (ou node test-server.js depuis tools/emulator-controller).
 * Prérequis : le contrôleur doit être démarré (make emulator-controller).
 */

const http = require('http');

const BASE = process.env.EMULATOR_CONTROLLER_URL || 'http://localhost:5055';

function fetch(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const req = http.request(
      { hostname: url.hostname, port: url.port || 80, path: url.pathname, method: 'GET' },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

function post(path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      },
      (res) => {
        let buf = '';
        res.on('data', (chunk) => { buf += chunk; });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(buf) });
          } catch (e) {
            resolve({ status: res.statusCode, body: buf });
          }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log('📱 Test du contrôleur d\'émulateur:', BASE);
  let failed = 0;

  try {
    const health = await fetch('/health');
    if (health.status !== 200 || !health.body.ok) {
      console.error('❌ GET /health: attendu 200 et ok:true, reçu', health.status, health.body);
      failed++;
    } else {
      console.log('✅ GET /health:', health.body.version ? `v${health.body.version}` : 'ok');
    }
  } catch (e) {
    if (e.code === 'ECONNREFUSED' || e.message === 'Timeout') {
      console.error('❌ Contrôleur injoignable. Démarrez-le avec : make emulator-controller');
      process.exit(1);
    }
    console.error('❌ GET /health:', e.message);
    failed++;
  }

  const routes = [
    { path: '/avds', key: 'avds', type: 'array' },
    { path: '/devices', key: 'devices', type: 'array' },
    { path: '/flutter-devices', key: 'devices', type: 'array' },
  ];

  for (const r of routes) {
    try {
      const res = await fetch(r.path);
      if (res.status !== 200) {
        console.error(`❌ GET ${r.path}: attendu 200, reçu ${res.status}`);
        failed++;
        continue;
      }
      const val = res.body[r.key];
      if (!Array.isArray(val)) {
        console.error(`❌ GET ${r.path}: body.${r.key} doit être un tableau, reçu`, typeof val);
        failed++;
      } else {
        console.log(`✅ GET ${r.path}: ${val.length} élément(s)`);
      }
    } catch (e) {
      console.error(`❌ GET ${r.path}:`, e.message);
      failed++;
    }
  }

  // Routes POST indispensables pour les parcours (pas 404)
  try {
    const restart = await post('/force-restart-app', { deviceId: 'device-pour-test' });
    if (restart.status === 404) {
      console.error('❌ POST /force-restart-app: 404 (route absente). Redémarrez le contrôleur: make restart-emulator');
      failed++;
    } else if (restart.status === 200 && restart.body.success === false) {
      console.log('✅ POST /force-restart-app: route présente (réponse attendue sans appareil réel)');
    } else if (restart.status === 400) {
      console.log('✅ POST /force-restart-app: route présente (400 = body invalide)');
    } else {
      console.log('✅ POST /force-restart-app:', restart.status);
    }
  } catch (e) {
    if (e.message === 'Timeout') {
      console.error('❌ POST /force-restart-app: timeout');
      failed++;
    } else {
      console.error('❌ POST /force-restart-app:', e.message);
      failed++;
    }
  }

  if (failed > 0) {
    console.error('\n⚠️  ', failed, 'test(s) en échec.');
    process.exit(1);
  }
  console.log('\n✅ Tous les tests du contrôleur émulateur sont passés.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
