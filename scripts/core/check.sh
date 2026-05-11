#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DETAILED=0

for arg in "$@"; do
  case "$arg" in
    --detailed) DETAILED=1 ;;
  esac
done

echo "💚 Vérification JobbingTrack"
echo "==========================="
echo ""

bash "$ROOT_DIR/scripts/health/check-env.sh"
echo ""
bash "$ROOT_DIR/scripts/health/check-services.sh"

if [ "$DETAILED" -eq 1 ]; then
  echo ""
  echo "📦 Informations Docker"
  docker ps --filter "name=jobbingtrack" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || true
fi
