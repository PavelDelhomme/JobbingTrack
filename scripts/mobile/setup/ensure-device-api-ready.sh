#!/usr/bin/env bash
# Prépare l'appareil ADB + API locale (adb reverse, Redis rate-limit, health).
# Usage: bash scripts/mobile/setup/ensure-device-api-ready.sh
# @used-by scripts/mobile/smoke/run/smoke-preflight.js

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

NODE="${NODE_BIN:-/usr/bin/node}"
if ! command -v "$NODE" >/dev/null 2>&1; then
  NODE="$(command -v node)"
fi

exec "$NODE" scripts/mobile/setup/ensure-device-api-ready.js "$@"
