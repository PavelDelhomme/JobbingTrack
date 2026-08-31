#!/usr/bin/env bash
# Build APK release JobbingTrack (OTA / distribution interne).
#
# Variables :
#   API_BASE_URL              — URL API embarquée (défaut prod historique)
#   MOBILE_RELEASE_CHANNEL    — canal OTA (dev | preprod | production)
#   FLAVOR                    — flavor Android (dev | preprod | prod), défaut prod
#   SKIP_CLEAN=1              — ne pas nettoyer le dossier build avant
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
# shellcheck source=scripts/mobile/setup/resolve-flutter.sh
source "$ROOT/scripts/mobile/setup/resolve-flutter.sh"

MOBILE_DIR="$ROOT/mobile"
API_URL="${API_BASE_URL:-${MOBILE_PROD_API_URL:-https://api.jobbingtrack.com}}"
FLAVOR="${FLAVOR:-prod}"
CHANNEL="${MOBILE_RELEASE_CHANNEL:-}"

case "$FLAVOR" in
  dev|preprod|prod) ;;
  *)
    echo "[build-apk-release] FLAVOR invalide: $FLAVOR (dev|preprod|prod)" >&2
    exit 1
    ;;
esac

if [[ -z "$CHANNEL" ]]; then
  case "$FLAVOR" in
    dev) CHANNEL=dev ;;
    preprod) CHANNEL=preprod ;;
    prod) CHANNEL=production ;;
  esac
fi

DART_DEFINES=(
  --dart-define="API_BASE_URL=$API_URL"
  --dart-define="MOBILE_RELEASE_CHANNEL=$CHANNEL"
)

cd "$ROOT"
node "$ROOT/scripts/mobile/setup/generate-debug-test-accounts.js"
cd "$MOBILE_DIR"
if [[ "${SKIP_CLEAN:-0}" != "1" ]]; then
  bash "$ROOT/scripts/mobile/setup/clean-flutter-apk-build.sh" "$MOBILE_DIR"
fi
"$FLUTTER_BIN" pub get
"$FLUTTER_BIN" build apk --release --flavor "$FLAVOR" "${DART_DEFINES[@]}"

OUT="$MOBILE_DIR/build/app/outputs/flutter-apk/app-${FLAVOR}-release.apk"
# Fallback historique si Flutter sort encore app-release.apk (sans flavor)
if [[ ! -f "$OUT" ]]; then
  OUT="$MOBILE_DIR/build/app/outputs/flutter-apk/app-release.apk"
fi
[[ -f "$OUT" ]] || { echo "[build-apk-release] APK introuvable après build" >&2; exit 1; }

VERSION="$(awk '/^version:/ {print $2}' pubspec.yaml | tr -d '"')"
TARGET="$ROOT/deploy/production/mobile-releases/jobbingtrack-${FLAVOR}-${VERSION}.apk"
mkdir -p "$(dirname "$TARGET")"
cp "$OUT" "$TARGET"

echo "[build-apk-release] OK"
echo "  Flavor   : $FLAVOR"
echo "  Canal OTA: $CHANNEL"
echo "  API      : $API_URL"
echo "  APK build: $OUT"
echo "  Copie    : $TARGET"
