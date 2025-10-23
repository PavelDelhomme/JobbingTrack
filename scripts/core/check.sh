#!/usr/bin/env bash

# ============================================================================
# Script de vérification système - JobbingTrack
# ============================================================================
# Vérifie l'état de santé de l'intégralité du système JobbingTrack
#
# Usage: ./scripts/core/check.sh [OPTIONS]
#
# Options:
#   --quick           Vérification rapide (services essentiels uniquement)
#   --detailed        Vérification détaillée avec diagnostics
#   --fix             Tenter de corriger les problèmes détectés
#   --help            Afficher cette aide
#
# Codes de sortie:
#   0 = Tout fonctionne correctement
#   1 = Problèmes détectés
#   2 = Erreur critique
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
QUICK=false
DETAILED=false
FIX=false
EXIT_CODE=0

# Fonction d'aide
show_help() {
    echo -e "${BLUE}🔍 Vérification Système - JobbingTrack${NC}"
    echo "===================================="
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --quick           Vérification rapide (services essentiels uniquement)"
    echo "  --detailed        Vérification détaillée avec diagnostics"
    echo "  --fix             Tenter de corriger les problèmes détectés"
    echo "  --help            Afficher cette aide"
    echo ""
    echo "Exemples:"
    echo "  $0 --quick                      # Vérification rapide"
    echo "  $0 --detailed                   # Vérification complète"
    echo "  $0 --fix                        # Diagnostic et correction"
    echo ""
    echo "Codes de sortie:"
    echo "  0 = Tout fonctionne correctement"
    echo "  1 = Problèmes détectés"
    echo "  2 = Erreur critique"
}

# Gestion des arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --quick)
            QUICK=true
            shift
            ;;
        --detailed)
            DETAILED=true
            shift
            ;;
        --fix)
            FIX=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Option inconnue: $1${NC}"
            show_help
            exit 2
            ;;
    esac
done

# Fonction pour vérifier Docker
check_docker() {
    echo -e "\n${BLUE}🐳 Vérification de Docker${NC}"

    if ! check_docker_available; then
        if [ "$FIX" = true ]; then
            echo -e "${YELLOW}💡 Installez Docker : https://docker.com/get-started${NC}"
            echo -e "${YELLOW}💡 Démarrer Docker : sudo systemctl start docker (Linux)${NC}"
        fi
        return 1
    fi

    echo -e "${GREEN}✅ Docker est opérationnel${NC}"
    return 0
}

# ============================================================================
# DÉTECTION AUTOMATIQUE DOCKER COMPOSE
# ============================================================================

# Import du wrapper Docker Compose utilitaire
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UTILS_DIR="$SCRIPT_DIR/../utils"

if [ -f "$UTILS_DIR/docker_compose_wrapper.sh" ]; then
    source "$UTILS_DIR/docker_compose_wrapper.sh"
else
    echo -e "${RED}❌ Wrapper Docker Compose non trouvé${NC}" >&2
    exit 1
fi

# Fonction pour vérifier Docker Compose
check_docker_compose() {
    echo -e "\n${BLUE}🐳 Vérification de Docker Compose${NC}"

    if ! check_docker_compose_available; then
        if [ "$FIX" = true ]; then
            echo -e "${YELLOW}💡 Installez Docker Compose${NC}"
        fi
        return 1
    fi

    show_detection_info
    return 0
}

# Fonction pour vérifier les services essentiels
check_essential_services() {
    echo -e "\n${BLUE}🔧 Vérification des services essentiels${NC}"

    local services=("postgres" "redis" "api-gateway" "frontend" "auth-service" "dashboard-service")
    local all_ok=true

    for service in "${services[@]}"; do
        if docker ps --format "table {{.Names}}" | grep -q "jobbingtrack-$service\|$service"; then
            echo -e "${GREEN}✅ $service - En cours d'exécution${NC}"
        else
            echo -e "${RED}❌ $service - Arrêté${NC}"
            all_ok=false
            if [ "$FIX" = true ]; then
                echo -e "${YELLOW}💡 Démarrer le service : make up${NC}"
            fi
        fi
    done

    $all_ok && return 0 || return 1
}

# Fonction pour vérifier les endpoints principaux
check_main_endpoints() {
    echo -e "\n${BLUE}🔗 Vérification des endpoints principaux${NC}"

    local endpoints=(
        "http://localhost:3000/health"
        "http://localhost:8080"
        "http://localhost:3001/health"
        "http://localhost:3007/health"
    )

    local all_ok=true

    for endpoint in "${endpoints[@]}"; do
        if curl -f -s --max-time 10 "$endpoint" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $endpoint - Accessible${NC}"
        else
            echo -e "${RED}❌ $endpoint - Non accessible${NC}"
            all_ok=false
            if [ "$FIX" = true ]; then
                echo -e "${YELLOW}💡 Attendre le démarrage complet des services${NC}"
            fi
        fi
    done

    $all_ok && return 0 || return 1
}

