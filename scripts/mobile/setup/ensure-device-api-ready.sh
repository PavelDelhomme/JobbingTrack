#!/usr/bin/env bash
# Prépare l'appareil ADB + API locale (adb reverse, Redis rate-limit, health).
# Ne modifie pas .env — charge les variables existantes via Node.
#
#   ./scripts/mobile/ensure-device-api-ready.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

NODE="${NODE_BIN:-/usr/bin/node}"
if ! command -v "$NODE" >/dev/null 2>&1; then
  NODE="$(command -v node)"
fi

exec "$NODE" scripts/mobile/setup/ensure-device-api-ready.js "$@"
