#!/usr/bin/env node
'use strict';

/**
 * Smoke tests des services exposés par l'API Gateway.
 *
 * Objectif: vérifier les routes métier par le chemin prod-like (gateway/WAF/rate-limit),
 * sans appeler directement les ports internes des microservices.
 */

const { normalizeGatewayUrlForHost } = require('../helpers/dockerHostUrl');

const API_GATEWAY_URL = normalizeGatewayUrlForHost(
  process.env.API_GATEWAY_URL || process.env.API_URL || 'http://localhost:5002'
);

const DEFAULT_ALLOWED = [200, 204, 401, 403];
const CHECKS = [
  { service: 'api-gateway', path: '/health', allowed: [200] },
  { service: 'auth-service', path: '/api/v1/auth/health', allowed: [200] },
  { service: 'application-service', path: '/api/v1/applications' },
  { service: 'company-service', path: '/api/v1/companies' },
  { service: 'contact-service', path: '/api/v1/contacts' },
  { service: 'interview-service', path: '/api/v1/interviews' },
  { service: 'call-service', path: '/api/v1/calls' },
  { service: 'event-service', path: '/api/v1/events?limit=1' },
  { service: 'followup-service', path: '/api/v1/followups?limit=1' },
  { service: 'notification-service', path: '/api/v1/notifications?limit=1' },
  { service: 'dashboard-service', path: '/api/v1/dashboard' },
  { service: 'profile-service', path: '/api/v1/profile/me' },
  { service: 'workflow-service', path: '/api/v1/workflows' },
  { service: 'security-service', path: '/api/v1/security/logs?limit=1' },
];

async function checkEndpoint({ service, path, allowed = DEFAULT_ALLOWED }) {
  const startedAt = Date.now();
  const url = `${API_GATEWAY_URL}${path}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    const durationMs = Date.now() - startedAt;
    const ok = allowed.includes(response.status);
    return {
      service,
      path,
      status: response.status,
      durationMs,
      ok,
      message: ok ? 'reachable' : `unexpected status ${response.status}`,
    };
  } catch (error) {
    return {
      service,
      path,
      status: 0,
      durationMs: Date.now() - startedAt,
      ok: false,
      message: error.message,
    };
  }
}

async function main() {
  console.log('🚦 Smoke Gateway Services');
  console.log(`Gateway: ${API_GATEWAY_URL}`);
  console.log('');

  const results = [];
  for (const check of CHECKS) {
    const result = await checkEndpoint(check);
    results.push(result);
    const icon = result.ok ? '✅' : '❌';
    console.log(
      `${icon} ${result.service.padEnd(22)} ${String(result.status).padStart(3)} ${String(result.durationMs).padStart(5)}ms ${result.path}`
    );
    if (!result.ok) {
      console.log(`   → ${result.message}`);
    }
  }

  const passed = results.filter((result) => result.ok).length;
  const failed = results.length - passed;

  console.log('');
  console.log(`Total: ${results.length} tests`);
  console.log(`Tests réussis: ${passed}`);
  console.log(`Tests échoués: ${failed}`);
  console.log(`Success rate: ${((passed / results.length) * 100).toFixed(1)}%`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Erreur fatale smoke gateway services:', error);
  process.exit(1);
});