# Fonction pour vérifier la base de données
check_database() {
    echo -e "\n${BLUE}🗄️ Vérification de la base de données${NC}"

    if command -v psql >/dev/null 2>&1; then
        if PGPASSWORD=jobbingtrack123 psql -h localhost -U jobbingtrack -d jobbingtrack -c "SELECT 1;" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ PostgreSQL - Connexion réussie${NC}"
            return 0
        fi
    fi

    # Test via Docker si psql n'est pas disponible localement
    if docker_compose_wrapper exec -T postgres psql -U jobbingtrack -d jobbingtrack -c "SELECT 1;" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ PostgreSQL - Accessible via Docker${NC}"
        return 0
    fi

    echo -e "${RED}❌ PostgreSQL - Non accessible${NC}"
    if [ "$FIX" = true ]; then
        echo -e "${YELLOW}💡 Vérifier que PostgreSQL est démarré${NC}"
    fi
    return 1
}

# Fonction pour vérifier Redis
check_redis() {
    echo -e "\n${BLUE}🔴 Vérification de Redis${NC}"

    if command -v redis-cli >/dev/null 2>&1; then
        if redis-cli -h localhost -p 6379 ping >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Redis - Connexion réussie${NC}"
            return 0
        fi
    fi

    # Test via Docker si redis-cli n'est pas disponible localement
    if docker_compose_wrapper exec -T redis redis-cli ping >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Redis - Accessible via Docker${NC}"
        return 0
    fi

    echo -e "${RED}❌ Redis - Non accessible${NC}"
    if [ "$FIX" = true ]; then
        echo -e "${YELLOW}💡 Vérifier que Redis est démarré${NC}"
    fi
    return 1
}

# Fonction pour vérifier les services de métriques
check_metrics_services() {
    if [ "$QUICK" = true ]; then
        return 0
    fi

    echo -e "\n${PURPLE}📊 Vérification des services de métriques${NC}"

    local metrics_services=("prometheus" "grafana" "cadvisor")
    local all_ok=true

    for service in "${metrics_services[@]}"; do
        if docker ps --format "table {{.Names}}" | grep -q "$service"; then
            echo -e "${GREEN}✅ $service - En cours d'exécution${NC}"
        else
            echo -e "${YELLOW}⚠️ $service - Non démarré (optionnel)${NC}"
        fi
    done

    return 0
}

# Fonction pour vérifier l'espace disque
check_disk_space() {
    if [ "$DETAILED" = false ]; then
        return 0
    fi

    echo -e "\n${BLUE}💾 Vérification de l'espace disque${NC}"

    local usage=$(df . | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$usage" -gt 90 ]; then
        echo -e "${RED}❌ Espace disque critique: ${usage}%${NC}"
        if [ "$FIX" = true ]; then
            echo -e "${YELLOW}💡 Libérer de l'espace disque${NC}"
        fi
        return 1
    elif [ "$usage" -gt 80 ]; then
        echo -e "${YELLOW}⚠️ Espace disque faible: ${usage}%${NC}"
        return 0
    else
        echo -e "${GREEN}✅ Espace disque OK: ${usage}%${NC}"
        return 0
    fi
}

# Fonction pour vérifier la mémoire
check_memory() {
    if [ "$DETAILED" = false ]; then
        return 0
    fi

    echo -e "\n${BLUE}🧠 Vérification de la mémoire${NC}"

    local mem_usage=$(free | awk 'NR==2{printf "%.1f", $3*100/$2 }')
    if (( $(echo "$mem_usage > 90" | bc -l) )); then
        echo -e "${RED}❌ Mémoire critique: ${mem_usage}%${NC}"
        if [ "$FIX" = true ]; then
            echo -e "${YELLOW}💡 Fermer les applications inutiles${NC}"
        fi
        return 1
    elif (( $(echo "$mem_usage > 80" | bc -l) )); then
        echo -e "${YELLOW}⚠️ Mémoire élevée: ${mem_usage}%${NC}"
        return 0
    else
        echo -e "${GREEN}✅ Mémoire OK: ${mem_usage}%${NC}"
        return 0
    fi
}

# Fonction principale
main() {
    echo -e "${BLUE}🔍 Vérification complète du système JobbingTrack${NC}"
    echo "=============================================="

    local issues=0

    # Vérifications de base
    check_docker || ((issues++))
    check_docker_compose || ((issues++))

    # Vérifications des services
    check_essential_services || ((issues++))
    check_main_endpoints || ((issues++))

    # Vérifications des dépendances
    check_database || ((issues++))
    check_redis || ((issues++))

    # Vérifications avancées (si détaillé)
    check_metrics_services
    check_disk_space || ((issues++))
    check_memory || ((issues++))

    # Résumé
    echo -e "\n${BLUE}📊 Résumé de la vérification${NC}"
    echo "============================"

    if [ $issues -eq 0 ]; then
        echo -e "${GREEN}✅ Tous les systèmes sont opérationnels !${NC}"
        echo ""
        echo -e "${BLUE}🌐 Interfaces disponibles :${NC}"
        echo "   Frontend:           http://localhost:8080"
        echo "   API Gateway:        http://localhost:3000"
        echo ""
        echo -e "${BLUE}💡 Commandes utiles :${NC}"
        echo "   make logs           - Voir les logs"
        echo "   make status         - Statut des services"
        return 0
    else
        echo -e "${RED}❌ $issues problème(s) détecté(s)${NC}"
        if [ "$FIX" = false ]; then
            echo ""
            echo -e "${YELLOW}💡 Utilisez --fix pour tenter une correction automatique${NC}"
        fi
        return 1
    fi
}

# Exécution
main "$@"
