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
if [[ "${SKIP_VERSION_BUMP:-}" == "1" ]]; then
  echo "[build-apk-debug] SKIP_VERSION_BUMP=1 — pubspec non modifié"
elif [[ "${FORCE_VERSION_BUMP:-}" == "1" ]]; then
  FORCE_VERSION_BUMP=1 node "$ROOT/scripts/mobile/setup/bump-pubspec-version.js" --bump
else
  # Incrémente seulement si le code mobile a changé depuis le dernier APK (empreinte).
  node "$ROOT/scripts/mobile/setup/bump-pubspec-version.js"
fi
cd "$MOBILE_DIR"
bash "$ROOT/scripts/mobile/setup/patch-android-plugin-gradle-kts.sh"
bash "$ROOT/scripts/mobile/setup/ensure-flutter-gradle-cache.sh"

# Toujours nettoyer avant assembleDebug — sinon compressDebugAssets / kernel_blob.bin.jar
# peut échouer (« already contains entry … cannot overwrite »).
bash "$ROOT/scripts/mobile/setup/clean-flutter-apk-build.sh" "$MOBILE_DIR"
"$FLUTTER_BIN" pub get

LOG="$(mktemp -t jt-apk-build.XXXXXX.log)"
cleanup() { rm -f "$LOG"; }
trap cleanup EXIT

run_build() {
  set +e
  "$FLUTTER_BIN" build apk --debug "${DART_DEFINES[@]}" 2>&1 | tee "$LOG"
  local code=${PIPESTATUS[0]}
  set -e
  return "$code"
}

if ! run_build; then
  if grep -qiE 'kernel_blob|compressDebugAssets|already contains entry' "$LOG"; then
    echo "[build-apk-debug] Erreur Zip/kernel_blob détectée — 2ᵉ tentative après clean profond…"
    bash "$ROOT/scripts/mobile/setup/clean-flutter-apk-build.sh" "$MOBILE_DIR"
    # Purge Gradle plus agressive sur le module app
    rm -rf "$MOBILE_DIR/build" "$MOBILE_DIR/android/app/build" 2>/dev/null || true
    "$FLUTTER_BIN" pub get
    run_build
  else
    echo "[build-apk-debug] ÉCHEC (hors Zip/kernel_blob) — voir log ci-dessus" >&2
    exit 1
  fi
fi

node "$ROOT/scripts/mobile/setup/bump-pubspec-version.js" --write-fingerprint-only
echo "[build-apk-debug] OK → mobile/build/app/outputs/flutter-apk/app-debug.apk"
