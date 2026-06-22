#!/usr/bin/env bash
# Prépare un appareil Android physique pour JobbingTrack Mobile :
# - attend la détection ADB
# - active adb reverse sur les ports API/frontend
# - build APK debug avec l'IP LAN du PC si disponible
# - installe et lance l'application
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=scripts/mobile/resolve-flutter.sh
source "$ROOT/scripts/mobile/resolve-flutter.sh"
MOBILE_DIR="$ROOT/mobile"
ADB_WAIT_SEC="${ADB_WAIT_SEC:-120}"
PACKAGE="com.example.jobbingtrack_mobile"

log() { printf '[mobile-setup] %s\n' "$*"; }
fail() { printf '[mobile-setup] ERREUR: %s\n' "$*" >&2; exit 1; }

pick_lan_ip() {
  ip -4 -o addr show scope global 2>/dev/null \
    | awk '!/ docker| br-| veth| tun| wg/ { split($4, a, "/"); print a[1] }' \
    | grep -E '^192\.168\.|^10\.' \
    | head -n1
}

wait_for_device() {
  local elapsed=0
  while (( elapsed < ADB_WAIT_SEC )); do
    if adb devices | awk 'NR>1 && $2=="device" { found=1 } END { exit(found?0:1) }'; then
      adb devices -l
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
    if (( elapsed % 10 == 0 )); then
      log "En attente d'un appareil ADB (${elapsed}s/${ADB_WAIT_SEC}s)..."
      log "Vérifiez : câble données, débogage USB, autorisation RSA sur le téléphone."
    fi
  done
  fail "Aucun appareil ADB détecté après ${ADB_WAIT_SEC}s"
}

DEVICE_ID="$(adb devices | awk 'NR>1 && $2=="device" { print $1; exit }')"
if [[ -z "${DEVICE_ID:-}" ]]; then
  log "Redémarrage ADB..."
  adb kill-server >/dev/null 2>&1 || true
  adb start-server
  wait_for_device
  DEVICE_ID="$(adb devices | awk 'NR>1 && $2=="device" { print $1; exit }')"
fi

[[ -n "$DEVICE_ID" ]] || fail "Impossible de résoudre l'ID appareil"

log "Appareil: $DEVICE_ID"
MODEL="$(adb -s "$DEVICE_ID" shell getprop ro.product.model 2>/dev/null | tr -d '\r' || true)"
ANDROID="$(adb -s "$DEVICE_ID" shell getprop ro.build.version.release 2>/dev/null | tr -d '\r' || true)"
log "Modèle: ${MODEL:-inconnu}, Android ${ANDROID:-?}"

PORTS=(5002 5003 3000)
for port in "${PORTS[@]}"; do
  if adb -s "$DEVICE_ID" reverse "tcp:${port}" "tcp:${port}" 2>/dev/null; then
    log "adb reverse tcp:${port} tcp:${port} OK"
  else
    log "adb reverse tcp:${port} ignoré"
  fi
done

LAN_IP="$(pick_lan_ip || true)"
DART_DEFINES=()
if [[ -n "${LAN_IP:-}" ]]; then
  log "IP LAN détectée: $LAN_IP (fallback si adb reverse indisponible)"
  DART_DEFINES+=(--dart-define="MOBILE_DEV_LAN_HOST=$LAN_IP")
fi
if [[ -n "${API_BASE_URL:-}" ]]; then
  DART_DEFINES+=(--dart-define="API_BASE_URL=$API_BASE_URL")
fi

log "Build APK debug..."
(
  cd "$MOBILE_DIR"
  "$FLUTTER_BIN" pub get
  "$FLUTTER_BIN" build apk --debug "${DART_DEFINES[@]}"
)

APK_FLUTTER="$MOBILE_DIR/build/app/outputs/flutter-apk/app-debug.apk"
APK_LEGACY="$MOBILE_DIR/build/app/outputs/apk/debug/app-debug.apk"
APK_PATH="$APK_FLUTTER"
[[ -f "$APK_PATH" ]] || APK_PATH="$APK_LEGACY"
[[ -f "$APK_PATH" ]] || fail "APK introuvable après build"

log "Installation APK..."
adb -s "$DEVICE_ID" install -r "$APK_PATH"
adb -s "$DEVICE_ID" shell am force-stop "$PACKAGE" || true
adb -s "$DEVICE_ID" shell am start -n "$PACKAGE/.MainActivity"

log "Terminé. Ouvrez l'app : Connexion → API en bas de page si besoin."
log "Smoke UI: node tools/adb-lib/examples/inspect-ui.js"
