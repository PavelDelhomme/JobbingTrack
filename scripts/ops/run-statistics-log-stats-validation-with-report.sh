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
  /usr/bin/node scripts/ops/smoke-statistics-log-stats-api.cjs || API_EXIT=$?

run_step "aggregated_logs_db" "${OUT_DIR}/aggregated-logs-db.txt" \
  docker exec jobbingtrack-postgres sh -lc \
    'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "SELECT COUNT(*), COUNT(DISTINCT \"serviceName\"), MAX(timestamp) FROM aggregated_logs;"' || DB_EXIT=$?

run_step "log_stats_page_smoke" "${OUT_DIR}/log-stats-page-smoke.txt" \
  /usr/bin/node scripts/ops/smoke-backoffice-page-urls.cjs \
    /backoffice/statistics/log-stats \
    /backoffice/statistics || PAGE_EXIT=$?

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
