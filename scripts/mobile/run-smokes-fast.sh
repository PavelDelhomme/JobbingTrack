#!/usr/bin/env bash
# Smokes mobile accélérés (ADB_FAST=1, polls courts).
# Sans téléphone USB : source .env.mobile-emulator après setup-android-emulator.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if [[ -f "$ROOT/.env.mobile-emulator" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT/.env.mobile-emulator"
fi

export ADB_FAST="${ADB_FAST:-1}"
export ADB_UI_CACHE_MS="${ADB_UI_CACHE_MS:-280}"
export ADB_WAIT_POLL_MS="${ADB_WAIT_POLL_MS:-320}"

exec /usr/bin/node scripts/mobile/smoke-run-mobile-validation.js --skip-slow "$@"
