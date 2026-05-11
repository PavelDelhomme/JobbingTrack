#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "🐳 Vérification Docker Compose"
cd "$ROOT_DIR"

if docker compose config >/dev/null; then
  echo "✅ docker compose config OK"
  exit 0
fi

echo "❌ docker compose config échoue. Lance : docker compose config pour voir le détail."
exit 1
