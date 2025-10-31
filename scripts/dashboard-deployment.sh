#!/bin/bash

# ============================================
# DASHBOARD SUIVI DÉPLOIEMENTS
# ============================================
# Affiche un dashboard interactif des déploiements

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOGS_DIR="$PROJECT_ROOT/logs/deployment"

clear

echo -e "${PURPLE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║         📊 DASHBOARD SUIVI DÉPLOIEMENTS                  ║"
echo "║              JobbingTrack - Database                     ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

if [ ! -d "$LOGS_DIR" ]; then
    echo -e "${YELLOW}⚠️  Aucun historique de déploiement disponible${NC}"
    echo ""
    echo "Lancez un déploiement pour créer l'historique :"
    echo "  bash scripts/deploy-new-database-architecture.sh"
    exit 0
fi

# ============================================
# STATISTIQUES GLOBALES
# ============================================

echo -e "${CYAN}═════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}📈 STATISTIQUES GLOBALES${NC}"
echo -e "${CYAN}═════════════════════════════════════════════════════════════${NC}"
echo ""

TOTAL_DEPLOYMENTS=$(ls "$LOGS_DIR"/deployment_*.log 2>/dev/null | wc -l)
SUCCESS_COUNT=$(grep -l "\[SUCCESS\]" "$LOGS_DIR"/deployment_*.log 2>/dev/null | wc -l)
FAILED_COUNT=$((TOTAL_DEPLOYMENTS - SUCCESS_COUNT))

if [ $TOTAL_DEPLOYMENTS -gt 0 ]; then
    SUCCESS_RATE=$((SUCCESS_COUNT * 100 / TOTAL_DEPLOYMENTS))
else
    SUCCESS_RATE=0
fi

echo -e "${BLUE}📊 Déploiements totaux:${NC}    $TOTAL_DEPLOYMENTS"
echo -e "${GREEN}✅ Réussis:${NC}                $SUCCESS_COUNT"
echo -e "${RED}❌ Échoués:${NC}                 $FAILED_COUNT"
echo -e "${PURPLE}📈 Taux de réussite:${NC}       ${SUCCESS_RATE}%"
echo ""

# ============================================
# DERNIER DÉPLOIEMENT
# ============================================

echo -e "${CYAN}═════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}🔄 DERNIER DÉPLOIEMENT${NC}"
echo -e "${CYAN}═════════════════════════════════════════════════════════════${NC}"
echo ""

LAST_LOG=$(ls -t "$LOGS_DIR"/deployment_*.log 2>/dev/null | head -1)

if [ -n "$LAST_LOG" ]; then
    LAST_DATE=$(basename "$LAST_LOG" | sed 's/deployment_\(.*\)\.log/\1/')
    
    # Formater la date
    YEAR=${LAST_DATE:0:4}
    MONTH=${LAST_DATE:4:2}
    DAY=${LAST_DATE:6:2}
    HOUR=${LAST_DATE:9:2}
    MIN=${LAST_DATE:11:2}
    SEC=${LAST_DATE:13:2}
    
    echo -e "${BLUE}📅 Date:${NC} $DAY/$MONTH/$YEAR $HOUR:$MIN:$SEC"
    
    # Status
    if grep -q "\[SUCCESS\]" "$LAST_LOG"; then
        echo -e "${GREEN}✅ Status: SUCCESS${NC}"
    else
        echo -e "${RED}❌ Status: FAILED${NC}"
    fi
    
    # Durée
    if grep -q "Durée:" "$LAST_LOG"; then
        DURATION=$(grep "Durée:" "$LAST_LOG" | tail -1 | awk '{print $3}')
        echo -e "${BLUE}⏱️  Durée:${NC} $DURATION"
    fi
    
    # Git info
    if grep -q "Branche Git:" "$LAST_LOG"; then
        GIT_INFO=$(grep "Branche Git:" "$LAST_LOG" | tail -1 | cut -d':' -f2-)
        echo -e "${BLUE}🌿 Git:${NC}$GIT_INFO"
    fi
    
    echo ""
    echo -e "${YELLOW}📄 Log complet:${NC} $LAST_LOG"
else
    echo "Aucun déploiement enregistré"
fi

echo ""

# ============================================
# HISTORIQUE DES 5 DERNIERS
# ============================================

echo -e "${CYAN}═════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}📜 HISTORIQUE (5 derniers)${NC}"
echo -e "${CYAN}═════════════════════════════════════════════════════════════${NC}"
echo ""

