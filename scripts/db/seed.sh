#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "🌱 Seed JobbingTrack"
echo "==================="
echo "Ce point d’entrée lance le seed auth supporté par le Makefile."
echo ""

cd "$ROOT_DIR"
make seed-auth
