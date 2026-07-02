#!/usr/bin/env bash
# Build APK release JobbingTrack (OTA / distribution interne).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
# shellcheck source=scripts/mobile/setup/resolve-flutter.sh
source "$ROOT/scripts/mobile/setup/resolve-flutter.sh"

MOBILE_DIR="$ROOT/mobile"
API_URL="${API_BASE_URL:-${MOBILE_PROD_API_URL:-https://api.jobbingtrack.delhomme.ovh}}"

DART_DEFINES=(
  --dart-define="API_BASE_URL=$API_URL"
)

cd "$ROOT"
node "$ROOT/scripts/mobile/setup/generate-debug-test-accounts.js"
cd "$MOBILE_DIR"
"$FLUTTER_BIN" pub get
"$FLUTTER_BIN" build apk --release "${DART_DEFINES[@]}"

OUT="$MOBILE_DIR/build/app/outputs/flutter-apk/app-release.apk"
VERSION="$("$FLUTTER_BIN" pub get >/dev/null 2>&1; awk '/^version:/ {print $2}' pubspec.yaml | tr -d '"')"
TARGET="$ROOT/deploy/production/mobile-releases/jobbingtrack-${VERSION}.apk"
mkdir -p "$(dirname "$TARGET")"
cp "$OUT" "$TARGET"

echo "[build-apk-release] OK"
echo "  APK build : $OUT"
echo "  Copie repo : $TARGET"
echo "  Portainer : uploader dans volume jobbingtrack_mobile_releases"
echo "  Variables stack : MOBILE_ANDROID_APK_FILENAME=jobbingtrack-${VERSION}.apk"
echo "                      MOBILE_ANDROID_LATEST_VERSION=${VERSION%%+*}"
echo "                      MOBILE_ANDROID_LATEST_BUILD=${VERSION#*+}"
