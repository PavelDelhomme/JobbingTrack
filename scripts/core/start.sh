#!/usr/bin/env bash

# ============================================================================
# Script de démarrage système - JobbingTrack
# ============================================================================
# Démarre l'intégralité du système JobbingTrack avec options avancées
#
# Usage: ./scripts/core/start.sh [OPTIONS]
#
# Options:
#   --rebuild          Reconstruire les images Docker avant le démarrage
#   --with-metrics     Inclure le système de métriques complet
#   --quick           Démarrage rapide (pas d'attente, pas de vérifications)
#   --help            Afficher cette aide
#
# Exemples:
#   ./scripts/core/start.sh --rebuild --with-metrics
#   ./scripts/core/start.sh --quick
# ============================================================================

set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
REBUILD=false
WITH_METRICS=false
QUICK=false

# ============================================================================
# DÉTECTION AUTOMATIQUE DOCKER COMPOSE
# ============================================================================

# Import du wrapper Docker Compose utilitaire
UTILS_DIR="$SCRIPT_DIR/../utils"

if [ -f "$UTILS_DIR/docker-compose-wrapper.sh" ]; then
    source "$UTILS_DIR/docker-compose-wrapper.sh"

    # Initialiser la détection Docker Compose
    if ! init_docker_compose_detection; then
        echo -e "${RED}❌ Impossible d'initialiser Docker Compose${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Wrapper Docker Compose non trouvé${NC}"
    exit 1
fi

# Fonction d'aide
show_help() {
    echo -e "${BLUE}🚀 Démarrage Système - JobbingTrack${NC}"
    echo "======================================"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --rebuild          Reconstruire les images Docker avant le démarrage"
    echo "  --with-metrics     Inclure le système de métriques complet"
    echo "  --quick           Démarrage rapide (pas d'attente, pas de vérifications)"
    echo "  --help            Afficher cette aide"
    echo ""
    echo "Exemples:"
    echo "  $0 --rebuild --with-metrics    # Démarrage complet avec métriques"
    echo "  $0 --quick                     # Démarrage rapide"
    echo "  $0                             # Démarrage standard"
    echo ""
    echo "Interfaces disponibles après démarrage:"
    echo "  🌐 Frontend:           http://localhost:8080"
    echo "  🔧 Dashboard admin:    http://localhost:8080/backoffice"
    echo "  🚪 API Gateway:        http://localhost:3000"
    echo ""
    echo "📊 Services de métriques (si --with-metrics):"
    echo "  📈 Prometheus:         http://localhost:9090"
    echo "  📊 Grafana:           http://localhost:4000"
    echo "  🖥️ cAdvisor:           http://localhost:8080"
}

# Gestion des arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --rebuild)
            REBUILD=true
            shift
            ;;
        --with-metrics)
            WITH_METRICS=true
            shift
            ;;
        --quick)
            QUICK=true
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

echo -e "${BLUE}🚀 Démarrage de JobbingTrack${NC}"
echo "================================"

# Initialiser la détection Docker Compose (avec cache)
if ! init_docker_compose_detection 2>/dev/null; then
    echo -e "${RED}❌ Impossible d'initialiser Docker/Docker Compose${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker et Docker Compose sont disponibles${NC}"
show_detection_info

# Vérifier si on doit reconstruire
if [ "$REBUILD" = true ]; then
    echo -e "${YELLOW}🔨 Reconstruction des images Docker...${NC}"
    cd "$PROJECT_ROOT"
    docker_compose_wrapper -f docker-compose.yml build
fi

# Démarrer les services backend
echo -e "${BLUE}🌐 Démarrage des services backend...${NC}"
cd "$PROJECT_ROOT"

# Utiliser docker compose directement au lieu de make
echo -e "${BLUE}🚀 Démarrage des services essentiels JobbingTrack...${NC}"
echo "📦 Services: postgres, redis, api-gateway, frontend, auth-service, dashboard-service"

if ! check_docker_available; then
    echo -e "${RED}❌ Docker n'est pas disponible${NC}"
    exit 1
fi

show_detection_info

# Démarrer les services essentiels
docker_compose_wrapper -f docker-compose.yml up -d postgres redis api-gateway frontend auth-service dashboard-service

echo ""
echo -e "${GREEN}✅ Services essentiels démarrés avec succès !${NC}"
echo ""
echo -e "${BLUE}🌐 Interfaces disponibles :${NC}"
echo "   Frontend:           http://localhost:8080"
echo "   API Gateway:        http://localhost:3000"
echo "   Auth Service:       http://localhost:3001"
echo "   Dashboard Service:  http://localhost:3007"
echo ""
echo -e "${BLUE}🔑 Identifiants de connexion :${NC}"
echo "   Email:    ${ADMIN_EMAIL:-admin@jobbingtrack.test}"
echo "   Password: SuperAdmin123!"
echo ""
echo -e "${YELLOW}💡 Utilisez 'make up-full' pour démarrer tous les services${NC}"

# Attendre que les services soient prêts (sauf en mode quick)
if [ "$QUICK" = false ]; then
    echo -e "${YELLOW}⏳ Attente de la disponibilité des services...${NC}"
    sleep 15

    # Créer l'utilisateur admin
    echo -e "${PURPLE}👤 Création de l'utilisateur administrateur...${NC}"
    "$SCRIPT_DIR/../database/create-admin-user.sh"

    # Vérifier que tout fonctionne
    echo -e "${BLUE}🔍 Vérification de l'état des services...${NC}"
    "$SCRIPT_DIR/../core/check.sh" || echo -e "${YELLOW}⚠️ Certaines vérifications ont échoué${NC}"
fi

# Démarrer les métriques si demandé
if [ "$WITH_METRICS" = true ]; then
    echo -e "${PURPLE}📊 Démarrage du système de métriques...${NC}"
    "$SCRIPT_DIR/../monitoring/start.sh"
fi

echo ""
echo -e "${GREEN}🎉 JobbingTrack est maintenant opérationnel !${NC}"
echo ""

# Afficher les informations de connexion
echo -e "${BLUE}🔑 Informations de connexion :${NC}"
echo "   📧 Email:    ${ADMIN_EMAIL:-admin@jobbingtrack.test}"
echo "   🔐 Mot de passe: SuperAdmin123!"
echo ""

echo -e "${BLUE}🌐 Interfaces disponibles :${NC}"
echo "   Frontend:           http://localhost:8080"
echo "   Dashboard admin:    http://localhost:8080/backoffice"
echo "   API Gateway:        http://localhost:3000"

if [ "$WITH_METRICS" = true ]; then
    echo ""
    echo -e "${PURPLE}📊 Services de métriques :${NC}"
    echo "   Prometheus:         http://localhost:9090"
    echo "   Grafana:           http://localhost:4000"
    echo "   cAdvisor:           http://localhost:8080"
fi

echo ""
echo -e "${BLUE}💡 Commandes utiles :${NC}"
echo "   make logs           - Voir les logs de tous les services"
echo "   make status         - Voir le statut des services"
echo "   make down           - Arrêter tous les services"
echo "   make clean          - Nettoyer complètement"

if [ "$QUICK" = false ]; then
    echo "   make metrics-test   - Tester le système de métriques"
fi

echo ""
echo -e "${GREEN}📚 Documentation complète : README.md${NC}"
if [ "$WITH_METRICS" = true ]; then
    echo -e "${GREEN}📊 Guide des métriques : METRICS_SYSTEM_README.md${NC}"
fi
