#!/usr/bin/env bash
# Réinstalle l'APK debug sur l'appareil ADB déjà connecté (build + install, sans lancer l'app).
# Usage : make mobile-apk-reinstall | make apk-reinstall | make reinstall-apk
#     ou  bash scripts/mobile/setup/reinstall-apk-adb.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
# shellcheck source=scripts/mobile/setup/resolve-flutter.sh
source "$ROOT/scripts/mobile/setup/resolve-flutter.sh"
PACKAGE="com.example.jobbingtrack_mobile"
APK="$ROOT/mobile/build/app/outputs/flutter-apk/app-debug.apk"

log() { printf '[mobile-reinstall] %s\n' "$*"; }
fail() { printf '[mobile-reinstall] ERREUR: %s\n' "$*" >&2; exit 1; }

DEVICE_ID="$(adb devices | awk 'NR>1 && $2=="device" { print $1; exit }')"
[[ -n "${DEVICE_ID:-}" ]] || fail "Aucun appareil ADB. Branchez le téléphone et autorisez le débogage USB."

log "Appareil: $DEVICE_ID"

for port in 5002 5003; do
  adb -s "$DEVICE_ID" reverse "tcp:${port}" "tcp:${port}" 2>/dev/null && \
    log "adb reverse tcp:${port} OK" || true
done

log "Build APK debug..."
bash "$ROOT/scripts/mobile/setup/build-apk-debug.sh"

[[ -f "$APK" ]] || fail "APK introuvable: $APK"

log "Installation sur $DEVICE_ID..."
adb -s "$DEVICE_ID" install -r "$APK"

log "OK — APK réinstallé. Ouvrez JobbingTrack sur le téléphone ou: adb shell monkey -p $PACKAGE -c android.intent.category.LAUNCHER 1"
