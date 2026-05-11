#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MODE="${1:-all}"

run_docker() {
  echo "🐳 Docker"
  docker --version 2>/dev/null || echo "Docker indisponible"
  docker compose version 2>/dev/null || docker-compose --version 2>/dev/null || echo "Docker Compose indisponible"
  docker ps --filter "name=jobbingtrack" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || true
}

run_network() {
  echo "🌐 Ports JobbingTrack"
  bash "$ROOT_DIR/scripts/utils/show-ports.sh" || true
}

run_cors() {
  echo "🌐 Diagnostic CORS"
  echo "ALLOWED_ORIGINS=${ALLOWED_ORIGINS:-non défini}"
  echo "FRONTEND_URL=${FRONTEND_URL:-non défini}"
  echo "API_GATEWAY_URL=${API_GATEWAY_URL:-non défini}"
}

case "$MODE" in
  --docker) run_docker ;;
  --docker-compose) docker compose config >/dev/null && echo "✅ docker compose config OK" ;;
  --cors) run_cors ;;
  --network) run_network ;;
  --auto-fix)
    bash "$ROOT_DIR/scripts/health/check-env.sh"
    run_docker
    ;;
  all|*)
    bash "$ROOT_DIR/scripts/core/check.sh" --detailed
    run_network
    run_cors
    ;;
esac
