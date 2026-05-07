#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups/database}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUTPUT_FILE="${1:-$BACKUP_DIR/jobbingtrack-$TIMESTAMP.sql}"

mkdir -p "$(dirname "$OUTPUT_FILE")"

echo "💾 Backup PostgreSQL JobbingTrack"
echo "Fichier : $OUTPUT_FILE"

if docker ps --format '{{.Names}}' | grep -q '^jobbingtrack-postgres$'; then
  docker exec jobbingtrack-postgres pg_dump -U "${POSTGRES_USER:-jobbingtrack}" "${POSTGRES_DB:-jobbingtrack}" > "$OUTPUT_FILE"
  echo "✅ Backup créé"
  exit 0
fi

echo "❌ Conteneur jobbingtrack-postgres introuvable. Démarre la stack avant le backup."
exit 1
