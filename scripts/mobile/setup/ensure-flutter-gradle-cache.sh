#!/usr/bin/env bash
# Recopie propre de packages/flutter_tools/gradle si cache absent ou corrompu (hack /usr/bin/flutter).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
MOBILE_DIR="$ROOT/mobile"
# shellcheck source=scripts/mobile/setup/resolve-flutter.sh
source "$ROOT/scripts/mobile/setup/resolve-flutter.sh"

LOCAL_PROPS="$MOBILE_DIR/android/local.properties"
FLUTTER_SDK="${FLUTTER_ROOT:-}"
if [[ -z "$FLUTTER_SDK" && -f "$LOCAL_PROPS" ]]; then
  FLUTTER_SDK="$(grep -E '^flutter\.sdk=' "$LOCAL_PROPS" | head -1 | cut -d= -f2- | tr -d '\r')"
fi
if [[ -z "$FLUTTER_SDK" ]]; then
  FLUTTER_SDK="$(dirname "$(dirname "$(command -v "$FLUTTER_BIN")")")"
fi

SOURCE_GRADLE="$FLUTTER_SDK/packages/flutter_tools/gradle"
CACHE_DIR="$MOBILE_DIR/.flutter-gradle-cache"
GRADLE_CACHE="$CACHE_DIR/gradle"
PLUGIN_KT="$GRADLE_CACHE/src/main/kotlin/FlutterPlugin.kt"

is_corrupted() {
  [[ -f "$PLUGIN_KT" ]] || return 1
  grep -q '"/usr/bin/flutter"' "$PLUGIN_KT" 2>/dev/null && return 0
  grep -q 'Paths.get("/usr", "bin", flutterExecutableName)' "$PLUGIN_KT" 2>/dev/null && return 0
  return 1
}

if [[ ! -d "$SOURCE_GRADLE" ]]; then
  echo "[ensure-flutter-gradle-cache] WARN — source introuvable: $SOURCE_GRADLE"
  exit 0
fi

if [[ -d "$GRADLE_CACHE" ]] && is_corrupted; then
  echo "[ensure-flutter-gradle-cache] Cache corrompu détecté — suppression"
  rm -rf "$CACHE_DIR"
fi

if [[ ! -d "$GRADLE_CACHE" ]]; then
  mkdir -p "$CACHE_DIR"
  cp -a "$SOURCE_GRADLE" "$GRADLE_CACHE"
  echo "[ensure-flutter-gradle-cache] OK — copie depuis $SOURCE_GRADLE"
else
  echo "[ensure-flutter-gradle-cache] Cache Gradle OK"
fi
