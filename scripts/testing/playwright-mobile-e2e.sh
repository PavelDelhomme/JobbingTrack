#!/usr/bin/env bash
# Suite Playwright mobile (frontend). Appele par run-all-tests-with-reports.sh si adb device ou RUN_PLAYWRIGHT_MOBILE=1.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/../.." && pwd)"
cd "$ROOT/frontend" || exit 1
npm install --no-audit --no-fund 2>/dev/null || true

export FRONTEND_URL="${FRONTEND_URL:-http://localhost:5003}"
export PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-$FRONTEND_URL}"
export PLAYWRIGHT_TMPDIR="${PLAYWRIGHT_TMPDIR:-$ROOT/frontend/.tmp-playwright}"
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-$ROOT/frontend/.cache-playwright}"
export TMPDIR="${TMPDIR:-$PLAYWRIGHT_TMPDIR}"
mkdir -p "$PLAYWRIGHT_TMPDIR" "$PLAYWRIGHT_BROWSERS_PATH"

MOBILE_MODE="${PLAYWRIGHT_MOBILE_MODE:-smoke}"
MOBILE_PROJECT="${PLAYWRIGHT_MOBILE_PROJECT:-iPhone 13 Pro}"

if [ "$MOBILE_MODE" = "full" ]; then
  exec npx playwright test tests/e2e/mobile \
    --config=playwright.mobile.config.ts \
    --project="$MOBILE_PROJECT" \
    --reporter=list \
    "$@"
fi

# Mode smoke (par défaut) : couverture minimale et rapide pour l'agrégat make tests.
exec npx playwright test \
  tests/e2e/mobile/mobile-auth.spec.ts \
  --config=playwright.mobile.config.ts \
  --project="$MOBILE_PROJECT" \
  --reporter=line \
  --max-failures=1 \
  "$@"
