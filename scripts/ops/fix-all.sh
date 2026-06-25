#!/bin/bash
# Vérifications rapides Make (env + db-push + metrics) — outil ops permanent, pas legacy.
# Usage: bash scripts/ops/fix-all.sh
# @used-by dépannage local documenté dans scripts/ops/README.md

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "🔧 Vérifications et corrections JobbingTrack"
cd "$ROOT_DIR"

make env-check
make db-push-all
make diagnostic-metrics || true

echo "✅ Vérifications terminées"
