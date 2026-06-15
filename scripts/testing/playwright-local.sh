#!/usr/bin/env bash
# Lance Playwright depuis frontend/ avec un environnement local fiable.
# Évite les crash Chromium SIGTRAP quand /tmp est saturé et force bash (zsh + cwd frontend peut faire échouer node silencieusement).
#
# Usage :
#   scripts/testing/playwright-local.sh test <args playwright...>
#   scripts/testing/playwright-local.sh test tests/e2e/auth.setup.ts --project=setup
#
# Variables optionnelles :
#   PLAYWRIGHT_BASE_URL   (défaut http://localhost:5003 — frontend Docker)
#   PLAYWRIGHT_TMPDIR     (défaut frontend/.tmp-playwright)
#   PLAYWRIGHT_BROWSERS_PATH (défaut frontend/.cache-playwright)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FRONTEND="$ROOT/frontend"

export PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-http://localhost:5003}"
export PLAYWRIGHT_TMPDIR="${PLAYWRIGHT_TMPDIR:-$FRONTEND/.tmp-playwright}"
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-$FRONTEND/.cache-playwright}"
export TMPDIR="${TMPDIR:-$PLAYWRIGHT_TMPDIR}"

mkdir -p "$PLAYWRIGHT_TMPDIR" "$PLAYWRIGHT_BROWSERS_PATH"

if ! curl -sf -o /dev/null --max-time 3 "${PLAYWRIGHT_BASE_URL}/"; then
  echo "⚠️  Frontend inaccessible sur ${PLAYWRIGHT_BASE_URL} — démarrer la stack (ex. jobbingtrack-frontend sur :5003)." >&2
  exit 1
fi

cd "$FRONTEND"
exec ./node_modules/.bin/playwright "$@"
