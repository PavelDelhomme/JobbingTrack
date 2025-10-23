#!/usr/bin/env bash

# ============================================================================
# Docker Compose Wrapper - Détection automatique et portable
# ============================================================================
# Ce script fournit des fonctions utilitaires pour détecter automatiquement
# la commande Docker Compose disponible (docker-compose ou docker compose)
# et fournit un wrapper pour l'utiliser de manière transparente.
#
# Usage dans les scripts:
#   source "$(dirname "$0")/../utils/docker-compose-wrapper.sh"
#   init_docker_compose_detection
#   docker_compose_wrapper [args...]
#
# Variables globales exportées:
#   DOCKER_COMPOSE_CMD - La commande détectée ("docker-compose" ou "docker compose")
# ============================================================================

# Couleurs pour les messages (si pas déjà définies)
if [ -z "$GREEN" ]; then
    GREEN='\033[0;32m'
    RED='\033[0;31m'
    YELLOW='\033[1;33m'
    NC='\033[0m'
fi

# ============================================================================
# DÉTECTION DOCKER COMPOSE
# ============================================================================

# Variable globale pour stocker la commande détectée
DOCKER_COMPOSE_CMD=""

# Détecte automatiquement la commande Docker Compose disponible
detect_docker_compose_cmd() {
    if command -v docker-compose &> /dev/null; then
        echo "docker-compose"
    elif docker compose version &> /dev/null 2>&1; then
        echo "docker compose"
    else
        echo ""
    fi
}

# Initialise la détection Docker Compose
init_docker_compose_detection() {
    DOCKER_COMPOSE_CMD=$(detect_docker_compose_cmd)

    if [ -z "$DOCKER_COMPOSE_CMD" ]; then
        echo -e "${RED}❌ Docker Compose n'est pas disponible${NC}" >&2
        echo -e "${YELLOW}💡 Installez Docker Compose ou utilisez Docker Desktop${NC}" >&2
        return 1
    fi

    return 0
}

# Wrapper pour les commandes Docker Compose
docker_compose_wrapper() {
    if [ -z "$DOCKER_COMPOSE_CMD" ]; then
        echo -e "${RED}❌ Docker Compose non initialisé${NC}" >&2
        echo -e "${YELLOW}💡 Appelez init_docker_compose_detection() d'abord${NC}" >&2
        return 1
    fi

    if [ "$DOCKER_COMPOSE_CMD" = "docker-compose" ]; then
        docker-compose "$@"
    else
        docker compose "$@"
    fi
}

# ============================================================================
# FONCTIONS DE VÉRIFICATION
# ============================================================================

# Vérifie que Docker est disponible
check_docker_available() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker n'est pas installé${NC}" >&2
        return 1
    fi

    if ! docker info &> /dev/null; then
        echo -e "${RED}❌ Docker daemon n'est pas en cours d'exécution${NC}" >&2
        return 1
    fi

    return 0
}

# Vérifie que Docker Compose est disponible et fonctionnel
check_docker_compose_available() {
    if ! init_docker_compose_detection; then
        return 1
    fi

    # Test que la commande fonctionne
    if ! docker_compose_wrapper version &> /dev/null; then
        echo -e "${RED}❌ Docker Compose ne fonctionne pas correctement${NC}" >&2
        return 1
    fi

    return 0
}

# ============================================================================
# FONCTIONS D'AFFICHAGE
# ============================================================================

# Affiche les informations de détection
show_detection_info() {
    if [ -n "$DOCKER_COMPOSE_CMD" ]; then
        echo -e "${GREEN}✅ Docker Compose détecté: $DOCKER_COMPOSE_CMD${NC}"
    fi
}

# Export des fonctions pour les scripts enfants
export -f detect_docker_compose_cmd
export -f init_docker_compose_detection
export -f docker_compose_wrapper
export -f check_docker_available
export -f check_docker_compose_available
export -f show_detection_info

# Export de la variable
export DOCKER_COMPOSE_CMD
