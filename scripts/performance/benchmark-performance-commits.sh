#!/usr/bin/env bash
# Benchmark performance avant/après — court et borné.
# Usage : bash scripts/performance/benchmark-performance-commits.sh
# Ne pas utiliser via make.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

RESULTS_DIR="${RESULTS_DIR:-$ROOT/tests/results/performance-benchmark/$(date -u +%Y%m%d-%H%M%S)}"
mkdir -p "$RESULTS_DIR"

ORIGINAL_REF="$(git rev-parse --abbrev-ref HEAD)"
ORIGINAL_SHA="$(git rev-parse HEAD)"
restore_git() {
  git checkout "$ORIGINAL_SHA" >/dev/null 2>&1 || git checkout "$ORIGINAL_REF" >/dev/null 2>&1
}

trap 'restore_git' EXIT

COMMITS=(
  "34fc84f4|AVANT|Avant les correctifs mémoire frontend (Next dev sans --webpack, pas de plafond Statistics)"
  "69ec0b0d|APRES|État courant dev (webpack, plafond Statistics, refresh visible-tab, API mobile auth)"
)

restart_frontend() {
  echo "  → recreate frontend borné..."
  timeout 180s docker compose -f docker-compose.yml up -d --force-recreate --no-deps frontend >/dev/null 2>&1 || true
  local i=0
  while [ "$i" -lt 30 ]; do
    if curl -fsS -o /dev/null "http://localhost:5003/health" 2>/dev/null; then
      return 0
    fi
    sleep 3
    i=$((i + 1))
  done
  echo "  ⚠️ frontend health timeout"
  return 1
}

frontend_mem_mib() {
  docker stats jobbingtrack-frontend --no-stream --format '{{.MemUsage}}' 2>/dev/null | head -1 || echo "n/a"
}

frontend_restart_count() {
  docker inspect jobbingtrack-frontend --format '{{.RestartCount}}' 2>/dev/null || echo "n/a"
}

next_dev_mode() {
  docker logs jobbingtrack-frontend 2>&1 | tail -80 | rg -o 'Next\.js [0-9.]+ \([^)]+\)' | tail -1 || echo "unknown"
}

curl_ms() {
  local url="$1"
  curl -sS -o /dev/null -w '%{time_total}' "$url" 2>/dev/null || echo "999"
}

run_perf_api() {
  local out="$1"
  PERF_LIGHT=1 /usr/bin/node tests/performance/test-performance.js >"$out" 2>&1 || true
  rg -o '[0-9]+/[0-9]+ réussis|Score: [0-9]+/100' "$out" 2>/dev/null | tr '\n' '; ' || true
}

run_mobile_auth() {
  if [ ! -f tests/performance/test-mobile-api-authenticated.js ]; then
    echo "N/A (script absent)"
    return 0
  fi
  local out="$1"
  PERF_LIGHT=1 /usr/bin/node tests/performance/test-mobile-api-authenticated.js >"$out" 2>&1 || true
  if rg -q 'Campagne API mobile authentifiée OK' "$out"; then
    rg -o '[0-9]+/[0-9]+ OK' "$out" | head -3 | tr '\n' '; '
  else
    echo "ECHEC"
  fi
}

run_playwright_subset() {
  local out="$1"
  if [ ! -x frontend/node_modules/.bin/playwright ]; then
    echo "N/A"
    return 0
  fi
  local start end elapsed
  start=$(date +%s)
  timeout 240s bash -lc '
    cd frontend
    TMPDIR="$PWD/.tmp-playwright" PLAYWRIGHT_BROWSERS_PATH="$PWD/.cache-playwright" \
    PLAYWRIGHT_BASE_URL=http://localhost:5003 PLAYWRIGHT_RETRIES=0 \
      ./node_modules/.bin/playwright test \
      tests/e2e/statistics-smoke.spec.ts \
      --project=chromium --workers=1 2>&1
  ' >"$out" 2>&1 || true
  end=$(date +%s)
  elapsed=$((end - start))
  local passed failed flaky
  passed=$(rg -o '[0-9]+ passed' "$out" | tail -1 | awk '{print $1}' || echo "?")
  failed=$(rg -o '[0-9]+ failed' "$out" | tail -1 | awk '{print $1}' || echo "0")
  flaky=$(rg -o '[0-9]+ flaky' "$out" | tail -1 | awk '{print $1}' || echo "0")
  echo "${elapsed}s|passed=${passed}|failed=${failed}|flaky=${flaky}"
}

