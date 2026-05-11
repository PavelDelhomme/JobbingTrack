#!/usr/bin/env bash
# Liste les fichiers de test Jest présents dans le dépôt mais hors périmètre
# « npm run test:unit-and-analytics » (unit + backoffice/analytics).
# Usage : depuis frontend/ → npm run test:audit-jest-scope

set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ ! -f package.json ]]; then
  echo "Exécutez ce script depuis le répertoire frontend/ (ou via npm run test:audit-jest-scope)." >&2
  exit 1
fi

GUARD_TMP=$(mktemp)
ALL_TMP=$(mktemp)
cleanup() { rm -f "$GUARD_TMP" "$ALL_TMP"; }
trap cleanup EXIT

(npx jest unit --listTests 2>/dev/null
 npx jest --testPathPattern=backoffice/analytics --listTests 2>/dev/null) | sed '/^$/d' | sort -u >"$GUARD_TMP"

npx jest --listTests 2>/dev/null | sed '/^$/d' | sort -u >"$ALL_TMP"

g=$(wc -l <"$GUARD_TMP" | tr -d ' ')
a=$(wc -l <"$ALL_TMP" | tr -d ' ')
echo "=== Audit périmètre Jest (frontend) ==="
echo "Fichiers dans la gate unit+analytics (union) : $g"
echo "Fichiers Jest listés au total               : $a"
echo ""
echo "--- Fichiers de test hors gate (npm test / CI étendue) ---"
comm -23 "$ALL_TMP" "$GUARD_TMP" || true
