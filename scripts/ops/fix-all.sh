#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "🔧 Vérifications et corrections JobbingTrack"
cd "$ROOT_DIR"

make env-check
make db-push-all
make diagnostic-metrics || true

echo "✅ Vérifications terminées"
