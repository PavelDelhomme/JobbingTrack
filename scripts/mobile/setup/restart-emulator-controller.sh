#!/usr/bin/env bash
# Redémarre le contrôleur émulateur (5055) et libère le lanceur (5056).
# Usage : bash scripts/mobile/setup/restart-emulator-controller.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
CONTROLLER_DIR="$ROOT/tools/emulator-controller"
LOG="/tmp/emulator-controller.log"

free_port() {
  local port="$1"
  if ! command -v lsof >/dev/null 2>&1; then
    return 0
  fi
  local pids
  pids="$(lsof -ti :"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    echo "[restart-emulator-controller] Libération port $port (PID $pids)"
    kill -9 $pids 2>/dev/null || true
  fi
}

echo "[restart-emulator-controller] Arrêt processus sur 5055 et 5056…"
free_port 5055
free_port 5056
pkill -f "$CONTROLLER_DIR/server.js" 2>/dev/null || true
pkill -f "$CONTROLLER_DIR/launcher.js" 2>/dev/null || true
sleep 1

if command -v lsof >/dev/null 2>&1; then
  if lsof -i :5055 -sTCP:LISTEN >/dev/null 2>&1; then
    echo "[restart-emulator-controller] ERREUR: port 5055 encore occupé."
    echo "  → lsof -i :5055"
    exit 1
  fi
fi

cd "$CONTROLLER_DIR"
if [ -f launcher.js ]; then
  nohup node launcher.js > "$LOG" 2>&1 &
else
  nohup node server.js > "$LOG" 2>&1 &
fi

sleep 1
if curl -sf "http://127.0.0.1:5055/health" >/dev/null; then
  echo "[restart-emulator-controller] OK — http://127.0.0.1:5055 (logs: $LOG)"
  curl -s "http://127.0.0.1:5055/routes" | grep -q 'live/start' && echo "  Routes live/start présentes (cache aperçu)."
else
  echo "[restart-emulator-controller] WARN — health 5055 KO, voir $LOG"
  tail -20 "$LOG" 2>/dev/null || true
  exit 1
fi
