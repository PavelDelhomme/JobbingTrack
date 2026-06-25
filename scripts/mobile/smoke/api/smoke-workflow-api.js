#!/usr/bin/env node
/**
 * Smoke API workflow-service via gateway :
 * - GET /api/v1/workflows/status
 * - POST /api/v1/workflows/dev/jobs/autoCleanTrash/run (dev uniquement)
 *
 *   node scripts/mobile/smoke/api/smoke-workflow-api.js
 */

const { GATEWAY_URL } = require('../../lib/resolve-admin-credentials');

async function getJson(path, opts = {}) {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method: opts.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
    body: opts.body != null ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 300) };
  }
  return { status: res.status, body };
}

(async () => {
  console.log(`Gateway: ${GATEWAY_URL}`);

  const status = await getJson('/api/v1/workflows/status');
  if (status.status !== 200 || !status.body?.success) {
    throw new Error(`status HTTP ${status.status}: ${JSON.stringify(status.body)}`);
  }
  const jobs = status.body?.data?.jobs;
  if (!Array.isArray(jobs) || jobs.length < 5) {
    throw new Error(`catalogue jobs incomplet: ${jobs?.length ?? 0}`);
  }
  console.log(`Workflow status OK — ${jobs.length} jobs cron catalogués`);

  const headers = {};
  if (process.env.WORKFLOW_DEV_TRIGGER_SECRET) {
    headers['X-Workflow-Dev-Secret'] = process.env.WORKFLOW_DEV_TRIGGER_SECRET;
  }

  const run = await getJson('/api/v1/workflows/dev/jobs/autoCleanTrash/run', {
    method: 'POST',
    headers,
  });
  if (run.status !== 200 || !run.body?.success) {
    throw new Error(`trigger autoCleanTrash HTTP ${run.status}: ${JSON.stringify(run.body)}`);
  }
  console.log('Trigger dev autoCleanTrash OK:', run.body.data);

  console.log('\nSmoke workflow API OK');
})().catch((err) => {
  console.error('Smoke workflow API KO:', err.message);
  process.exit(1);
});
