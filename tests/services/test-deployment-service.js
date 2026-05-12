#!/usr/bin/env node
'use strict';

/**
 * Smoke direct du deployment-service.
 *
 * Ce service n'est pas exposé dans le proxy applicatif principal de la gateway;
 * on vérifie donc sa surface HTTP publiée en dev.
 */

const BASE_URL = process.env.DEPLOYMENT_SERVICE_URL_FOR_HOST
  || process.env.DEPLOYMENT_SERVICE_PUBLIC_URL
  || `http://127.0.0.1:${process.env.DEPLOYMENT_SERVICE_PORT || '5018'}`;

const CHECKS = [
  { label: 'health', path: '/health', accepted: [200] },
  { label: 'health detailed', path: '/health/detailed', accepted: [200, 503] },
  { label: 'deployments list', path: '/api/v1/deployments', accepted: [200] },
];

async function check({ label, path, accepted }) {
  const startedAt = Date.now();
  const url = `${BASE_URL}${path}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    return {
      label,
      path,
      status: response.status,
      durationMs: Date.now() - startedAt,
      ok: accepted.includes(response.status),
    };
  } catch (error) {
    return {
      label,
      path,
      status: 0,
      durationMs: Date.now() - startedAt,
      ok: false,
      error: error.message,
    };
  }
}

async function main() {
  console.log('🚀 Smoke Deployment Service');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('');

  let failed = 0;
  for (const checkConfig of CHECKS) {
    const result = await check(checkConfig);
    const icon = result.ok ? '✅' : '❌';
    console.log(`${icon} ${result.label.padEnd(18)} ${String(result.status).padStart(3)} ${String(result.durationMs).padStart(5)}ms ${result.path}`);
    if (!result.ok) {
      failed += 1;
      console.log(`   → ${result.error || `unexpected status ${result.status}`}`);
    }
  }

  console.log('');
  console.log(`Tests échoués: ${failed}`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('❌ Erreur fatale deployment-service smoke:', error);
  process.exit(1);
});
