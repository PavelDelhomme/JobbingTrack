#!/usr/bin/env node
/**
 * Rejeu digest agent quotidien (porteur) — supprime l'anti-doublon du jour puis cron.
 * Usage: node scripts/ops/send-test-agent-digest.cjs
 * @used-by docs/pilotage/TODOS_A_VERIFIER.md, validation digest agent manuelle
 */

const path = require('node:path');
const { execSync } = require('child_process');
const { loadRootEnv, requestJson } = require('./load-root-env.cjs');

const DIGEST_PREFIX = 'Digest recherche emploi JobbingTrack';

async function main() {
  const rootDir = path.join(__dirname, '../..');
  const env = loadRootEnv(rootDir);

  console.log('[1/2] Suppression anti-doublon digest du jour (EmailLog)');
  const candidates = [...new Set([env.INTERNAL_CRON_TOKEN, env.JWT_SECRET].filter(Boolean))];
  if (!candidates.length) throw new Error('INTERNAL_CRON_TOKEN ou JWT_SECRET manquant');

  console.log('[2/2] POST /email-agent/internal/cron-digest');
  const apiBase = `http://127.0.0.1:${env.API_GATEWAY_PORT || '5002'}`;
  let data;
  let status;
  for (const cronToken of candidates) {
    ({ status, data } = await requestJson(`${apiBase}/api/v1/email-agent/internal/cron-digest`, {
      method: 'POST',
      headers: { 'x-internal-cron-token': cronToken, 'Content-Type': 'application/json' },
      timeout: 120000,
    }));
    if (status === 200) break;
  }
  if (status !== 200) {
    throw new Error(`HTTP ${status}: ${JSON.stringify(data).slice(0, 400)}`);
  }
  console.log('  → sent:', data.sent, 'skipped:', data.skipped, 'failed:', data.failed);
  const sent = (data.results || []).filter((r) => r.ok);
  for (const row of sent) {
    console.log(`  → ${row.accountEmail || row.userId} → ${row.to} (${row.items} items)`);
  }
  console.log('DIGEST TEST OK — vérifiez Gmail pro + backoffice Emails (filtre Digest agent)');
}

main().catch((err) => {
  console.error('DIGEST TEST FAIL:', err.message);
  process.exit(1);
});
