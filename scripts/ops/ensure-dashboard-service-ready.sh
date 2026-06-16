#!/usr/bin/env bash
# Démarre dashboard-service si besoin et attend /health (statistics / analytics).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DASHBOARD_HEALTH_URL="http://127.0.0.1:${DASHBOARD_SERVICE_PORT:-5015}/health"
MAX_TRIES="${DASHBOARD_READY_MAX_TRIES:-20}"

if ! command -v docker >/dev/null 2>&1; then
  echo "[ensure-dashboard] docker absent — skip" >&2
  exit 0
fi

if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^jobbingtrack-dashboard-service$'; then
  echo "[ensure-dashboard] démarrage dashboard-service…" >&2
  (cd "${ROOT_DIR}" && docker compose -f docker-compose.yml up -d dashboard-service) >/dev/null 2>&1 || true
fi

tries=0
while [[ "${tries}" -lt "${MAX_TRIES}" ]]; do
  if curl -fsS -m 2 "${DASHBOARD_HEALTH_URL}" >/dev/null 2>&1; then
    echo "[ensure-dashboard] prêt (${DASHBOARD_HEALTH_URL})" >&2
    exit 0
  fi
  tries=$((tries + 1))
  sleep 2
done

echo "[ensure-dashboard] indisponible après attente (${DASHBOARD_HEALTH_URL})" >&2
exit 1
