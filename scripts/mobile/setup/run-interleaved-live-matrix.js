#!/usr/bin/env node
/**
 * Matrice live entremêlée : seed réaliste + smokes API + rapport HTML + email porteur.
 *
 * Usage :
 *   node scripts/mobile/setup/run-interleaved-live-matrix.js
 *   node scripts/mobile/setup/run-interleaved-live-matrix.js --no-email
 *   node scripts/mobile/setup/run-interleaved-live-matrix.js --seed-only
 *
 * Prérequis : stack up, TEST_USER_* dans .env, gateway 5002.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const REPORTS = path.join(ROOT, 'scripts/ops/reports');
const args = new Set(process.argv.slice(2));
const SKIP_EMAIL = args.has('--no-email');
const SEED_ONLY = args.has('--seed-only');

function run(label, cmd, cmdArgs, optional = false) {
  console.log(`\n>>> ${label}\n`);
  const r = spawnSync(cmd, cmdArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
    env: process.env,
  });
  const out = `${r.stdout || ''}${r.stderr || ''}`.trim();
  if (out) console.log(out);
  const ok = r.status === 0;
  if (!ok && !optional) {
    console.error(`\nKO ${label} (exit ${r.status})\n`);
  }
  return { ok, out, exit: r.status ?? 1 };
}

function extractBilan(text, pattern) {
  const m = text.match(pattern);
  return m ? m[0] : '—';
}

function buildHtml(steps) {
  const date = new Date().toISOString().slice(0, 10);
  const rows = steps
    .map(
      (s) =>
        `<tr><td style="padding:8px 12px;border:1px solid #e2e8f0;">${s.label}</td>` +
        `<td style="padding:8px 12px;border:1px solid #e2e8f0;color:${s.ok ? '#15803d' : '#b91c1c'};font-weight:600;">${s.ok ? 'OK' : 'KO'}</td>` +
        `<td style="padding:8px 12px;border:1px solid #e2e8f0;font-size:13px;"><pre style="margin:0;white-space:pre-wrap;font-family:system-ui,sans-serif;">${escapeHtml((s.summary || s.out || '').slice(0, 800))}</pre></td></tr>`,
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"/><title>Matrice live mobile ${date}</title></head>
<body style="font-family:system-ui,sans-serif;max-width:900px;margin:24px auto;color:#1e293b;">
<h1 style="color:#1d4ed8;">JobbingTrack — Matrice entités entremêlées</h1>
<p>Date : ${date} · Compte <code>TEST_USER</code> · Seed Capgemini/Orange/Thales/Atos/Sopra/Dassault/OVH + contacts/relances/entretiens/appels/calendrier.</p>
<h2>Résultats</h2>
<table style="border-collapse:collapse;width:100%;">${rows}</table>
<h2>Suite porteur (validation)</h2>
<ol>
<li>Mobile : <strong>Paramètres → Aide &amp; retours → Signaler un bug</strong> → message test → Envoyer</li>
<li>Backoffice : <strong>Administration → Mobile — erreurs &amp; retours</strong> → ligne ~20 s → détail diagnostic/capture</li>
<li>Répondre chat : <code>OK Mobile logs backoffice</code> puis étape 2 ligne 320</li>
</ol>
<h2>Commandes</h2>
<pre style="background:#f1f5f9;padding:12px;border-radius:8px;">node scripts/mobile/setup/run-interleaved-live-matrix.js
make apk-reinstall
bash scripts/mobile/setup/restart-emulator-controller.sh</pre>
</body></html>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function main() {
  fs.mkdirSync(REPORTS, { recursive: true });
  const steps = [];

  steps.push({
    label: 'Comptes test prêts',
    ...(() => {
      const r = run('ensure-test-accounts-ready', 'node', [
        'scripts/mobile/ensure-test-accounts-ready.js',
      ]);
      r.summary = r.out.split('\n').slice(-3).join(' ') || 'comptes test';
      return r;
    })(),
  });

  steps.push({
    label: 'Seed réaliste entremêlé',
    ...(() => {
      const r = run('seed-realistic-user-data-api', 'node', [
        'scripts/mobile/setup/seed-realistic-user-data-api.js',
      ]);
      r.summary = r.out.split('\n').slice(-5).join(' ') || 'seed';
      return r;
    })(),
  });

  if (SEED_ONLY) {
    console.log('\n--seed-only : arrêt après seed.\n');
    process.exit(steps.every((s) => s.ok) ? 0 : 1);
  }

  const interleaved = run('smoke-interleaved-entities-api', 'node', [
    'scripts/mobile/smoke/api/smoke-interleaved-entities-api.js',
  ]);
  interleaved.summary = extractBilan(
    interleaved.out,
    /Bilan entités entremêlées : \d+ OK, \d+ KO/,
  );
  steps.push({ label: 'Vérif entités entremêlées', ...interleaved });

  const journey = run('smoke-full-journey-api', 'node', [
    'scripts/mobile/smoke/api/smoke-full-journey-api.js',
  ]);
  journey.summary = extractBilan(journey.out, /Bilan : \d+ OK, \d+ KO/);
  steps.push({ label: 'Parcours API complet', ...journey });

  const crash = run('smoke-mobile-crash-pipeline', 'node', [
    'scripts/ops/smoke-mobile-crash-pipeline.js',
  ]);
  crash.summary = crash.out.split('\n').pop() || 'pipeline crashes';
  steps.push({ label: 'Pipeline crash / retours', ...crash });

  const html = buildHtml(steps);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const htmlPath = path.join(REPORTS, `recap-interleaved-live-matrix-${stamp}.html`);
  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log(`\nRapport : ${htmlPath}\n`);

  const allOk = steps.every((s) => s.ok);

  if (!SKIP_EMAIL) {
    const subject = `[JobbingTrack] Matrice mobile entremêlée ${new Date().toISOString().slice(0, 10)} — ${allOk ? 'OK' : 'KO partiel'}`;
    const email = run(
      'send-agent-recap-email',
      'node',
      [
        'scripts/ops/send-agent-recap-email.cjs',
        '--subject',
        subject,
        '--html-file',
        htmlPath,
        '--to',
        process.env.AGENT_RECAP_EMAIL ||
          process.env.TEST_REAL_EMAIL ||
          'paul.delhomme@proton.me',
      ],
      true,
    );
    if (!email.ok) {
      console.warn('Email non envoyé (notification-service down ?) — rapport HTML disponible.');
    }
  }

  process.exit(allOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
