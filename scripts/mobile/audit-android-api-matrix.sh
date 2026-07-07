#!/usr/bin/env bash
# Matrice compat Android multi-API (BL-26-14) — inventaire appareils/AVD + écarts.
# Usage :
#   bash scripts/mobile/audit-android-api-matrix.sh
#   bash scripts/mobile/audit-android-api-matrix.sh --smoke   # preflight par appareil connecté
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=scripts/mobile/setup/resolve-flutter.sh
source "$ROOT/scripts/mobile/setup/resolve-flutter.sh"

RUN_SMOKE=0
if [[ "${1:-}" == "--smoke" ]]; then
  RUN_SMOKE=1
fi

_pick_sdk() {
  for candidate in "${ANDROID_SDK_ROOT:-}" "${ANDROID_HOME:-}" "$ROOT/.android-sdk" "$HOME/Android/Sdk"; do
    [[ -n "$candidate" ]] || continue
    if [[ -d "$candidate" ]]; then
      echo "$candidate"
      return 0
    fi
  done
  echo "$ROOT/.android-sdk"
}

ANDROID_SDK="$(_pick_sdk)"
export ANDROID_HOME="$ANDROID_SDK"
export ANDROID_SDK_ROOT="$ANDROID_SDK"
export PATH="$ANDROID_SDK/platform-tools:$ANDROID_SDK/cmdline-tools/latest/bin:$ANDROID_SDK/emulator:$PATH"

# Paliers cibles (STRATEGIE_COMPATIBILITE_ANDROID.md)
TARGET_APIS=(21 28 30 34 36)

echo "=== JobbingTrack — matrice compat Android (BL-26-14) ==="
echo "Date: $(date -Iseconds)"
echo

echo "[pubspec mobile]"
awk '/^version:/ {print "  ", $0}' "$ROOT/mobile/pubspec.yaml" 2>/dev/null || true
echo

echo "[Appareils ADB connectés]"
mapfile -t DEVICES < <(adb devices 2>/dev/null | awk 'NR>1 && $2=="device" {print $1}' || true)
if [[ ${#DEVICES[@]} -eq 0 ]]; then
  echo "  (aucun — brancher Samsung ou lancer AVD : bash scripts/mobile/setup-android-emulator.sh up)"
else
  for dev in "${DEVICES[@]}"; do
    api=$(adb -s "$dev" shell getprop ro.build.version.sdk 2>/dev/null | tr -d '\r' || echo "?")
    rel=$(adb -s "$dev" shell getprop ro.build.version.release 2>/dev/null | tr -d '\r' || echo "?")
    model=$(adb -s "$dev" shell getprop ro.product.model 2>/dev/null | tr -d '\r' || echo "?")
    echo "  $dev | API $api | Android $rel | $model"
    if [[ "$RUN_SMOKE" -eq 1 ]]; then
      echo "    → smoke-preflight…"
      if MOBILE_ADB_DEVICE="$dev" node "$ROOT/scripts/mobile/smoke-preflight.js" 2>&1 | sed 's/^/      /'; then
        echo "      OK preflight"
      else
        echo "      KO preflight"
      fi
    fi
  done
fi
echo

echo "[AVD installés (avdmanager)]"
if command -v avdmanager >/dev/null 2>&1; then
  avdmanager list avd 2>/dev/null | sed 's/^/  /' || echo "  (avdmanager erreur)"
else
  echo "  avdmanager indisponible — ANDROID_SDK=$ANDROID_SDK"
fi
echo

echo "[Écarts vs paliers cibles: ${TARGET_APIS[*]}]"
declare -A COVERED=()
for dev in "${DEVICES[@]}"; do
  api=$(adb -s "$dev" shell getprop ro.build.version.sdk 2>/dev/null | tr -d '\r' || echo "")
  [[ -n "$api" ]] || continue
  for t in "${TARGET_APIS[@]}"; do
    if [[ "$api" -eq "$t" ]]; then
      COVERED[$t]=1
    elif [[ "$t" -eq 36 && "$api" -ge 36 ]]; then
      COVERED[$t]=1
    elif [[ "$t" -eq 34 && "$api" -ge 34 && "$api" -lt 36 ]]; then
      COVERED[$t]=1
    elif [[ "$t" -eq 30 && "$api" -ge 30 && "$api" -lt 34 ]]; then
      COVERED[$t]=1
    elif [[ "$t" -eq 28 && "$api" -ge 26 && "$api" -lt 30 ]]; then
      COVERED[$t]=1
    elif [[ "$t" -eq 21 && "$api" -le 23 ]]; then
      COVERED[$t]=1
    fi
  done
done

for t in "${TARGET_APIS[@]}"; do
  if [[ -n "${COVERED[$t]:-}" ]]; then
    echo "  API ~$t : couvert (appareil connecté)"
  else
    echo "  API ~$t : MANQUANT — créer AVD :"
    echo "    ANDROID_API_LEVEL=$t JOBBINGTRACK_AVD_NAME=JobbingTrack_API${t} bash scripts/mobile/setup/setup-android-emulator.sh install"
  fi
done
echo

echo "[Campagne smoke par palier (agent)]"
echo "  1. bash scripts/mobile/audit-android-api-matrix.sh"
echo "  2. Par palier : ANDROID_API_LEVEL=XX bash scripts/mobile/setup/setup-android-emulator.sh up"
echo "  3. MOBILE_ADB_DEVICE=emulator-5554 node scripts/mobile/smoke-run-mobile-fast.js"
echo "  4. Cocher matrice : docs/mobile/STRATEGIE_COMPATIBILITE_ANDROID.md § Matrice"
echo

echo "[Note affichage version mobile]"
echo "  Drawer « Version 1.0.0 » + « Build 12 » = versionName legacy ; rebuild APK après bump pubspec → « Version 1.0.12 »."
echo "  Politique : docs/mobile/VERSIONNEMENT.md"
