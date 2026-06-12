#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
RESULTS_ROOT="${TESTS_RESULTS_DIR:-${ROOT_DIR}/tests/results}"
OUT_DIR="${RESULTS_ROOT}/statistics-log-stats/${TIMESTAMP}"
mkdir -p "${OUT_DIR}"

cd "${ROOT_DIR}"

SUMMARY_JSON="${OUT_DIR}/summary.json"
SUMMARY_TXT="${OUT_DIR}/summary.txt"

run_step() {
  local name="$1"
  local output_file="$2"
  shift 2

  set +e
  "$@" > "${output_file}" 2>&1
  local exit_code=$?
  set -e

  printf '%s|%s|%s\n' "${name}" "${exit_code}" "${output_file}" >> "${OUT_DIR}/steps.tsv"
  return "${exit_code}"
}

touch "${OUT_DIR}/steps.tsv"

STATS_EXIT=0
API_EXIT=0
DB_EXIT=0
PAGE_EXIT=0

run_step "persistence_stats_smoke" "${OUT_DIR}/persistence-stats-smoke.txt" \
  /usr/bin/node scripts/ops/smoke-persistence-stats.cjs || STATS_EXIT=$?

run_step "log_stats_api_smoke" "${OUT_DIR}/log-stats-api-smoke.json" \
  python3 - "${OUT_DIR}" <<'PY' || API_EXIT=$?
import json
import subprocess
import sys
from datetime import datetime, timedelta, timezone

out_dir = sys.argv[1]
key = subprocess.check_output(
    ["docker", "exec", "jobbingtrack-metrics-aggregator", "sh", "-lc", "printf %s \"$METRICS_API_KEY\""],
    text=True,
).strip()
since = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat().replace("+00:00", "Z")

endpoints = [
    "/api/v1/persistence/stats",
    f"/api/v1/persistence/logs?limit=800&startDate={since}",
    f"/api/v1/persistence/logs?limit=50&level=WARN&startDate={since}",
    f"/api/v1/persistence/logs?limit=50&serviceName=jobbingtrack-api-gateway&startDate={since}",
]

results = []
for path in endpoints:
    import urllib.request

    req = urllib.request.Request(
        "http://localhost:5004" + path,
        headers={"X-API-Key": key, "User-Agent": "JobbingTrack-statistics-log-stats-validation"},
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        data = json.loads(response.read().decode("utf-8", "replace"))
        item = {
            "path": path.split("?")[0],
            "query": path.split("?", 1)[1] if "?" in path else "",
            "status": response.status,
            "success": bool(data.get("success", True)),
            "count": data.get("count"),
        }
        if path.endswith("/stats"):
            counts = (data.get("data") or {}).get("counts") or {}
            item["aggregatedLogs"] = counts.get("aggregatedLogs")
            item["logCollectorLogs"] = counts.get("logCollectorLogs")
            item["containerLogs"] = counts.get("containerLogs")
        results.append(item)

print(json.dumps({"success": True, "endpoints": results}, indent=2))
PY

run_step "aggregated_logs_db" "${OUT_DIR}/aggregated-logs-db.txt" \
  docker exec jobbingtrack-postgres sh -lc \
    'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "SELECT COUNT(*), COUNT(DISTINCT \"serviceName\"), MAX(timestamp) FROM aggregated_logs;"' || DB_EXIT=$?

run_step "log_stats_page_smoke" "${OUT_DIR}/log-stats-page-smoke.txt" \
  python3 - <<'PY' || PAGE_EXIT=$?
import urllib.request

for url in [
    "http://localhost:5003/b4ck0ff1ce/statistics/log-stats",
    "http://localhost:5003/b4ck0ff1ce/statistics",
]:
    with urllib.request.urlopen(url, timeout=20) as response:
        print(url, response.status)
PY

node - "${OUT_DIR}" "${SUMMARY_JSON}" "${SUMMARY_TXT}" <<'NODE'
const fs = require('fs');
const path = require('path');

const [, , outDir, summaryJsonPath, summaryTxtPath] = process.argv;
const steps = fs
  .readFileSync(path.join(outDir, 'steps.tsv'), 'utf8')
  .trim()
  .split('\n')
  .filter(Boolean)
  .map((line) => {
    const [name, exitCode, outputFile] = line.split('|');
    return { name, exitCode: Number(exitCode), outputFile };
  });

const dbRaw = fs.existsSync(path.join(outDir, 'aggregated-logs-db.txt'))
  ? fs.readFileSync(path.join(outDir, 'aggregated-logs-db.txt'), 'utf8').trim()
  : '';
const [logCount, serviceCount, newestLog] = dbRaw.split('|');

let apiSummary = null;
const apiPath = path.join(outDir, 'log-stats-api-smoke.json');
if (fs.existsSync(apiPath)) {
  try {
    apiSummary = JSON.parse(fs.readFileSync(apiPath, 'utf8'));
  } catch {
    apiSummary = null;
  }
}

const summary = {
  category: 'statistics-log-stats',
  timestamp: new Date().toISOString(),
  exitCode: steps.some((step) => step.exitCode !== 0) ? 1 : 0,
  totals: {
    steps: steps.length,
    passed: steps.filter((step) => step.exitCode === 0).length,
    failed: steps.filter((step) => step.exitCode !== 0).length,
  },
  aggregatedLogs: {
    count: Number(logCount || 0),
    distinctServices: Number(serviceCount || 0),
    newestLog: newestLog || null,
  },
  api: apiSummary,
  steps,
};

fs.writeFileSync(summaryJsonPath, JSON.stringify(summary, null, 2));
fs.writeFileSync(
  summaryTxtPath,
  [
    'JobbingTrack — validation P1B Statistics log-stats',
    `timestamp: ${summary.timestamp}`,
    `exit: ${summary.exitCode}`,
    `steps: ${summary.totals.steps} | passed: ${summary.totals.passed} | failed: ${summary.totals.failed}`,
    `aggregated_logs: ${summary.aggregatedLogs.count} lignes | services: ${summary.aggregatedLogs.distinctServices} | newest: ${summary.aggregatedLogs.newestLog || 'n/a'}`,
  ].join('\n') + '\n',
);
NODE

EXIT_CODE=0
if [[ "${STATS_EXIT}" -ne 0 || "${API_EXIT}" -ne 0 || "${DB_EXIT}" -ne 0 || "${PAGE_EXIT}" -ne 0 ]]; then
  EXIT_CODE=1
fi

echo "Rapport statistics-log-stats : ${OUT_DIR}"
exit "${EXIT_CODE}"
