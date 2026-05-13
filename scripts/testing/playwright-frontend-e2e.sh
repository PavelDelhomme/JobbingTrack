#!/usr/bin/env bash
# Lance la suite Playwright E2E du frontend (standalone). Variables attendues (exportées par le parent) :
# PLAYWRIGHT_BASE_URL, API_URL, API_GATEWAY_URL, PLAYWRIGHT_WORKERS
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/frontend" || exit 1
npm install --no-audit --no-fund 2>/dev/null || true

FRONTEND_MODE="${PLAYWRIGHT_FRONTEND_MODE:-smoke}"

if [ "$FRONTEND_MODE" = "smoke" ]; then
  # Smoke court et stable pour make tests (évite les timeouts de la suite complète).
  exec npx playwright test \
    tests/e2e/login.spec.ts \
    tests/e2e/suivi-interim.spec.ts \
    tests/e2e/api-e2e.spec.ts \
    --config=playwright.standalone.config.ts \
    --reporter=line,json
fi

if [ -f playwright.standalone.config.ts ]; then
  ./node_modules/.bin/playwright test tests/e2e --config=playwright.standalone.config.ts --reporter=list,json 2>/dev/null \
    || npx playwright test tests/e2e --config=playwright.standalone.config.ts --reporter=list,json
else
  ./node_modules/.bin/playwright test tests/e2e --reporter=list,json 2>/dev/null \
    || npm run test:e2e -- --reporter=list,json
fi
