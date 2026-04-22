#!/usr/bin/env bash
# Lance la suite Playwright E2E du frontend (standalone). Variables attendues (exportées par le parent) :
# PLAYWRIGHT_BASE_URL, API_URL, API_GATEWAY_URL, PLAYWRIGHT_WORKERS
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/frontend" || exit 1
npm install --no-audit --no-fund 2>/dev/null || true
if [ -f playwright.standalone.config.ts ]; then
  ./node_modules/.bin/playwright test tests/e2e --config=playwright.standalone.config.ts --reporter=list,json 2>/dev/null \
    || npx playwright test tests/e2e --config=playwright.standalone.config.ts --reporter=list,json
else
  ./node_modules/.bin/playwright test tests/e2e --reporter=list,json 2>/dev/null \
    || npm run test:e2e -- --reporter=list,json
fi
