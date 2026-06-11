#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
RESULTS_ROOT="${TESTS_RESULTS_DIR:-${ROOT_DIR}/tests/results}"
OUT_DIR="${RESULTS_ROOT}/performance-correlation/${TIMESTAMP}"
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

VALIDATE_EXIT=0
SMOKE_EXIT=0
JEST_EXIT=0
API_EXIT=0
DB_EXIT=0

run_step "central_logging_compose" "${OUT_DIR}/central-logging-compose.txt" \
  /usr/bin/node scripts/ops/validate-central-logging-compose.cjs || VALIDATE_EXIT=$?

run_step "central_logging_runtime" "${OUT_DIR}/central-logging-runtime.txt" \
  /usr/bin/node scripts/ops/smoke-central-logging-runtime.cjs || SMOKE_EXIT=$?

run_step "frontend_correlation_model" "${OUT_DIR}/frontend-correlation-model.txt" \
  bash -lc \
    'cd frontend && ./node_modules/.bin/jest --runTestsByPath src/lib/metrics/performanceCorrelationModel.test.ts --runInBand --silent' || JEST_EXIT=$?

run_step "metrics_api_smoke" "${OUT_DIR}/metrics-api-smoke.json" \
  python3 - "${OUT_DIR}" <<'PY' || API_EXIT=$?
import json
import subprocess
import sys
import urllib.request

out_dir = sys.argv[1]
key = subprocess.check_output(
    ["docker", "exec", "jobbingtrack-metrics-aggregator", "sh", "-lc", "printf %s \"$METRICS_API_KEY\""],
    text=True,
).strip()

endpoints = [
    "/api/v1/docker/services/all",
    "/api/v1/persistence/logs?limit=5",
    "/api/v1/persistence/system/metrics?limit=5",
    "/api/v1/persistence/services/jobbingtrack-api-gateway/availability?limit=5",
    "/api/v1/persistence/stats",
]

results = []
for path in endpoints:
    req = urllib.request.Request(
        "http://localhost:5004" + path,
        headers={"X-API-Key": key, "User-Agent": "JobbingTrack-performance-correlation-validation"},
    )
    with urllib.request.urlopen(req, timeout=20) as response:
        data = json.loads(response.read().decode("utf-8", "replace"))
        item = {"path": path, "status": response.status, "success": bool(data.get("success", True))}
        if isinstance(data.get("data"), list):
            item["dataCount"] = len(data["data"])
        if isinstance(data.get("services"), list):
            item["servicesCount"] = len(data["services"])
        if "count" in data:
            item["count"] = data["count"]
        results.append(item)

print(json.dumps({"success": True, "endpoints": results}, indent=2))
PY

run_step "aggregated_logs_db" "${OUT_DIR}/aggregated-logs-db.txt" \
  docker exec jobbingtrack-postgres sh -lc \
    'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "SELECT COUNT(*), COUNT(DISTINCT \"serviceName\"), MAX(timestamp) FROM aggregated_logs;"' || DB_EXIT=$?

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

const summary = {
  category: 'performance-correlation',
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
  steps,
};

fs.writeFileSync(summaryJsonPath, JSON.stringify(summary, null, 2));
fs.writeFileSync(
  summaryTxtPath,
  [
    'JobbingTrack — validation P1B corrélation performances',
    `timestamp: ${summary.timestamp}`,
    `exit: ${summary.exitCode}`,
    `steps: ${summary.totals.steps} | passed: ${summary.totals.passed} | failed: ${summary.totals.failed}`,
    `aggregated_logs: ${summary.aggregatedLogs.count} lignes | services: ${summary.aggregatedLogs.distinctServices} | newest: ${summary.aggregatedLogs.newestLog || 'n/a'}`,
  ].join('\n') + '\n',
);
NODE

EXIT_CODE=0
if [[ "${VALIDATE_EXIT}" -ne 0 || "${SMOKE_EXIT}" -ne 0 || "${JEST_EXIT}" -ne 0 || "${API_EXIT}" -ne 0 || "${DB_EXIT}" -ne 0 ]]; then
  EXIT_CODE=1
fi

echo "Rapport performance-correlation : ${OUT_DIR}"
exit "${EXIT_CODE}"