ls -t "$LOGS_DIR"/deployment_*.log 2>/dev/null | head -5 | while read -r log; do
    DATE=$(basename "$log" | sed 's/deployment_\(.*\)\.log/\1/')
    
    # Formater
    YEAR=${DATE:0:4}
    MONTH=${DATE:4:2}
    DAY=${DATE:6:2}
    HOUR=${DATE:9:2}
    MIN=${DATE:11:2}
    
    # Status
    if grep -q "\[SUCCESS\]" "$log"; then
        STATUS="${GREEN}✅ SUCCESS${NC}"
    else
        STATUS="${RED}❌ FAILED${NC}"
    fi
    
    # Durée
    if grep -q "Durée:" "$log"; then
        DURATION=$(grep "Durée:" "$log" | tail -1 | awk '{print $3}')
    else
        DURATION="N/A"
    fi
    
    echo -e "$STATUS  $DAY/$MONTH/$YEAR $HOUR:$MIN  (${DURATION})"
done

echo ""

# ============================================
# ÉTAT DU SYSTÈME
# ============================================

echo -e "${CYAN}═════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}🔧 ÉTAT ACTUEL DU SYSTÈME${NC}"
echo -e "${CYAN}═════════════════════════════════════════════════════════════${NC}"
echo ""

# Docker containers
CONTAINERS=$(docker ps --filter "name=jobbingtrack-" --format "{{.Names}}" | wc -l)
echo -e "${BLUE}🐳 Conteneurs actifs:${NC}      $CONTAINERS"

# PostgreSQL
if docker ps | grep -q jobbingtrack-postgres; then
    if docker exec jobbingtrack-postgres pg_isready -U jobbingtrack > /dev/null 2>&1; then
        TABLES=$(docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ' || echo "0")
        echo -e "${GREEN}🗄️  PostgreSQL:${NC}             En ligne ($TABLES tables)"
    else
        echo -e "${YELLOW}🗄️  PostgreSQL:${NC}             Démarrage..."
    fi
else
    echo -e "${RED}🗄️  PostgreSQL:${NC}             Arrêté"
fi

# Git
GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
GIT_MODIFIED=$(git status --porcelain | wc -l)
echo -e "${BLUE}🌿 Git:${NC}                     $GIT_BRANCH ($GIT_MODIFIED modifiés)"

echo ""

# ============================================
# LOGS DISPONIBLES
# ============================================

echo -e "${CYAN}═════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}📁 FICHIERS DISPONIBLES${NC}"
echo -e "${CYAN}═════════════════════════════════════════════════════════════${NC}"
echo ""

LOGS_COUNT=$(ls "$LOGS_DIR"/deployment_*.log 2>/dev/null | wc -l)
REPORTS_COUNT=$(ls "$LOGS_DIR"/report_*.md 2>/dev/null | wc -l)
LOGS_SIZE=$(du -sh "$LOGS_DIR" 2>/dev/null | cut -f1)

echo -e "${BLUE}📝 Logs de déploiement:${NC}     $LOGS_COUNT fichiers"
echo -e "${BLUE}📄 Rapports générés:${NC}        $REPORTS_COUNT fichiers"
echo -e "${BLUE}💾 Espace utilisé:${NC}          $LOGS_SIZE"

echo ""
echo -e "${YELLOW}📂 Dossier:${NC} $LOGS_DIR"

echo ""

# ============================================
# ACTIONS DISPONIBLES
# ============================================

echo -e "${CYAN}═════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}⚡ ACTIONS RAPIDES${NC}"
echo -e "${CYAN}═════════════════════════════════════════════════════════════${NC}"
echo ""

echo "1. Voir le dernier log complet:"
echo -e "   ${BLUE}tail -f $LAST_LOG${NC}"
echo ""

echo "2. Voir l'historique complet:"
echo -e "   ${BLUE}bash scripts/track-deployment.sh history${NC}"
echo ""

echo "3. Nettoyer les anciens logs (30 jours):"
echo -e "   ${BLUE}bash scripts/track-deployment.sh cleanup${NC}"
echo ""

echo "4. Exporter les logs:"
echo -e "   ${BLUE}bash scripts/track-deployment.sh export${NC}"
echo ""

echo "5. Lancer un nouveau déploiement:"
echo -e "   ${BLUE}bash scripts/deploy-new-database-architecture.sh${NC}"
echo ""

# ============================================
# FOOTER
# ============================================

echo -e "${PURPLE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  Dashboard mis à jour le $(date +'%d/%m/%Y à %H:%M:%S')      ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Rafraîchissement automatique (optionnel)
if [ "$1" = "--watch" ]; then
    echo -e "${YELLOW}Mode surveillance activé. Rafraîchissement toutes les 30s...${NC}"
    echo -e "${YELLOW}Appuyez sur Ctrl+C pour quitter${NC}"
    echo ""
    sleep 30
    exec "$0" --watch
fi