chart_limit_7d() {
  if [ -f frontend/src/components/analytics/timeRangeUtils.ts ]; then
    rg 'case "7d"' -A2 frontend/src/components/analytics/timeRangeUtils.ts | rg -o 'limit = [^;]+' | head -1 || echo "unknown"
  else
    echo "n/a"
  fi
}

dev_script() {
  rg '"dev":' frontend/package.json | head -1 || echo "n/a"
}

SUMMARY_JSON="$RESULTS_DIR/summary.json"
echo "[" >"$SUMMARY_JSON"

first=1
for entry in "${COMMITS[@]}"; do
  IFS='|' read -r sha label desc <<<"$entry"
  echo ""
  echo "════════════════════════════════════════"
  echo "Benchmark: $label ($sha)"
  echo "$desc"
  echo "════════════════════════════════════════"

  git checkout "$sha" >/dev/null 2>&1

  restart_frontend || true
  sleep 8

  mem_idle="$(frontend_mem_mib)"
  restarts="$(frontend_restart_count)"
  mode="$(next_dev_mode)"
  health_ms="$(curl_ms http://localhost:5003/health)"
  login_redirect_ms="$(curl_ms http://localhost:5003/b4ck0ff1ce/statistics)"
  dev_cmd="$(dev_script)"
  limit7d="$(chart_limit_7d)"

  perf_log="$RESULTS_DIR/${sha}-perf-api.log"
  perf_summary="$(run_perf_api "$perf_log")"
  git checkout -- tests/reports/performance-report.json >/dev/null 2>&1 || true

  mobile_log="$RESULTS_DIR/${sha}-mobile-auth.log"
  mobile_summary="$(run_mobile_auth "$mobile_log")"

  mem_after_api="$(frontend_mem_mib)"

  pw_log="$RESULTS_DIR/${sha}-playwright.log"
  pw_summary="$(run_playwright_subset "$pw_log")"

  mem_after_pw="$(frontend_mem_mib)"

  if [ "$first" -eq 0 ]; then echo "," >>"$SUMMARY_JSON"; fi
  first=0

  python3 - <<PY >>"$SUMMARY_JSON"
import json
print(json.dumps({
  "sha": "$sha",
  "label": "$label",
  "description": """$desc""",
  "dev_script": """$dev_cmd""",
  "chart_limit_7d": """$limit7d""",
  "next_mode": """$mode""",
  "docker_restarts": """$restarts""",
  "memory_idle_mib": """$mem_idle""",
  "memory_after_api_mib": """$mem_after_api""",
  "memory_after_playwright_mib": """$mem_after_pw""",
  "health_ms": float("$health_ms"),
  "statistics_redirect_ms": float("$login_redirect_ms"),
  "perf_api_summary": """$perf_summary""",
  "mobile_auth_summary": """$mobile_summary""",
  "playwright_summary": """$pw_summary""",
}, ensure_ascii=False))
PY

  cat >"$RESULTS_DIR/${sha}-readable.txt" <<EOF
Commit: $sha ($label)
$desc
Dev: $dev_cmd
Plafond graphe 7j: $limit7d
Next: $mode
Restarts Docker: $restarts
Mémoire idle: $mem_idle
Mémoire après API tests: $mem_after_api
Mémoire après Playwright: $mem_after_pw
Health HTTP: ${health_ms}s
Statistics redirect: ${login_redirect_ms}s
Perf API: $perf_summary
Mobile auth: $mobile_summary
Playwright: $pw_summary
EOF

done

echo "]" >>"$SUMMARY_JSON"
restore_git
trap - EXIT

echo ""
echo "✅ Benchmark terminé — résultats: $RESULTS_DIR"
echo "   summary.json + logs par commit"
