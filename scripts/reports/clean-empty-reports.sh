#!/bin/bash
# Script pour nettoyer les anciens rapports vides ou avec peu de contenu

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
RESULTS_DIR="$PROJECT_ROOT/tests/results"
PERF_BACKEND_DIR="$PROJECT_ROOT/backend-performance-reports"
PERF_FRONTEND_DIR="$PROJECT_ROOT/frontend/performance-reports"

echo -e "${BLUE}🧹 Nettoyage des rapports vides ou obsolètes...${NC}"
echo ""

deleted_count=0

# Nettoyer les rapports de tests results
if [ -d "$RESULTS_DIR" ]; then
    echo -e "${YELLOW}📁 Analyse de $RESULTS_DIR...${NC}"
    
    for dir in "$RESULTS_DIR"/*/; do
        if [ ! -d "$dir" ]; then
            continue
        fi
        
        dir_name=$(basename "$dir")
        
        # Vérifier si le répertoire est vide ou ne contient que des fichiers vides
        file_count=$(find "$dir" -type f 2>/dev/null | wc -l)
        total_size=$(du -sb "$dir" 2>/dev/null | cut -f1 || echo "0")
        
        # Vérifier s'il y a un rapport HTML valide
        has_html=false
        if [ -f "$dir/report.html" ]; then
            html_size=$(stat -f%z "$dir/report.html" 2>/dev/null || stat -c%s "$dir/report.html" 2>/dev/null || echo "0")
            if [ "$html_size" -gt 1000 ]; then  # Au moins 1KB
                has_html=true
            fi
        fi
        
        # Vérifier s'il y a un summary.json valide
        has_summary=false
        if [ -f "$dir/summary.json" ]; then
            summary_size=$(stat -f%z "$dir/summary.json" 2>/dev/null || stat -c%s "$dir/summary.json" 2>/dev/null || echo "0")
            if [ "$summary_size" -gt 100 ]; then  # Au moins 100 bytes
                has_summary=true
            fi
        fi
        
        # Supprimer si vide, trop petit, ou sans contenu valide
        if [ "$file_count" -eq 0 ] || 
           [ "$total_size" -lt 500 ] || 
           ([ "$has_html" = false ] && [ "$has_summary" = false ] && [ "$file_count" -lt 2 ]); then
            echo -e "${RED}  ❌ Suppression: $dir_name (vide ou invalide)${NC}"
            rm -rf "$dir" 2>/dev/null || {
                # Si erreur de permission, essayer avec chmod
                chmod -R 777 "$dir" 2>/dev/null || true
                rm -rf "$dir" 2>/dev/null || true
            }
            deleted_count=$((deleted_count + 1))
        else
            # Formater la taille de manière lisible
            if command -v numfmt > /dev/null 2>&1; then
                size_display=$(numfmt --to=iec-i --suffix=B $total_size 2>/dev/null || echo "${total_size}B")
            else
                # Fallback si numfmt n'est pas disponible
                if [ "$total_size" -gt 1048576 ]; then
                    size_display=$(awk "BEGIN {printf \"%.1fMB\", $total_size/1048576}")
                elif [ "$total_size" -gt 1024 ]; then
                    size_display=$(awk "BEGIN {printf \"%.1fKB\", $total_size/1024}")
                else
                    size_display="${total_size}B"
                fi
            fi
            echo -e "${GREEN}  ✅ Conservé: $dir_name (${file_count} fichiers, ${size_display})${NC}"
        fi
    done
fi

# Nettoyer les rapports de performance backend
if [ -d "$PERF_BACKEND_DIR" ]; then
    echo ""
    echo -e "${YELLOW}📁 Analyse de $PERF_BACKEND_DIR...${NC}"
    
    # Utiliser find pour éviter les problèmes de glob
    find "$PERF_BACKEND_DIR" -maxdepth 1 \( -name "*.json" -o -name "*.html" \) -type f 2>/dev/null | while read -r file; do
        if [ ! -f "$file" ]; then
            continue
        fi
        
        file_size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "0")
        file_size=${file_size:-0}
        
        if [ "$file_size" -lt 100 ] 2>/dev/null; then  # Moins de 100 bytes
            echo -e "${RED}  ❌ Suppression: $(basename "$file") (trop petit)${NC}"
            rm -f "$file" 2>/dev/null || {
                chmod 777 "$file" 2>/dev/null || true
                rm -f "$file" 2>/dev/null || true
            }
            deleted_count=$((deleted_count + 1))
        fi
    done
fi

# Nettoyer les rapports de performance frontend
if [ -d "$PERF_FRONTEND_DIR" ]; then
    echo ""
    echo -e "${YELLOW}📁 Analyse de $PERF_FRONTEND_DIR...${NC}"
    
    find "$PERF_FRONTEND_DIR" -maxdepth 1 \( -name "*.json" -o -name "*.html" \) -type f 2>/dev/null | while read -r file; do
        if [ ! -f "$file" ]; then
            continue
        fi
        
        file_size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "0")
        file_size=${file_size:-0}
        
        if [ "$file_size" -lt 100 ] 2>/dev/null; then  # Moins de 100 bytes
            echo -e "${RED}  ❌ Suppression: $(basename "$file") (trop petit)${NC}"
            rm -f "$file" 2>/dev/null || {
                chmod 777 "$file" 2>/dev/null || true
                rm -f "$file" 2>/dev/null || true
            }
            deleted_count=$((deleted_count + 1))
        fi
    done || true
fi

echo ""
if [ "$deleted_count" -gt 0 ]; then
    echo -e "${GREEN}✅ $deleted_count rapport(s) supprimé(s)${NC}"
else
    echo -e "${GREEN}✅ Aucun rapport vide trouvé${NC}"
fi

