#!/usr/bin/env node
/**
 * Smoke — pipeline signalements mobile → gateway → GET /api/v1/crashes
 * Usage : node scripts/ops/smoke-mobile-crash-pipeline.js
 */
const http = require('http');

const BASE = (process.env.API_GATEWAY_URL || 'http://127.0.0.1:5002').replace(/\/$/, '');

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname + url.search,
        method,
        headers: payload
          ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
          : {},
      },
      (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          resolve({ status: res.statusCode || 0, body: data });
        });
      },
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  const health = await request('GET', '/health');
  if (health.status !== 200) throw new Error(`Gateway health HTTP ${health.status}`);

  const heavyMeta = {
    feedback: true,
    category: 'bug',
    screenshotCompressed: `gz:${Buffer.from('x'.repeat(80000)).toString('base64')}`,
  };

  const postHeavy = await request('POST', '/api/v1/crashes', {
    crashType: 'ManualReport',
    message: '[bug] smoke pipeline heavy attachments',
    metadata: heavyMeta,
  });
  if (postHeavy.status !== 201) {
    throw new Error(`POST heavy crash HTTP ${postHeavy.status}: ${postHeavy.body.slice(0, 200)}`);
  }

  const postLight = await request('POST', '/api/v1/crashes', {
    crashType: 'FlutterError',
    message: 'smoke auto crash',
    metadata: { smoke: true },
  });
  if (postLight.status !== 201) {
    throw new Error(`POST light crash HTTP ${postLight.status}`);
  }

  const list = await request('GET', '/api/v1/crashes?limit=30');
  if (list.status !== 200) throw new Error(`GET crashes HTTP ${list.status}`);
  const json = JSON.parse(list.body);
  const data = json.data || [];
  const hasHeavy = data.some((r) =>
    String(r.message || '').includes('smoke pipeline heavy'),
  );
  const hasAuto = data.some((r) => String(r.message || '').includes('smoke auto crash'));
  if (!hasHeavy) throw new Error('Heavy feedback absent du GET /api/v1/crashes');
  if (!hasAuto) throw new Error('Auto crash absent du GET /api/v1/crashes');

  console.log('OK smoke-mobile-crash-pipeline — heavy POST 201, auto POST 201, GET liste OK');
}

main().catch((e) => {
  console.error('KO smoke-mobile-crash-pipeline:', e.message);
  process.exit(1);
});
