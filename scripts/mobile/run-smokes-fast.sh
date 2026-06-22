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

# Depuis l'hôte : forcer la gateway publiée (évite API_URL=api-gateway:3000 hérité de Compose).
GW_PORT="${API_GATEWAY_PORT:-5002}"
export API_GATEWAY_URL="http://127.0.0.1:${GW_PORT}"
export API_URL="${API_GATEWAY_URL}"

CAPTURE_SCRIPT="$ROOT/scripts/mobile/capture-validation-logs.sh"
if [[ -x "$CAPTURE_SCRIPT" ]]; then
  bash "$CAPTURE_SCRIPT" "$ROOT/tests/results/mobile-validation-$(date -u +%Y%m%d-%H%M%S)-pre" || true
fi

/usr/bin/node scripts/mobile/smoke-run-mobile-validation.js --skip-slow "$@"
EXIT=$?

if [[ -x "$CAPTURE_SCRIPT" ]]; then
  bash "$CAPTURE_SCRIPT" "$ROOT/tests/results/mobile-validation-$(date -u +%Y%m%d-%H%M%S)-post" || true
fi

exit "$EXIT"
