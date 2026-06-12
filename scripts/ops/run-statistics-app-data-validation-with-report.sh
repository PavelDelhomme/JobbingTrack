#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
RESULTS_ROOT="${TESTS_RESULTS_DIR:-${ROOT_DIR}/tests/results}"
OUT_DIR="${RESULTS_ROOT}/statistics-app-data/${TIMESTAMP}"
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

API_EXIT=0
DB_EXIT=0
PAGE_EXIT=0
UNDEFINED_EXIT=0

run_step "app_data_api_smoke" "${OUT_DIR}/app-data-api-smoke.json" \
  python3 - "${ROOT_DIR}" <<'PY' || API_EXIT=$?
import json
import sys
import urllib.request
from pathlib import Path

root = Path(sys.argv[1])
env = {}
for line in (root / ".env").read_text().splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    key, value = line.split("=", 1)
    env[key.strip()] = value.strip().strip('"').strip("'")

api_base = f"http://localhost:{env.get('API_GATEWAY_PORT', '5002')}"
email = env.get("ADMIN_EMAIL") or env.get("TEST_ADMIN_EMAIL") or "admin@jobbingtrack.test"
password = env.get("ADMIN_PASSWORD") or env.get("TEST_ADMIN_PASSWORD") or "password123"

login_req = urllib.request.Request(
    f"{api_base}/api/v1/auth/login",
    data=json.dumps({"email": email, "password": password}).encode(),
    headers={"Content-Type": "application/json"},
    method="POST",
)
with urllib.request.urlopen(login_req, timeout=30) as response:
    login = json.loads(response.read().decode())
token = login.get("token") or (login.get("data") or {}).get("token")
if not token:
    raise RuntimeError("JWT admin introuvable")

headers = {"Authorization": f"Bearer {token}"}


def get_json(path):
    req = urllib.request.Request(f"{api_base}{path}", headers=headers)
    with urllib.request.urlopen(req, timeout=60) as response:
        return response.status, json.loads(response.read().decode())


def find_undefined_values(obj, path=""):
    hits = []
    if isinstance(obj, dict):
        for key, value in obj.items():
            if str(key).lower() == "undefined":
                hits.append(f"{path}.key:{key}")
            hits.extend(find_undefined_values(value, f"{path}.{key}"))
    elif isinstance(obj, list):
        for index, value in enumerate(obj):
            hits.extend(find_undefined_values(value, f"{path}[{index}]"))
    elif isinstance(obj, str) and obj.strip().lower() == "undefined":
        hits.append(f"{path}={obj}")
    return hits


status, stats_payload = get_json("/api/v1/statistics")
statistics = stats_payload.get("statistics") or {}
_, timeline_payload = get_json("/api/v1/statistics/timeline?time_range=7d&limit=500")
timeline = timeline_payload.get("timeline") or []

totals = {
    key: (statistics.get(key) or {}).get("total")
    for key in [
        "applications",
        "users",
        "companies",
        "contacts",
        "interviews",
        "calls",
        "followups",
        "events",
    ]
}

undefined_hits = find_undefined_values(statistics)
result = {
    "success": stats_payload.get("success", True) and status == 200,
    "statisticsStatus": status,
    "totals": totals,
    "timelinePoints": len(timeline),
    "timelineNote": timeline_payload.get("note"),
    "undefinedHits": undefined_hits,
    "summary": statistics.get("summary") or {},
}

print(json.dumps(result, indent=2, ensure_ascii=False))
if undefined_hits:
    sys.exit(2)
PY

run_step "app_data_db_counts" "${OUT_DIR}/app-data-db-counts.txt" \
  docker exec jobbingtrack-postgres sh -lc \
    'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "SELECT '\''applications'\'', COUNT(*) FROM \"Application\" UNION ALL SELECT '\''users'\'', COUNT(*) FROM \"User\" UNION ALL SELECT '\''companies'\'', COUNT(*) FROM \"Company\" UNION ALL SELECT '\''contacts'\'', COUNT(*) FROM \"Contact\" UNION ALL SELECT '\''interviews'\'', COUNT(*) FROM \"Interview\" UNION ALL SELECT '\''calls'\'', COUNT(*) FROM \"Call\" UNION ALL SELECT '\''followups'\'', COUNT(*) FROM \"FollowUp\" UNION ALL SELECT '\''events'\'', COUNT(*) FROM \"Event\";"' || DB_EXIT=$?

run_step "app_data_page_smoke" "${OUT_DIR}/app-data-page-smoke.txt" \
  python3 - <<'PY' || PAGE_EXIT=$?
import urllib.request

for url in [
    "http://localhost:5003/b4ck0ff1ce/statistics/app-data",
    "http://localhost:5003/b4ck0ff1ce/statistics",
]:
    with urllib.request.urlopen(url, timeout=20) as response:
        print(url, response.status)
PY

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
