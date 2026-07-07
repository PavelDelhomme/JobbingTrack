#!/usr/bin/env bash
# État toolchain Android/Flutter mobile (BL-26-09) — lecture seule, pas de build.
# Usage : bash scripts/mobile/audit-android-toolchain.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=scripts/mobile/setup/resolve-flutter.sh
source "$ROOT/scripts/mobile/setup/resolve-flutter.sh"

MOBILE="$ROOT/mobile"
GRADLE_PROPS="$MOBILE/android/gradle/wrapper/gradle-wrapper.properties"
SETTINGS="$MOBILE/android/settings.gradle.kts"

echo "=== JobbingTrack — audit toolchain Android (BL-26-09) ==="
echo "Date: $(date -Iseconds)"
echo

if [[ -f "$GRADLE_PROPS" ]]; then
  echo "[Gradle wrapper]"
  grep distributionUrl "$GRADLE_PROPS" || true
  echo
fi

if [[ -f "$SETTINGS" ]]; then
  echo "[settings.gradle.kts — plugins]"
  rg 'id\("(com\.android|org\.jetbrains\.kotlin|dev\.flutter)' "$SETTINGS" || true
  echo
fi

echo "[Flutter]"
"$FLUTTER_BIN" --version 2>&1 | head -5 || echo "flutter indisponible"
echo

echo "[pubspec version]"
awk '/^version:/ {print $2}' "$MOBILE/pubspec.yaml"
echo

echo "[flutter pub outdated — direct dependencies]"
cd "$MOBILE"
"$FLUTTER_BIN" pub outdated --no-dev-dependencies 2>&1 | head -25 || true
echo

echo "[Notes BL-26-09]"
echo "  - Gradle wrapper cible : 8.14 (voir gradle-wrapper.properties)"
echo "  - Dette : plugins Flutter Built-in Kotlin + majors device_info_plus / flutter_contacts / package_info_plus"
echo "  - Patch plugins : scripts/mobile/setup/patch-android-plugin-gradle-kts.sh (avant build debug)"
echo "  - Build debug : bash scripts/mobile/setup/build-apk-debug.sh"
echo "  - Build release OTA : bash scripts/mobile/setup/build-apk-release.sh (API_BASE_URL prod)"
