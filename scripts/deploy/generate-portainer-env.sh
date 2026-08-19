#!/usr/bin/env bash
# Génère deploy/production/.env.preprod.generated et .env.prod.generated
# depuis le .env racine (mêmes secrets, surcharges VPS uniquement).
#
# Usage :
#   bash scripts/deploy/generate-portainer-env.sh
#   bash scripts/deploy/generate-portainer-env.sh --source /chemin/.env
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

ARGS=()
if [[ $# -gt 0 ]]; then
  ARGS=("$@")
fi

node "$ROOT/scripts/deploy/build-portainer-env.cjs" "${ARGS[@]}"
