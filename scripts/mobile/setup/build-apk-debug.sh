#!/usr/bin/env bash
# Build APK debug JobbingTrack (contourne flutter pacman Arch cassé).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
# shellcheck source=scripts/mobile/setup/resolve-flutter.sh
source "$ROOT/scripts/mobile/setup/resolve-flutter.sh"
MOBILE_DIR="$ROOT/mobile"
DART_DEFINES=()
if [[ -n "${API_BASE_URL:-}" ]]; then
  DART_DEFINES+=(--dart-define="API_BASE_URL=$API_BASE_URL")
fi
if [[ -n "${MOBILE_DEV_LAN_HOST:-}" ]]; then
  DART_DEFINES+=(--dart-define="MOBILE_DEV_LAN_HOST=$MOBILE_DEV_LAN_HOST")
fi
cd "$ROOT"
node "$ROOT/scripts/mobile/setup/generate-debug-test-accounts.js"
if [[ "${SKIP_VERSION_BUMP:-}" != "1" ]]; then
  node "$ROOT/scripts/mobile/setup/bump-pubspec-version.js"
fi
cd "$MOBILE_DIR"
bash "$ROOT/scripts/mobile/setup/patch-android-plugin-gradle-kts.sh"
bash "$ROOT/scripts/mobile/setup/ensure-flutter-gradle-cache.sh"
"$FLUTTER_BIN" pub get
"$FLUTTER_BIN" build apk --debug "${DART_DEFINES[@]}"
echo "[build-apk-debug] OK → mobile/build/app/outputs/flutter-apk/app-debug.apk"
