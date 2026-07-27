#!/usr/bin/env bash
# Nettoyage robuste avant build APK — évite compressDebugAssets / kernel_blob.bin.jar
# (Zip « already contains entry … cannot overwrite »).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
MOBILE_DIR="${1:-$ROOT/mobile}"

if [[ ! -f "$MOBILE_DIR/pubspec.yaml" ]]; then
  echo "[clean-flutter-apk-build] pubspec introuvable: $MOBILE_DIR" >&2
  exit 1
fi

# shellcheck source=scripts/mobile/setup/resolve-flutter.sh
source "$ROOT/scripts/mobile/setup/resolve-flutter.sh"

echo "[clean-flutter-apk-build] flutter clean + purge intermediates compressés"
(
  cd "$MOBILE_DIR"
  "$FLUTTER_BIN" clean || true
)

# Cibles précises (même après flutter clean, des résidus Gradle / Docker root peuvent rester).
for path in \
  "$MOBILE_DIR/build" \
  "$MOBILE_DIR/android/app/build" \
  "$MOBILE_DIR/.dart_tool/flutter_build"
do
  if [[ -e "$path" ]]; then
    chmod -R u+w "$path" 2>/dev/null || true
    rm -rf "$path" 2>/dev/null || true
  fi
done

# Si build/ appartient à root (build Docker), tenter une purge ciblée des assets compressés
COMP="$MOBILE_DIR/build/app/intermediates/compressed_assets"
if [[ -d "$COMP" ]]; then
  chmod -R u+w "$COMP" 2>/dev/null || true
  rm -rf "$COMP" 2>/dev/null || true
fi

echo "[clean-flutter-apk-build] OK"
