#!/bin/bash
# Script pour supprimer TOUS les rapports de tests (nettoyage complet)

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
RESULTS_DIR="$PROJECT_ROOT/tests/results"
PERF_BACKEND_DIR="$PROJECT_ROOT/reports/performance/backend"
PERF_FRONTEND_DIR="$PROJECT_ROOT/frontend/performance-reports"
PLAYWRIGHT_DIR="$PROJECT_ROOT/frontend/playwright-report"

echo -e "${RED}⚠️  ATTENTION: Suppression de TOUS les rapports de tests${NC}"
echo -e "${YELLOW}Ce script va supprimer:${NC}"
echo "  • Tous les rapports dans $RESULTS_DIR"
echo "  • Tous les rapports de performance backend"
echo "  • Tous les rapports de performance frontend"
echo "  • Le rapport Playwright"
echo ""
read -p "Êtes-vous sûr de vouloir continuer ? (tapez 'OUI' pour confirmer): " confirmation

if [ "$confirmation" != "OUI" ]; then
    echo -e "${YELLOW}❌ Annulé${NC}"
    exit 0
fi

deleted_count=0

# Supprimer tous les rapports de tests results
if [ -d "$RESULTS_DIR" ]; then
    echo ""
    echo -e "${BLUE}🗑️  Suppression de tous les rapports dans $RESULTS_DIR...${NC}"
    
    for dir in "$RESULTS_DIR"/*/; do
        if [ ! -d "$dir" ]; then
            continue
        fi
        
        dir_name=$(basename "$dir")
        echo -e "${YELLOW}  Suppression: $dir_name${NC}"
        
        # Essayer plusieurs méthodes de suppression
        success=false
        
        # Méthode 1: Suppression directe
        if rm -rf "$dir" 2>/dev/null; then
            if [ ! -d "$dir" ]; then
                success=true
            fi
        fi
        
        # Méthode 2: Chmod puis suppression
        if [ "$success" = false ] && [ -d "$dir" ]; then
            chmod -R 777 "$dir" 2>/dev/null || true
            if rm -rf "$dir" 2>/dev/null; then
                if [ ! -d "$dir" ]; then
                    success=true
                fi
            fi
        fi
        
        # Méthode 3: Via Docker exec
        if [ "$success" = false ] && [ -d "$dir" ]; then
            if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^jobbingtrack-frontend$"; then
                docker_path="/app/tests/results/$dir_name"
                docker exec jobbingtrack-frontend rm -rf "$docker_path" 2>/dev/null || true
                # Attendre un peu pour que Docker termine
                sleep 0.5
                if [ ! -d "$dir" ]; then
                    success=true
                fi
            fi
        fi
        
        # Méthode 4: Sudo
        if [ "$success" = false ] && [ -d "$dir" ]; then
            sudo rm -rf "$dir" 2>/dev/null || true
            if [ ! -d "$dir" ]; then
                success=true
            fi
        fi
        
        # Vérifier le résultat
        if [ ! -d "$dir" ]; then
            deleted_count=$((deleted_count + 1))
            echo -e "${GREEN}    ✅ Supprimé${NC}"
        else
            echo -e "${RED}    ❌ Échec de suppression: $dir${NC}"
            echo -e "${YELLOW}    💡 Essayez manuellement: sudo rm -rf \"$dir\"${NC}"
        fi
    done
fi

# Supprimer tous les rapports de performance backend
if [ -d "$PERF_BACKEND_DIR" ]; then
    echo ""
    echo -e "${BLUE}🗑️  Suppression des rapports de performance backend...${NC}"
    
    find "$PERF_BACKEND_DIR" -maxdepth 1 -type f \( -name "*.json" -o -name "*.html" \) 2>/dev/null | while read -r file; do
        if [ -f "$file" ]; then
            echo -e "${YELLOW}  Suppression: $(basename "$file")${NC}"
            rm -f "$file" 2>/dev/null || {
                chmod 777 "$file" 2>/dev/null || true
                rm -f "$file" 2>/dev/null || {
                    if docker ps --format '{{.Names}}' | grep -q "^jobbingtrack-frontend$" 2>/dev/null; then
                        docker_path="/app/reports/performance/backend/$(basename "$file")"
                        docker exec jobbingtrack-frontend rm -f "$docker_path" 2>/dev/null || true
                    fi
                    sudo rm -f "$file" 2>/dev/null || true
                }
            }
            if [ ! -f "$file" ]; then
                deleted_count=$((deleted_count + 1))
                echo -e "${GREEN}    ✅ Supprimé${NC}"
            fi
        fi
    done
fi

# Supprimer tous les rapports de performance frontend
if [ -d "$PERF_FRONTEND_DIR" ]; then
    echo ""
    echo -e "${BLUE}🗑️  Suppression des rapports de performance frontend...${NC}"
    
    find "$PERF_FRONTEND_DIR" -maxdepth 1 -type f \( -name "*.json" -o -name "*.html" \) 2>/dev/null | while read -r file; do
        if [ -f "$file" ]; then
            echo -e "${YELLOW}  Suppression: $(basename "$file")${NC}"
            rm -f "$file" 2>/dev/null || {
                chmod 777 "$file" 2>/dev/null || true
                rm -f "$file" 2>/dev/null || {
                    if docker ps --format '{{.Names}}' | grep -q "^jobbingtrack-frontend$" 2>/dev/null; then
                        docker_path="/app/frontend/performance-reports/$(basename "$file")"
                        docker exec jobbingtrack-frontend rm -f "$docker_path" 2>/dev/null || true
                    fi
                    sudo rm -f "$file" 2>/dev/null || true
                }
            }
            if [ ! -f "$file" ]; then
                deleted_count=$((deleted_count + 1))
                echo -e "${GREEN}    ✅ Supprimé${NC}"
            fi
        fi
    done
fi

# Supprimer le rapport Playwright (garder le dossier mais vider son contenu)
if [ -d "$PLAYWRIGHT_DIR" ]; then
    echo ""
    echo -e "${BLUE}🗑️  Nettoyage du rapport Playwright...${NC}"
    rm -rf "$PLAYWRIGHT_DIR"/* 2>/dev/null || {
        chmod -R 777 "$PLAYWRIGHT_DIR" 2>/dev/null || true
        rm -rf "$PLAYWRIGHT_DIR"/* 2>/dev/null || {
            if docker ps --format '{{.Names}}' | grep -q "^jobbingtrack-frontend$" 2>/dev/null; then
                docker exec jobbingtrack-frontend rm -rf /app/frontend/playwright-report/* 2>/dev/null || true
            fi
            sudo rm -rf "$PLAYWRIGHT_DIR"/* 2>/dev/null || true
        }
    }
    echo -e "${GREEN}  ✅ Rapport Playwright nettoyé${NC}"
fi

echo ""
echo -e "${GREEN}✅ Nettoyage terminé !${NC}"
echo -e "${BLUE}📊 $deleted_count élément(s) supprimé(s)${NC}"

