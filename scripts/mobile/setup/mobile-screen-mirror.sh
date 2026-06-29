#!/usr/bin/env bash
# Fenêtre live de l'écran Samsung/ADB sur le PC.
# Préfère scrcpy (fluide) ; sinon navigateur via emulator-controller.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

pick_device() {
  if [[ -n "${ADB_DEVICE:-}" ]]; then
    echo "$ADB_DEVICE"
    return
  fi
  adb devices | awk 'NR>1 && $2=="device" { print $1; exit }'
}

DEVICE="$(pick_device || true)"
[[ -n "${DEVICE:-}" ]] || {
  echo "[mobile-screen] ERREUR: aucun appareil ADB. Branchez le Samsung et autorisez le débogage USB."
  exit 1
}

echo "[mobile-screen] Appareil: $DEVICE"

if [[ "${MOBILE_SCREEN_BROWSER:-0}" == "1" ]]; then
  exec node "$ROOT/scripts/mobile/setup/mobile-screen-browser.js"
fi

if command -v scrcpy >/dev/null 2>&1 && [[ -n "${DISPLAY:-${WAYLAND_DISPLAY:-}}" ]]; then
  echo "[mobile-screen] Lancement scrcpy (fenêtre native, ~60 fps)…"
  exec scrcpy -s "$DEVICE" \
    --stay-awake \
    --window-title "JobbingTrack — $DEVICE" \
    --max-fps 30 \
    "${@}"
fi

if ! command -v scrcpy >/dev/null 2>&1; then
  echo "[mobile-screen] scrcpy absent — Arch: sudo pacman -S scrcpy"
fi

echo "[mobile-screen] Repli navigateur (screenshots ~600 ms via contrôleur 5055)…"
exec node "$ROOT/scripts/mobile/setup/mobile-screen-browser.js"
