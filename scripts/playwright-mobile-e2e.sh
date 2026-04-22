#!/usr/bin/env bash
# Suite Playwright mobile (frontend). Appele par run-all-tests-with-reports.sh si adb device ou RUN_PLAYWRIGHT_MOBILE=1.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)"
cd "$ROOT/frontend" || exit 1
npm install --no-audit --no-fund 2>/dev/null || true
exec npx playwright test tests/e2e/mobile \
  --config=playwright.mobile.config.ts \
  --project="${PLAYWRIGHT_MOBILE_PROJECT:-iPhone 13 Pro}" \
  --reporter=list \
  "$@"
