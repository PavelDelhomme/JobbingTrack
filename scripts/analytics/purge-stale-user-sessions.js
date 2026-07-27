#!/usr/bin/env node
/**
 * Ferme les sessions analytics « actives » obsolètes et purge optionnelle des anciennes lignes.
 *
 * Usage :
 *   node scripts/analytics/purge-stale-user-sessions.js --confirm
 *   node scripts/analytics/purge-stale-user-sessions.js --confirm --purge-days 90
 *   node scripts/analytics/purge-stale-user-sessions.js --confirm --user-id <uuid>
 *
 * Prérequis : stack up (postgres + gateway), .env racine.
 */
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ROOT = path.join(__dirname, '../..');
const { loadRootEnv, loginAdminToken, requestJson } = require(path.join(ROOT, 'scripts/ops/load-root-env.cjs'));

const PG_CONTAINER = process.env.POSTGRES_CONTAINER || 'jobbingtrack-postgres';
const PG_USER = process.env.POSTGRES_USER || 'jobbingtrack';
const PG_DB = process.env.POSTGRES_DB || 'jobbingtrack';

function psqlQuery(sql) {
  const out = execFileSync(
    'docker',
    ['exec', PG_CONTAINER, 'psql', '-U', PG_USER, '-d', PG_DB, '-t', '-A', '-F', ',', '-c', sql],
    { encoding: 'utf8' },
  ).trim();
  return out;
}

function countSessions() {
  const row = psqlQuery(
    'SELECT COUNT(*)::int, COUNT(*) FILTER (WHERE "isActive" = true)::int FROM user_sessions;',
  );
  const [total, active] = row.split(',').map((v) => parseInt(v, 10) || 0);
  return { total, active };
}

function purgeInactiveOlderThan(days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const iso = cutoff.toISOString();
  const countRow = psqlQuery(
    `WITH d AS (DELETE FROM user_sessions WHERE "isActive" = false AND "startTime" < '${iso}' RETURNING 1) SELECT COUNT(*)::int FROM d;`,
  );
  return parseInt(countRow, 10) || 0;
}

function parseArgs(argv) {
  const args = { confirm: false, purgeDays: 0, userId: null };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--confirm') args.confirm = true;
    else if (a === '--purge-days') args.purgeDays = parseInt(argv[++i], 10) || 0;
    else if (a === '--user-id') args.userId = argv[++i] || null;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.confirm) {
    console.error('Ajoutez --confirm pour exécuter la réconciliation / purge.');
    process.exit(1);
  }

  loadRootEnv(ROOT);

  const before = countSessions();
  console.log(`Avant : ${before.total} sessions (${before.active} actives)`);

  const { token, apiBase } = await loginAdminToken(ROOT);
  const qs = args.userId ? `?userId=${encodeURIComponent(args.userId)}` : '';
  const reconcile = await requestJson(`${apiBase}/api/v1/analytics/sessions/reconcile-stale${qs}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (reconcile.status < 200 || reconcile.status >= 300) {
    console.error('Reconcile API KO:', reconcile.status, reconcile.data);
    process.exit(1);
  }
  console.log('Reconcile API OK:', reconcile.data?.data || reconcile.data);

  if (args.purgeDays > 0) {
    const purged = purgeInactiveOlderThan(args.purgeDays);
    console.log(`Purge sessions inactives > ${args.purgeDays} j : ${purged} ligne(s)`);
  }

  const after = countSessions();
  console.log(`Après : ${after.total} sessions (${after.active} actives)`);
  console.log('OK purge-stale-user-sessions');
}

main().catch((e) => {
  console.error('KO:', e.message || e);
  process.exit(1);
});
