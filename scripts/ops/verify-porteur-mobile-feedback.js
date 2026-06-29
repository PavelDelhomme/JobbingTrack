#!/usr/bin/env node
/**
 * Vérifie qu'un retour porteur « Signaler un bug » est bien persisté (API + pièces jointes).
 * Usage :
 *   node scripts/ops/verify-porteur-mobile-feedback.js
 *   node scripts/ops/verify-porteur-mobile-feedback.js --message-contains "message de test"
 */
const { loadRootEnv } = require('./load-root-env.cjs');

loadRootEnv();

const BASE = (process.env.API_GATEWAY_URL || 'http://127.0.0.1:5002').replace(/\/$/, '');
const args = process.argv.slice(2);
const msgIdx = args.indexOf('--message-contains');
const needle = msgIdx >= 0 ? args[msgIdx + 1] : 'message de test';

async function main() {
  const res = await fetch(`${BASE}/api/v1/crashes?limit=50`);
  if (res.status !== 200) throw new Error(`GET /crashes HTTP ${res.status}`);
  const json = await res.json();
  const rows = json.data || [];
  const hit = rows.find((r) => String(r.message || '').toLowerCase().includes(needle.toLowerCase()));
  if (!hit) {
    console.error(`KO — aucun retour contenant « ${needle} » (${rows.length} entrées)`);
    process.exit(1);
  }

  const raw = hit.metadata || {};
  const nested = raw.metadata || {};
  const ageMs = Date.now() - new Date(hit.createdAt || hit.timestamp || 0).getTime();
  const ageMin = Math.round(ageMs / 60000);

  const proof = {
    id: hit.id,
    message: hit.message,
    crashType: hit.crashType,
    timestamp: hit.createdAt || hit.timestamp,
    ageMinutes: ageMin,
    screenName: raw.screenName || nested.screenName,
    category: nested.category,
    feedback: nested.feedback,
    hasDiagnostic: Boolean(nested.diagnosticCompressed),
    hasScreenshot: Boolean(nested.screenshotCompressed),
    deviceModel: raw.deviceInfo?.deviceModel || raw.device?.deviceModel,
    userId: raw.userId || nested.userId,
  };

  console.log('OK verify-porteur-mobile-feedback');
  console.log(JSON.stringify(proof, null, 2));

  if (!proof.hasDiagnostic && !proof.hasScreenshot) {
    console.warn('⚠ diagnostic/capture absents — vérifier options cochées côté mobile');
  }
  if (ageMin > 120) {
    console.warn(`⚠ retour daté de ${ageMin} min — envoyer un nouveau test si besoin`);
  }
}

main().catch((e) => {
  console.error('KO verify-porteur-mobile-feedback:', e.message);
  process.exit(1);
});
