#!/usr/bin/env bash
# =============================================================================
# timed-make.sh — Mesure temps et (optionnel) ressources pour une cible make
# Usage: ./scripts/timed-make.sh [TARGET] [OPTIONS]
#   TARGET = test-full | test-full-quick | up-full | rebuild | ...
#   OPTIONS = --verbose (-v) pour /usr/bin/time -v (mémoire max, etc.)
# Exemple: ./scripts/timed-make.sh test-full-quick
#          ./scripts/timed-make.sh up-full --verbose
# =============================================================================

set -e
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

TARGET="${1:-test-full-quick}"
VERBOSE=""
if [[ "${2:-}" == "--verbose" || "${2:-}" == "-v" ]]; then
  VERBOSE=1
fi

echo "⏱️  Début: $(date -Iseconds)"
echo "📋 Cible: make $TARGET"
echo "📁 Répertoire: $ROOT_DIR"
echo ""

if [[ -n "$VERBOSE" ]] && command -v /usr/bin/time &>/dev/null; then
  echo "📊 Mesure détaillée (temps + mémoire max, etc.)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  /usr/bin/time -v make "$TARGET" 2>&1
else
  time make "$TARGET"
fi

echo ""
echo "⏱️  Fin: $(date -Iseconds)"
echo "💡 Pour mémoire détaillée: $0 $TARGET --verbose"
