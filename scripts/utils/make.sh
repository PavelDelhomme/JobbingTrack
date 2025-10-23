#!/usr/bin/env bash

# ============================================================================
# Script de remplacement pour les commandes make - JobbingTrack
# ============================================================================
# Usage: ./make.sh <commande>
#
# Commandes disponibles:
#   up              - Démarrer services essentiels
#   up-full         - Démarrer tous les services
#   down            - Arrêter tous les services
#   logs            - Voir les logs
#   status          - Voir le statut des services
#   help            - Afficher cette aide
# ============================================================================

# Couleurs pour les messages
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Fonction d'aide
show_help() {
    echo "================================================================"
    echo "🚀 JOBBINGTRACK - REMPLACEMENT POUR MAKE"
    echo "================================================================"
    echo ""
    echo "📦 DÉMARRAGE RAPIDE:"
    echo "  ./make.sh up              - Démarrer services essentiels uniquement"
    echo "  ./make.sh up-full         - Démarrer TOUS les services"
    echo "  ./make.sh down            - Arrêter tous les services"
    echo ""
    echo "🔍 DIAGNOSTICS:"
    echo "  ./make.sh logs            - Afficher tous les logs"
    echo "  ./make.sh status          - Statut détaillé de chaque service"
    echo ""
    echo "💡 ASTUCES:"
    echo "  • Tous les scripts utilisent la détection automatique Docker Compose"
    echo "  • Les services essentiels sont démarrés par défaut"
    echo "  • Utilisez './make-up-full.sh' pour tous les services avec métriques"
    echo ""
    echo "📚 Documentation complète : README.md"
}

# Vérifier les arguments
if [ $# -eq 0 ]; then
    show_help
    exit 0
fi

COMMAND="$1"

case "$COMMAND" in
    "up")
        ./make-up.sh
        ;;
    "up-full")
        ./make-up-full.sh
        ;;
    "down")
        ./make-down.sh
        ;;
    "logs")
        echo -e "${BLUE}📜 Logs en temps réel de tous les services${NC}"
        echo "========================================"
        
        # Détecter la commande Docker Compose
        if command -v docker-compose &> /dev/null; then
            docker-compose -f docker-compose.yml logs -f
        elif docker compose version &> /dev/null 2>&1; then
            docker compose -f docker-compose.yml logs -f
        else
            echo -e "${RED}❌ Docker Compose n'est pas disponible${NC}"
            exit 1
        fi
        ;;
    "status")
        echo -e "${BLUE}📊 Statut détaillé des services JobbingTrack${NC}"
        echo "=========================================="
        echo ""
        echo -e "${RED}🔴 Services essentiels:${NC}"
        
        if command -v docker-compose &> /dev/null; then
            docker-compose -f docker-compose.yml ps postgres redis api-gateway frontend auth-service dashboard-service 2>/dev/null || echo "  Aucun service essentiel en cours d'exécution"
        elif docker compose version &> /dev/null 2>&1; then
            docker compose -f docker-compose.yml ps postgres redis api-gateway frontend auth-service dashboard-service 2>/dev/null || echo "  Aucun service essentiel en cours d'exécution"
        else
            echo -e "${RED}❌ Docker Compose n'est pas disponible${NC}"
            exit 1
        fi
        
        echo ""
        echo -e "${YELLOW}🟡 Services optionnels:${NC}"
        if command -v docker-compose &> /dev/null; then
            docker-compose -f docker-compose.yml ps | grep -v "postgres\|redis\|api-gateway\|frontend\|auth-service\|dashboard-service\|NAME\|---" 2>/dev/null || echo "  Aucun service optionnel en cours d'exécution"
        elif docker compose version &> /dev/null 2>&1; then
            docker compose -f docker-compose.yml ps | grep -v "postgres\|redis\|api-gateway\|frontend\|auth-service\|dashboard-service\|NAME\|---" 2>/dev/null || echo "  Aucun service optionnel en cours d'exécution"
        fi
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        echo -e "${RED}❌ Commande inconnue: $COMMAND${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
