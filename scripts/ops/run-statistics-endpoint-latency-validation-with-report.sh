#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
RESULTS_ROOT="${TESTS_RESULTS_DIR:-${ROOT_DIR}/tests/results}"
OUT_DIR="${RESULTS_ROOT}/statistics-endpoint-latency/${TIMESTAMP}"
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
JEST_EXIT=0
PAGE_EXIT=0

run_step "priority_services_api" "${OUT_DIR}/priority-services-api.json" \
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
email = env.get("ADMIN_EMAIL") or "admin@jobbingtrack.test"
password = env.get("ADMIN_PASSWORD") or "password123"

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

req = urllib.request.Request(
    f"{api_base}/api/v1/metrics",
    headers={"Authorization": f"Bearer {token}"},
)
with urllib.request.urlopen(req, timeout=60) as response:
    metrics = json.loads(response.read().decode())

priority = [
    "auth-service",
    "deployment-service",
    "call-service",
    "notification-service",
    "followup-service",
    "application-service",
    "postgres",
]
services_list = metrics.get("servicesList") or []
per_service = (metrics.get("responseTime") or {}).get("per_service") or []

def match_service(short_name: str):
    for entry in services_list:
        raw = (entry.get("rawName") or entry.get("name") or "").lower()
        if short_name in raw:
            return entry
    return None

rows = []
missing = []
for short_name in priority:
    entry = match_service(short_name)
    if not entry:
        missing.append(short_name)
        rows.append({"service": short_name, "present": False})
        continue
    ms = entry.get("responseTimeMs")
    health_rt = (entry.get("health") or {}).get("responseTime")
    label = (
        "Santé Docker"
        if short_name in {"postgres", "redis"}
        else (f"{int(ms)}ms" if isinstance(ms, (int, float)) and ms > 0 else "N/A")
    )
    rows.append(
        {
            "service": short_name,
            "present": True,
            "status": entry.get("status"),
            "responseTimeMs": ms,
            "healthResponseTime": health_rt,
            "label": label,
        }
    )

result = {
    "success": len(missing) == 0,
    "priorityServices": rows,
    "missing": missing,
    "perServiceCount": len(per_service),
    "servicesListCount": len(services_list),
    "responseAverageMs": (metrics.get("responseTime") or {}).get("average_ms"),
}
print(json.dumps(result, indent=2, ensure_ascii=False))

if missing:
    raise SystemExit(f"Services prioritaires absents: {', '.join(missing)}")

http_missing = [
    row["service"]
    for row in rows
    if row["service"] not in {"postgres", "redis"}
    and not (isinstance(row.get("responseTimeMs"), (int, float)) and row["responseTimeMs"] > 0)
]
if http_missing:
    raise SystemExit(f"Services HTTP sans mesure: {', '.join(http_missing)}")
PY

run_step "frontend_latency_jest" "${OUT_DIR}/frontend-latency-jest.txt" \
  bash -lc \
    'cd frontend && ./node_modules/.bin/jest --runTestsByPath src/lib/metrics/performanceCorrelationModel.test.ts src/lib/metrics/__tests__/serviceHealthOverview.test.ts src/components/monitoring/PriorityResponseServicesSummary.test.tsx --runInBand --silent' || JEST_EXIT=$?

run_step "latency_pages_smoke" "${OUT_DIR}/latency-pages-smoke.txt" \
  python3 - <<'PY' || PAGE_EXIT=$?
import urllib.request

for url in [
    "http://localhost:5003/b4ck0ff1ce/performances",
    "http://localhost:5003/b4ck0ff1ce/performances/latency",
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

let apiSummary = null;
const apiPath = path.join(outDir, 'priority-services-api.json');
if (fs.existsSync(apiPath)) {
  try {
    apiSummary = JSON.parse(fs.readFileSync(apiPath, 'utf8'));
  } catch {
    apiSummary = null;
  }
}

const summary = {
  category: 'statistics-endpoint-latency',
  timestamp: new Date().toISOString(),
  exitCode: steps.some((step) => step.exitCode !== 0) ? 1 : 0,
  totals: {
    steps: steps.length,
    passed: steps.filter((step) => step.exitCode === 0).length,
    failed: steps.filter((step) => step.exitCode !== 0).length,
  },
  api: apiSummary,
  steps,
};

fs.writeFileSync(summaryJsonPath, JSON.stringify(summary, null, 2));
fs.writeFileSync(
  summaryTxtPath,
  [
    'JobbingTrack — validation P1B temps de réponse endpoints',
    `timestamp: ${summary.timestamp}`,
    `exit: ${summary.exitCode}`,
    `steps: ${summary.totals.steps} | passed: ${summary.totals.passed} | failed: ${summary.totals.failed}`,
    `per_service: ${apiSummary?.perServiceCount ?? 'n/a'} | priority missing: ${(apiSummary?.missing || []).join(', ') || 'none'}`,
  ].join('\n') + '\n',
);
NODE

EXIT_CODE=0
if [[ "${API_EXIT}" -ne 0 || "${JEST_EXIT}" -ne 0 || "${PAGE_EXIT}" -ne 0 ]]; then
  EXIT_CODE=1
fi

echo "Rapport statistics-endpoint-latency : ${OUT_DIR}"
exit "${EXIT_CODE}"
