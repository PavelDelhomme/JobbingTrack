#!/bin/bash
# Compresse les anciens rapports de tests (tests/results, user-journey-reports, etc.)
# pour libérer de l'espace. Les dossiers plus vieux que JOURS sont archivés en .tar.gz
# Usage: ./scripts/reports/compress-old-reports.sh [JOURS]   (défaut: 14)

set -euo pipefail

JOURS="${1:-14}"
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
RESULTS_DIR="${TESTS_RESULTS_DIR:-$PROJECT_ROOT/tests/results}"
USER_JOURNEY_DIR="${USER_JOURNEY_REPORTS_DIR:-$PROJECT_ROOT/tests/user-journey-reports}"
ARCHIVE_DIR="${ARCHIVE_REPORTS_DIR:-$PROJECT_ROOT/tests/archived}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📦 Compression des rapports de plus de ${JOURS} jours${NC}"
echo ""

mkdir -p "$ARCHIVE_DIR"
compressed=0

# Fonction: compresser les sous-dossiers plus vieux que JOURS dans un répertoire
compress_old_in() {
  local base_dir="$1"
  local label="$2"
  if [ ! -d "$base_dir" ]; then
    return 0
  fi
  echo -e "${YELLOW}📁 $label : $base_dir${NC}"
  for dir in "$base_dir"/*/; do
    [ -d "$dir" ] || continue
    dir_name=$(basename "$dir")
    # Format YYYYMMDD-HHMMSS ou autre
    if [ -z "$dir_name" ]; then continue; fi
    # Âge en jours (GNU find)
    if find "$dir" -maxdepth 0 -mtime +"$JOURS" 2>/dev/null | grep -q .; then
      archive_name="${dir_name}.tar.gz"
      archive_path="$ARCHIVE_DIR/$archive_name"
      if [ -f "$archive_path" ]; then
        echo -e "  ⏭️  $dir_name déjà archivé"
        rm -rf "$dir"
        compressed=$((compressed + 1))
      else
        if tar -czf "$archive_path" -C "$base_dir" "$dir_name" 2>/dev/null; then
          rm -rf "$dir"
          echo -e "  ${GREEN}✅ $dir_name → $archive_name${NC}"
          compressed=$((compressed + 1))
        else
          echo -e "  ${RED}❌ Échec compression $dir_name${NC}"
        fi
      fi
    fi
  done
}

# Rapports tests/results (format YYYYMMDD-HHMMSS)
compress_old_in "$RESULTS_DIR" "Résultats tests"

# Fichiers JSON user-journey (fichiers, pas dossiers)
if [ -d "$USER_JOURNEY_DIR" ]; then
  echo -e "${YELLOW}📁 Parcours utilisateur : $USER_JOURNEY_DIR${NC}"
  for f in "$USER_JOURNEY_DIR"/*.json; do
    [ -f "$f" ] || continue
    if find "$f" -mtime +"$JOURS" 2>/dev/null | grep -q .; then
      name=$(basename "$f" .json)
      archive_name="${name}.tar.gz"
      archive_path="$ARCHIVE_DIR/$archive_name"
      if [ ! -f "$archive_path" ]; then
        if tar -czf "$archive_path" -C "$USER_JOURNEY_DIR" "$(basename "$f")" 2>/dev/null; then
          rm -f "$f"
          echo -e "  ${GREEN}✅ $(basename "$f") → $archive_name${NC}"
          compressed=$((compressed + 1))
        fi
      fi
    fi
  done
fi

echo ""
if [ "$compressed" -gt 0 ]; then
  echo -e "${GREEN}✅ $compressed élément(s) compressé(s) dans $ARCHIVE_DIR${NC}"
else
  echo -e "${BLUE}Aucun rapport plus vieux que ${JOURS} jours à compresser.${NC}"
fi
echo -e "${BLUE}💡 Pour décompresser un rapport : tar -xzf $ARCHIVE_DIR/YYYYMMDD-HHMMSS.tar.gz -C tests/results${NC}"
