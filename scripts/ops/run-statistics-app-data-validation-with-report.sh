#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
RESULTS_ROOT="${TESTS_RESULTS_DIR:-${ROOT_DIR}/tests/results}"
OUT_DIR="${RESULTS_ROOT}/statistics-app-data/${TIMESTAMP}"
mkdir -p "${OUT_DIR}"

cd "${ROOT_DIR}"

bash scripts/ops/ensure-dashboard-service-ready.sh

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

API_EXIT=0
DB_EXIT=0
PAGE_EXIT=0
UNDEFINED_EXIT=0

run_step "app_data_api_smoke" "${OUT_DIR}/app-data-api-smoke.json" \
  /usr/bin/node scripts/ops/smoke-statistics-app-data-api.cjs || API_EXIT=$?

run_step "app_data_db_counts" "${OUT_DIR}/app-data-db-counts.txt" \
  docker exec jobbingtrack-postgres sh -lc \
    'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "SELECT '\''applications'\'', COUNT(*) FROM \"Application\" UNION ALL SELECT '\''users'\'', COUNT(*) FROM \"User\" UNION ALL SELECT '\''companies'\'', COUNT(*) FROM \"Company\" UNION ALL SELECT '\''contacts'\'', COUNT(*) FROM \"Contact\" UNION ALL SELECT '\''interviews'\'', COUNT(*) FROM \"Interview\" UNION ALL SELECT '\''calls'\'', COUNT(*) FROM \"Call\" UNION ALL SELECT '\''followups'\'', COUNT(*) FROM \"FollowUp\" UNION ALL SELECT '\''events'\'', COUNT(*) FROM \"Event\";"' || DB_EXIT=$?

run_step "app_data_page_smoke" "${OUT_DIR}/app-data-page-smoke.txt" \
  /usr/bin/node scripts/ops/smoke-backoffice-page-urls.cjs \
    /backoffice/statistics/app-data \
    /backoffice/statistics || PAGE_EXIT=$?

run_step "undefined_guard" "${OUT_DIR}/undefined-guard.txt" \
  python3 - "${OUT_DIR}/app-data-api-smoke.json" <<'PY' || UNDEFINED_EXIT=$?
import json
import sys

payload = json.loads(open(sys.argv[1], encoding="utf-8").read())
hits = payload.get("undefinedHits") or []
if hits:
    print("undefined hits:", hits)
    raise SystemExit(2)
print("no undefined string values in /api/v1/statistics payload")
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

let apiSummary = null;
const apiPath = path.join(outDir, 'app-data-api-smoke.json');
if (fs.existsSync(apiPath)) {
  apiSummary = JSON.parse(fs.readFileSync(apiPath, 'utf8'));
}

const dbCounts = {};
const dbPath = path.join(outDir, 'app-data-db-counts.txt');
if (fs.existsSync(dbPath)) {
  for (const line of fs.readFileSync(dbPath, 'utf8').trim().split('\n')) {
    const [key, value] = line.split('|');
    if (key) dbCounts[key] = Number(value || 0);
  }
}

const summary = {
  category: 'statistics-app-data',
  timestamp: new Date().toISOString(),
  exitCode: steps.some((step) => step.exitCode !== 0) ? 1 : 0,
  totals: {
    steps: steps.length,
    passed: steps.filter((step) => step.exitCode === 0).length,
    failed: steps.filter((step) => step.exitCode !== 0).length,
  },
  api: apiSummary,
  dbCounts,
  steps,
};

fs.writeFileSync(summaryJsonPath, JSON.stringify(summary, null, 2));
fs.writeFileSync(
  summaryTxtPath,
  [
    'JobbingTrack — validation P1B Statistics app-data',
    `timestamp: ${summary.timestamp}`,
    `exit: ${summary.exitCode}`,
    `steps: ${summary.totals.steps} | passed: ${summary.totals.passed} | failed: ${summary.totals.failed}`,
    `timeline points: ${apiSummary?.timelinePoints ?? 0}`,
    `undefined hits: ${(apiSummary?.undefinedHits || []).length}`,
  ].join('\n') + '\n',
);
NODE

EXIT_CODE=0
if [[ "${API_EXIT}" -ne 0 || "${DB_EXIT}" -ne 0 || "${PAGE_EXIT}" -ne 0 || "${UNDEFINED_EXIT}" -ne 0 ]]; then
  EXIT_CODE=1
fi

echo "Rapport statistics-app-data : ${OUT_DIR}"
exit "${EXIT_CODE}"
