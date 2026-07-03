#!/usr/bin/env bash
# Wrapper docker compose pour le contrôleur mobile (ADB + build APK sur l'hôte monté).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
exec docker compose up -d emulator-controller "$@"
