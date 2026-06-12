#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
RESULTS_ROOT="${TESTS_RESULTS_DIR:-${ROOT_DIR}/tests/results}"
OUT_DIR="${RESULTS_ROOT}/statistics-overview/${TIMESTAMP}"
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

HISTORY_EXIT=0
RANGES_EXIT=0
JEST_EXIT=0
PAGE_EXIT=0

run_step "statistics_history_smoke" "${OUT_DIR}/statistics-history-smoke.json" \
  /usr/bin/node scripts/ops/smoke-statistics-history-api.cjs || HISTORY_EXIT=$?

run_step "statistics_ranges_api" "${OUT_DIR}/statistics-ranges-api.json" \
  python3 - <<'PY' || RANGES_EXIT=$?
import json
import subprocess
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

key = subprocess.check_output(
    ["docker", "exec", "jobbingtrack-metrics-aggregator", "sh", "-lc", "printf %s \"$METRICS_API_KEY\""],
    text=True,
).strip()
base = "http://localhost:5004"
headers = {"X-API-Key": key, "User-Agent": "JobbingTrack-statistics-overview-validation"}
now = datetime.now(timezone.utc)

ranges = {
    "24h": now - timedelta(hours=24),
    "7d": now - timedelta(days=7),
}
results = []
for label, start in ranges.items():
    params = urllib.parse.urlencode(
        {
            "limit": "200",
            "startDate": start.isoformat().replace("+00:00", "Z"),
            "endDate": now.isoformat().replace("+00:00", "Z"),
        }
    )
    req = urllib.request.Request(f"{base}/api/v1/persistence/system/metrics?{params}", headers=headers)
    with urllib.request.urlopen(req, timeout=30) as response:
        payload = json.loads(response.read().decode("utf-8", "replace"))
        points = payload.get("data") or []
        with_availability = sum(
            1
            for point in points
            if point.get("availabilityPercent") is not None or point.get("availability_percent") is not None
        )
        with_error = sum(
            1
            for point in points
            if point.get("errorRate") is not None or point.get("error_rate") is not None
        )
        results.append(
            {
                "range": label,
                "status": response.status,
                "points": len(points),
                "withAvailability": with_availability,
                "withExplicitError": with_error,
            }
        )

print(json.dumps({"success": True, "ranges": results}, indent=2))
if not results or any(item["points"] <= 0 for item in results):
    raise SystemExit("Plage 24h ou 7j sans points system_metrics")
if all(item["withAvailability"] == 0 and item["withExplicitError"] == 0 for item in results):
    raise SystemExit("Aucune série dispo/erreur exploitable sur 24h et 7j")
PY

run_step "frontend_statistics_time_series" "${OUT_DIR}/frontend-statistics-time-series.txt" \
  bash -lc \
    'cd frontend && ./node_modules/.bin/jest --runTestsByPath src/lib/metrics/__tests__/statisticsTimeSeries.test.ts --runInBand --silent' || JEST_EXIT=$?

run_step "statistics_overview_page_smoke" "${OUT_DIR}/statistics-overview-page-smoke.txt" \
  python3 - <<'PY' || PAGE_EXIT=$?
import urllib.request

for url in [
    "http://localhost:5003/b4ck0ff1ce/statistics",
    "http://localhost:5003/b4ck0ff1ce/statistics/log-stats",
    "http://localhost:5003/b4ck0ff1ce/statistics/app-data",
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

let historySummary = null;
const historyPath = path.join(outDir, 'statistics-history-smoke.json');
if (fs.existsSync(historyPath)) {
  try {
    historySummary = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
  } catch {
    historySummary = null;
  }
}

let rangesSummary = null;
const rangesPath = path.join(outDir, 'statistics-ranges-api.json');
if (fs.existsSync(rangesPath)) {
  try {
    rangesSummary = JSON.parse(fs.readFileSync(rangesPath, 'utf8'));
  } catch {
    rangesSummary = null;
  }
}

const summary = {
  category: 'statistics-overview',
  timestamp: new Date().toISOString(),
  exitCode: steps.some((step) => step.exitCode !== 0) ? 1 : 0,
  totals: {
    steps: steps.length,
    passed: steps.filter((step) => step.exitCode === 0).length,
    failed: steps.filter((step) => step.exitCode !== 0).length,
  },
  history: historySummary,
  ranges: rangesSummary,
  steps,
};

fs.writeFileSync(summaryJsonPath, JSON.stringify(summary, null, 2));
fs.writeFileSync(
  summaryTxtPath,
  [
    'JobbingTrack — validation P1B Statistics vue d’ensemble',
    `timestamp: ${summary.timestamp}`,
    `exit: ${summary.exitCode}`,
    `steps: ${summary.totals.steps} | passed: ${summary.totals.passed} | failed: ${summary.totals.failed}`,
    `history points (7j): ${historySummary?.points ?? 'n/a'}`,
    `ranges: ${(rangesSummary?.ranges || []).map((item) => `${item.range}=${item.points}`).join(', ') || 'n/a'}`,
  ].join('\n') + '\n',
);
NODE

EXIT_CODE=0
if [[ "${HISTORY_EXIT}" -ne 0 || "${RANGES_EXIT}" -ne 0 || "${JEST_EXIT}" -ne 0 || "${PAGE_EXIT}" -ne 0 ]]; then
  EXIT_CODE=1
fi

echo "Rapport statistics-overview : ${OUT_DIR}"
exit "${EXIT_CODE}"
