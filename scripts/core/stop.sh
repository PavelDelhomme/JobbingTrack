#!/usr/bin/env bash

# ============================================================================
# Script d'arrêt système - JobbingTrack
# ============================================================================
# Arrête proprement l'intégralité du système JobbingTrack
#
# Usage: ./scripts/core/stop.sh [OPTIONS]
#
# Options:
#   --clean           Nettoyer complètement (volumes, images)
#   --metrics-only    N'arrêter que les services de métriques
#   --help            Afficher cette aide
#
# Exemples:
#   ./scripts/core/stop.sh --clean
#   ./scripts/core/stop.sh --metrics-only
# ============================================================================

set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration

# ============================================================================
# DÉTECTION AUTOMATIQUE DOCKER COMPOSE
# ============================================================================

# Import du wrapper Docker Compose utilitaire
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UTILS_DIR="$SCRIPT_DIR/../utils"

if [ -f "$UTILS_DIR/docker_compose_wrapper-wrapper.sh" ]; then
    source "$UTILS_DIR/docker_compose_wrapper-wrapper.sh"

    # Initialiser la détection Docker Compose
    if ! init_docker_compose_detection; then
        echo -e "${RED}❌ Impossible d'initialiser Docker Compose${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Wrapper Docker Compose non trouvé${NC}"
    exit 1
fi
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CLEAN=false
METRICS_ONLY=false

# Fonction d'aide
show_help() {
    echo -e "${BLUE}🛑 Arrêt Système - JobbingTrack${NC}"
    echo "================================"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --clean           Nettoyer complètement (volumes, images)"
    echo "  --metrics-only    N'arrêter que les services de métriques"
    echo "  --help            Afficher cette aide"
    echo ""
    echo "Exemples:"
    echo "  $0 --clean                    # Arrêt complet avec nettoyage"
    echo "  $0 --metrics-only             # Arrêt des métriques seulement"
    echo "  $0                            # Arrêt standard"
}

# Gestion des arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --clean)
            CLEAN=true
            shift
            ;;
        --metrics-only)
            METRICS_ONLY=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Option inconnue: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Import du wrapper Docker Compose utilitaire
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UTILS_DIR="$SCRIPT_DIR/../utils"

if [ -f "$UTILS_DIR/docker-compose-wrapper.sh" ]; then
    source "$UTILS_DIR/docker-compose-wrapper.sh"

    # Initialiser la détection Docker Compose (avec cache)
    init_docker_compose_detection 2>/dev/null || echo -e "${YELLOW}⚠️ Impossible d'initialiser Docker Compose${NC}"
fi

echo -e "${BLUE}🛑 Arrêt de JobbingTrack${NC}"
echo "=========================="

if [ "$METRICS_ONLY" = true ]; then
    echo -e "${YELLOW}📊 Arrêt des services de métriques uniquement...${NC}"
    "$SCRIPT_DIR/../monitoring/stop.sh"
else
    # Arrêter tous les services backend
    echo -e "${BLUE}🔽 Arrêt des services backend...${NC}"
    cd "$PROJECT_ROOT"
    make down

    # Arrêter les métriques si elles sont démarrées
    if [ -f "/tmp/jobbingtrack-metrics.pid" ] || ps aux | grep -v grep | grep -q "start-monitoring"; then
        echo -e "${YELLOW}📊 Arrêt des services de métriques...${NC}"
        "$SCRIPT_DIR/../monitoring/stop.sh" 2>/dev/null || true
    fi
fi

if [ "$CLEAN" = true ]; then
    echo -e "${YELLOW}🧹 Nettoyage complet...${NC}"
    cd "$PROJECT_ROOT"
    make clean
fi

echo ""
echo -e "${GREEN}✅ JobbingTrack arrêté avec succès !${NC}"

if [ "$CLEAN" = true ]; then
    echo ""
    echo -e "${BLUE}💡 Pour redémarrer :${NC}"
    echo "   ./scripts/core/start.sh"
else
    echo ""
    echo -e "${BLUE}💡 Pour redémarrer :${NC}"
    echo "   make up"
    echo "   cd frontend && docker_compose_wrapper up -d"
fi
