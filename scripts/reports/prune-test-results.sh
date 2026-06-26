#!/usr/bin/env bash
# Supprime ou compresse les rapports tests/results datés (libère disque, hors git).
# Usage :
#   bash scripts/reports/prune-test-results.sh              # dry-run
#   bash scripts/reports/prune-test-results.sh --apply      # supprime > 14 j
#   bash scripts/reports/prune-test-results.sh --apply --keep-days 7
#   bash scripts/reports/prune-test-results.sh --apply --compress-keep 3
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RESULTS_DIR="$ROOT/tests/results"
APPLY=0
KEEP_DAYS=14
COMPRESS_KEEP=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply) APPLY=1; shift ;;
    --keep-days) KEEP_DAYS="${2:-14}"; shift 2 ;;
    --compress-keep) COMPRESS_KEEP="${2:-3}"; shift 2 ;;
    -h|--help)
      sed -n '2,8p' "$0"
      exit 0
      ;;
    *) echo "Option inconnue: $1" >&2; exit 1 ;;
  esac
done

if [[ ! -d "$RESULTS_DIR" ]]; then
  echo "Rien à faire : $RESULTS_DIR absent"
  exit 0
fi

now_epoch=$(date +%s)
removed=0
compressed=0

while IFS= read -r -d '' dir; do
  base=$(basename "$dir")
  # Dossiers datés YYYYMMDD-HHMMSS
  if [[ ! "$base" =~ ^[0-9]{8}-[0-9]{6}$ ]]; then
    continue
  fi
  date_part=${base:0:8}
  dir_epoch=$(date -d "${date_part:0:4}-${date_part:4:2}-${date_part:6:2}" +%s 2>/dev/null || echo 0)
  age_days=$(( (now_epoch - dir_epoch) / 86400 ))

  if [[ "$COMPRESS_KEEP" -gt 0 && "$age_days" -gt "$KEEP_DAYS" ]]; then
    archive="$dir.tar.zst"
    if [[ "$APPLY" -eq 1 && ! -f "$archive" ]]; then
      tar -C "$RESULTS_DIR" -cf - "$base" | zstd -19 -T0 -o "$archive"
      rm -rf "$dir"
      compressed=$((compressed + 1))
      echo "📦 compressé → $(basename "$archive")"
    else
      echo "[dry-run] compresserait $base (${age_days}j)"
    fi
    continue
  fi

  if [[ "$age_days" -gt "$KEEP_DAYS" ]]; then
    if [[ "$APPLY" -eq 1 ]]; then
      rm -rf "$dir"
      removed=$((removed + 1))
      echo "🗑 supprimé $base (${age_days}j)"
    else
      echo "[dry-run] supprimerait $base (${age_days}j)"
    fi
  fi
done < <(find "$RESULTS_DIR" -mindepth 1 -maxdepth 1 -type d -print0 2>/dev/null)

echo ""
echo "Résumé : supprimés=$removed compressés=$compressed (keep-days=$KEEP_DAYS apply=$APPLY)"
if [[ "$APPLY" -eq 0 ]]; then
  echo "Relancer avec --apply pour exécuter."
fi
