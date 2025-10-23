#!/usr/bin/env bash

# ============================================================================
# Docker Compose Wrapper - Détection automatique et portable
# ============================================================================
# Ce script fournit des fonctions utilitaires pour détecter automatiquement
# la commande Docker Compose disponible (docker-compose ou docker compose)
# et fournit un wrapper pour l'utiliser de manière transparente.
#
# Le système teste RÉELLEMENT les commandes au lieu de juste vérifier l'existence
# des binaires, et met en cache le résultat pour une utilisation optimale.
#
# Usage dans les scripts:
#   source "$(dirname "$0")/../utils/docker-compose-wrapper.sh"
#   init_docker_compose_detection
#   docker_compose_wrapper [args...]
#
# Variables globales exportées:
#   DOCKER_COMPOSE_CMD - La commande détectée ("docker-compose" ou "docker compose")
#   DOCKER_DETECTED - Booléen indiquant si Docker a été détecté
# ============================================================================

# Couleurs pour les messages (si pas déjà définies)
if [ -z "$GREEN" ]; then
    GREEN='\033[0;32m'
    RED='\033[0;31m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    NC='\033[0m'
fi

# ============================================================================
# CACHE ET VARIABLES GLOBALES
# ============================================================================

# Variables globales
DOCKER_COMPOSE_CMD=""
DOCKER_DETECTED="false"
DOCKER_COMPOSE_CACHE_FILE="/tmp/jobbingtrack_docker_compose_cache"

# ============================================================================
# DÉTECTION ROBUSTE DOCKER
# ============================================================================

# Teste si Docker est disponible et fonctionnel
test_docker_available() {
    # Test 1: Vérifier si la commande docker existe
    if ! command -v docker &>/dev/null; then
        echo -e "${RED}❌ Docker n'est pas installé${NC}" >&2
        return 1
    fi

    # Test 2: Tester que docker fonctionne vraiment (pas juste qu'il existe)
    if ! docker help &>/dev/null; then
        echo -e "${RED}❌ Docker n'est pas fonctionnel${NC}" >&2
        echo -e "${YELLOW}💡 Vérifiez que Docker daemon est en cours d'exécution${NC}" >&2
        return 1
    fi

    # Test 3: Vérifier que Docker daemon répond
    if ! docker info &>/dev/null; then
        echo -e "${RED}❌ Docker daemon n'est pas accessible${NC}" >&2
        echo -e "${YELLOW}💡 Démarrez Docker: sudo systemctl start docker (Linux)${NC}" >&2
        echo -e "${YELLOW}💡 Ou Docker Desktop (Windows/Mac)${NC}" >&2
        return 1
    fi

    echo -e "${GREEN}✅ Docker est disponible et fonctionnel${NC}"
    return 0
}

# Teste si une commande Docker Compose spécifique fonctionne
test_docker_compose_cmd() {
    local cmd="$1"
    local timeout=5

    echo -e "${BLUE}🧪 Test de '$cmd'...${NC}" >&2

    # Test avec timeout pour éviter les blocages
    if timeout "$timeout" bash -c "$cmd version" &>/dev/null 2>&1; then
        echo -e "${GREEN}✅ '$cmd' fonctionne${NC}" >&2
        return 0
    else
        echo -e "${YELLOW}⚠️ '$cmd' non fonctionnel ou lent${NC}" >&2
        return 1
    fi
}

# Détecte automatiquement la commande Docker Compose qui fonctionne
detect_docker_compose_cmd() {
    local candidates=(
        "docker-compose"
        "docker compose"
    )

    echo -e "${BLUE}🔍 Recherche de Docker Compose fonctionnel...${NC}" >&2

    for cmd in "${candidates[@]}"; do
        if test_docker_compose_cmd "$cmd"; then
            echo -e "${GREEN}✅ Docker Compose détecté: $cmd${NC}" >&2
            echo "$cmd"
            return 0
        fi
    done

    echo -e "${RED}❌ Aucune commande Docker Compose fonctionnelle trouvée${NC}" >&2
    echo ""
    return 1
}

# Met en cache la commande Docker Compose détectée
cache_docker_compose_cmd() {
    local cmd="$1"
    echo "$cmd" > "$DOCKER_COMPOSE_CACHE_FILE" 2>/dev/null || true
    echo -e "${BLUE}💾 Commande mise en cache: $cmd${NC}" >&2
}

# Récupère la commande Docker Compose depuis le cache
get_cached_docker_compose_cmd() {
    if [ -f "$DOCKER_COMPOSE_CACHE_FILE" ]; then
        local cached_cmd=$(cat "$DOCKER_COMPOSE_CACHE_FILE" 2>/dev/null)
        if [ -n "$cached_cmd" ] && test_docker_compose_cmd "$cached_cmd" 2>/dev/null; then
            echo -e "${BLUE}💾 Utilisation du cache: $cached_cmd${NC}" >&2
            echo "$cached_cmd"
            return 0
        fi
    fi
    return 1
}

# Initialise la détection Docker Compose avec cache
init_docker_compose_detection() {
    # Test 1: Vérifier Docker d'abord
    if ! test_docker_available; then
        DOCKER_DETECTED="false"
        return 1
    fi
    DOCKER_DETECTED="true"

    # Test 2: Essayer le cache d'abord
    if DOCKER_COMPOSE_CMD=$(get_cached_docker_compose_cmd 2>/dev/null); then
        return 0
    fi

    # Test 3: Détection complète si cache vide ou invalide
    echo -e "${BLUE}🔄 Détection complète Docker Compose...${NC}" >&2
    if DOCKER_COMPOSE_CMD=$(detect_docker_compose_cmd 2>/dev/null); then
        cache_docker_compose_cmd "$DOCKER_COMPOSE_CMD"
        return 0
    fi

    echo -e "${RED}❌ Impossible de détecter Docker Compose${NC}" >&2
    DOCKER_COMPOSE_CMD=""
    return 1
}

# ============================================================================
# WRAPPER ET FONCTIONS DE VÉRIFICATION
# ============================================================================

# Vérifie que Docker est disponible
check_docker_available() {
    if [ "$DOCKER_DETECTED" = "false" ]; then
        echo -e "${RED}❌ Docker n'est pas disponible${NC}" >&2
        return 1
    fi

    if ! test_docker_available 2>/dev/null; then
        echo -e "${RED}❌ Docker n'est pas accessible${NC}" >&2
        return 1
    fi

    return 0
}

# Vérifie que Docker Compose est disponible et fonctionnel
check_docker_compose_available() {
    if ! check_docker_available; then
        return 1
    fi

    if [ -z "$DOCKER_COMPOSE_CMD" ]; then
        echo -e "${RED}❌ Docker Compose non initialisé${NC}" >&2
        echo -e "${YELLOW}💡 Appelez init_docker_compose_detection() d'abord${NC}" >&2
        return 1
    fi

    # Test rapide que la commande mise en cache fonctionne encore
    if ! test_docker_compose_cmd "$DOCKER_COMPOSE_CMD" 2>/dev/null; then
        echo -e "${YELLOW}⚠️ Commande Docker Compose en cache non fonctionnelle${NC}" >&2
        echo -e "${BLUE}🔄 Redétection nécessaire...${NC}" >&2
        # Supprimer le cache invalide
        rm -f "$DOCKER_COMPOSE_CACHE_FILE" 2>/dev/null || true
        # Redétecter
        if ! init_docker_compose_detection 2>/dev/null; then
            return 1
        fi
    fi

    return 0
}

# Affiche les informations de détection
show_detection_info() {
    if [ "$DOCKER_DETECTED" = "true" ] && [ -n "$DOCKER_COMPOSE_CMD" ]; then
        echo -e "${GREEN}✅ Docker Compose détecté: $DOCKER_COMPOSE_CMD${NC}"
    fi
}

# Wrapper principal pour les commandes Docker Compose
docker_compose_wrapper() {
    if ! check_docker_compose_available 2>/dev/null; then
        echo -e "${RED}❌ Docker Compose n'est pas disponible${NC}" >&2
        echo -e "${YELLOW}💡 Vérifiez votre installation Docker/Docker Compose${NC}" >&2
        return 1
    fi

    # Exécuter la commande avec la commande détectée
    if echo "$DOCKER_COMPOSE_CMD" | grep -q "docker compose"; then
        docker compose "$@"
    elif echo "$DOCKER_COMPOSE_CMD" | grep -q "docker-compose"; then
        docker-compose "$@"
    else
        # Fallback si la commande n'est pas reconnue
        $DOCKER_COMPOSE_CMD "$@"
    fi
}

# Nettoie le cache de détection (utile pour forcer une redétection)
clean_docker_compose_cache() {
    rm -f "$DOCKER_COMPOSE_CACHE_FILE" 2>/dev/null || true
    echo -e "${BLUE}🧹 Cache Docker Compose nettoyé${NC}"
}

# ============================================================================
# FONCTIONS DE DIAGNOSTIC
# ============================================================================

# Diagnostic complet du système Docker
docker_diagnostic() {
    echo -e "${BLUE}🔍 Diagnostic Docker complet${NC}"
    echo "================================"

    # Test Docker
    if test_docker_available 2>/dev/null; then
        echo -e "${GREEN}✅ Docker: $(docker --version | head -1)${NC}"
        echo -e "${GREEN}✅ Docker daemon: En cours d'exécution${NC}"
    else
        echo -e "${RED}❌ Docker: Non disponible${NC}"
        return 1
    fi

    # Test Docker Compose
    if [ -n "$DOCKER_COMPOSE_CMD" ]; then
        echo -e "${GREEN}✅ Docker Compose: $DOCKER_COMPOSE_CMD${NC}"
        echo -e "${GREEN}✅ Cache: $([ -f "$DOCKER_COMPOSE_CACHE_FILE" ] && echo "Actif" || echo "Inactif")${NC}"
    else
        echo -e "${RED}❌ Docker Compose: Non détecté${NC}"
        return 1
    fi

    # Test des fichiers de composition
    echo -e "\n${BLUE}📁 Fichiers Docker Compose:${NC}"
    local compose_files=(
        "docker-compose.yml"
        "backend/docker-compose.yml"
        "frontend/docker-compose.frontend.yml"
    )

    for file in "${compose_files[@]}"; do
        if [ -f "$file" ]; then
            echo -e "${GREEN}✅ $file${NC}"
        else
            echo -e "${YELLOW}⚠️ $file (manquant)${NC}"
        fi
    done

    echo -e "\n${GREEN}🎉 Diagnostic terminé - Tout est opérationnel !${NC}"
    return 0
}

# ============================================================================
# EXPORT DES FONCTIONS
# ============================================================================

# Export des fonctions pour les scripts enfants
export -f test_docker_available
export -f test_docker_compose_cmd
export -f detect_docker_compose_cmd
export -f cache_docker_compose_cmd
export -f get_cached_docker_compose_cmd
export -f init_docker_compose_detection
export -f check_docker_available
export -f check_docker_compose_available
export -f show_detection_info
export -f docker_compose_wrapper
export -f clean_docker_compose_cache
export -f docker_diagnostic

# Export des variables
export DOCKER_COMPOSE_CMD
export DOCKER_DETECTED
export DOCKER_COMPOSE_CACHE_FILE
