#!/usr/bin/env node
'use strict';

/**
 * Smoke infra direct du metrics-aggregator.
 *
 * Exception volontaire au chemin gateway: ce service expose des sondes infra
 * protégées par X-API-Key et sert de source aux pages monitoring/backoffice.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../..');
const BASE_URL = process.env.METRICS_AGGREGATOR_URL || `http://127.0.0.1:${process.env.METRICS_AGGREGATOR_PORT || '5004'}`;

function readEnvKey(key) {
  if (process.env[key]) return process.env[key];

  const envPath = path.join(ROOT_DIR, '.env');
  if (!fs.existsSync(envPath)) return '';

  const line = fs.readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${key}=`));

  if (!line) return '';
  return line.slice(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '');
}

async function request(label, url, options = {}) {
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.headers || {}),
      },
      signal: AbortSignal.timeout(10000),
    });

    return {
      label,
      status: response.status,
      durationMs: Date.now() - startedAt,
      ok: true,
    };
  } catch (error) {
    return {
      label,
      status: 0,
      durationMs: Date.now() - startedAt,
      ok: false,
      error: error.message,
    };
  }
}

function expectStatus(result, accepted) {
  const ok = result.ok && accepted.includes(result.status);
  const icon = ok ? '✅' : '❌';
  console.log(`${icon} ${result.label.padEnd(28)} ${String(result.status).padStart(3)} ${String(result.durationMs).padStart(5)}ms`);
  if (!ok && result.error) {
    console.log(`   → ${result.error}`);
  }
  return ok;
}

async function main() {
  const apiKey = readEnvKey('METRICS_API_KEY');
  const checks = [
    {
      accepted: [200],
      promise: request('health public', `${BASE_URL}/health`),
    },
    {
      accepted: [401],
      promise: request('metrics without key', `${BASE_URL}/api/v1/metrics`),
    },
  ];

  if (apiKey) {
    checks.push({
      accepted: [200],
      promise: request('metrics with X-API-Key', `${BASE_URL}/api/v1/metrics`, {
        headers: { 'X-API-Key': apiKey },
      }),
    });
    checks.push({
      accepted: [200],
      promise: request('docker services with key', `${BASE_URL}/api/v1/docker/services/all`, {
        headers: { 'X-API-Key': apiKey },
      }),
    });
  } else {
    console.log('⚠️  METRICS_API_KEY absent: checks protégés ignorés');
  }

  console.log('📊 Smoke Metrics Aggregator');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('');

  let failed = 0;
  for (const check of checks) {
    const result = await check.promise;
    if (!expectStatus(result, check.accepted)) failed += 1;
  }

  console.log('');
  console.log(`Tests échoués: ${failed}`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('❌ Erreur fatale metrics-aggregator smoke:', error);
  process.exit(1);
});
