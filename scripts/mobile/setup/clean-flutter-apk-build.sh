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

rm_path() {
  local path="$1"
  [[ -e "$path" ]] || return 0
  chmod -R u+w "$path" 2>/dev/null || true
  if rm -rf "$path" 2>/dev/null; then
    return 0
  fi
  # Builds Docker (/workspace) souvent root-owned
  if command -v sudo >/dev/null 2>&1; then
    echo "[clean-flutter-apk-build] WARN — purge sudo: $path"
    sudo rm -rf "$path" 2>/dev/null || true
  fi
}

echo "[clean-flutter-apk-build] flutter clean + purge intermediates compressés"
(
  cd "$MOBILE_DIR"
  "$FLUTTER_BIN" clean || true
)

# Cibles précises (même après flutter clean, des résidus Gradle / Docker root peuvent rester).
for path in \
  "$MOBILE_DIR/build" \
  "$MOBILE_DIR/android/app/build" \
  "$MOBILE_DIR/android/.gradle" \
  "$MOBILE_DIR/.dart_tool/flutter_build"
do
  rm_path "$path"
done

# Purge ciblée si build/ n’a pu être entièrement effacé
if [[ -d "$MOBILE_DIR/build" ]]; then
  while IFS= read -r -d '' f; do
    rm_path "$f"
  done < <(find "$MOBILE_DIR/build" \( -name '*kernel_blob*' -o -name 'compressed_assets' \) -print0 2>/dev/null || true)
  rm_path "$MOBILE_DIR/build/app/intermediates/compressed_assets"
fi

# Symlinks Linux créés en root (souvent via Docker) bloquent flutter clean
PLUGIN_LINKS="$MOBILE_DIR/linux/flutter/ephemeral/.plugin_symlinks"
if [[ -e "$PLUGIN_LINKS" ]] && [[ ! -w "$PLUGIN_LINKS" || "$(stat -c '%u' "$PLUGIN_LINKS" 2>/dev/null || true)" == "0" ]]; then
  echo "[clean-flutter-apk-build] WARN — $PLUGIN_LINKS root-owned ; tente sudo rm…"
  rm_path "$PLUGIN_LINKS"
fi

echo "[clean-flutter-apk-build] OK"
