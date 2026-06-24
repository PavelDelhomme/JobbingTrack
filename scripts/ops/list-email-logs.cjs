#!/usr/bin/env node
/**
 * Liste les EmailLog récents (traçabilité digest, vérif, recap).
 * Usage: node scripts/ops/list-email-logs.cjs [--kind=email_agent_daily_digest] [--days=7]
 */

const path = require('node:path');
const { loadRootEnv, requestJson, loginAdminToken } = require('./load-root-env.cjs');

async function main() {
  const rootDir = path.join(__dirname, '../..');
  loadRootEnv(rootDir);
  const args = process.argv.slice(2);
  const kindArg = args.find((a) => a.startsWith('--kind='))?.split('=')[1] || '';
  const days = Number(args.find((a) => a.startsWith('--days='))?.split('=')[1] || 14);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { token, apiBase } = await loginAdminToken(rootDir);
  const params = new URLSearchParams({ limit: '50', page: '1', startDate: since });
  if (kindArg) params.set('channel', kindArg);

  const { status, data } = await requestJson(
    `${apiBase}/api/v1/emails/logs?${params}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (status !== 200) {
    throw new Error(`HTTP ${status}: ${JSON.stringify(data).slice(0, 300)}`);
  }

  const logs = data.emailLogs || data.logs || data.data || [];
  console.log(`EmailLog (${logs.length} lignes, depuis ${since.slice(0, 10)})`);
  for (const row of logs) {
    const kind = row.metadata?.kind || row.metadata?.channel || '—';
    const account = row.metadata?.accountEmail ? ` account=${row.metadata.accountEmail}` : '';
    console.log(
      `${row.sentAt || row.createdAt} | ${row.status} | ${row.to} | ${row.subject?.slice(0, 60)} | kind=${kind}${account}`,
    );
  }
}

main().catch((err) => {
  console.error('LIST FAIL:', err.message);
  process.exit(1);
});
