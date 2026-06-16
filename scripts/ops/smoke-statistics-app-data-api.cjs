#!/usr/bin/env node

const path = require("node:path");
const { loginAdminToken, requestJson } = require("./load-root-env.cjs");

function findUndefinedValues(obj, currentPath = "") {
  const hits = [];
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [key, value] of Object.entries(obj)) {
      if (String(key).toLowerCase() === "undefined") {
        hits.push(`${currentPath}.key:${key}`);
      }
      hits.push(...findUndefinedValues(value, `${currentPath}.${key}`));
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((value, index) => {
      hits.push(...findUndefinedValues(value, `${currentPath}[${index}]`));
    });
  } else if (typeof obj === "string" && obj.trim().toLowerCase() === "undefined") {
    hits.push(`${currentPath}=${obj}`);
  }
  return hits;
}

async function main() {
  const rootDir = path.join(__dirname, "../..");
  const { token, apiBase } = await loginAdminToken(rootDir);
  const headers = { Authorization: `Bearer ${token}` };

  const statsRes = await requestJson(`${apiBase}/api/v1/statistics`, { headers });
  const timelineRes = await requestJson(
    `${apiBase}/api/v1/statistics/timeline?time_range=7d&limit=500`,
    { headers },
  );

  const statistics = statsRes.data.statistics || {};
  const timeline = timelineRes.data.timeline || [];
  const totals = {
    applications: statistics.applications?.total,
    users: statistics.users?.total,
    companies: statistics.companies?.total,
    contacts: statistics.contacts?.total,
    interviews: statistics.interviews?.total,
    calls: statistics.calls?.total,
    followups: statistics.followups?.total,
    events: statistics.events?.total,
  };

  const undefinedHits = findUndefinedValues(statistics);
  const result = {
    success:
      statsRes.status === 200 &&
      Boolean(statsRes.data.success ?? true) &&
      undefinedHits.length === 0,
    statisticsStatus: statsRes.status,
    totals,
    timelinePoints: timeline.length,
    timelineNote: timelineRes.data.note || null,
    undefinedHits,
    summary: statistics.summary || {},
  };

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

  if (undefinedHits.length > 0) {
    process.exit(2);
  }
  if (statsRes.status !== 200) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("[smoke-statistics-app-data-api]", error.message);
  process.exit(1);
});
