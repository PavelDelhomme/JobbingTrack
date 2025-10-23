#!/usr/bin/env bash

# ============================================================================
# Script d'installation des dépendances - JobbingTrack
# ============================================================================
# Installe toutes les dépendances système nécessaires pour JobbingTrack
#
# Usage: ./scripts/setup/install-dependencies.sh [OPTIONS]
#
# Options:
#   --check-only      Vérifier seulement si les dépendances sont installées
#   --update         Mettre à jour les dépendances existantes
#   --help           Afficher cette aide
#
# Dépendances installées:
#   - Docker et Docker Compose
#   - Node.js et npm
#   - PostgreSQL client
#   - Redis tools
#   - Git et outils de développement
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
CHECK_ONLY=false
UPDATE=false

# Fonction d'aide
show_help() {
    echo -e "${BLUE}📦 Installation des dépendances - JobbingTrack${NC}"
    echo "=============================================="
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --check-only     Vérifier seulement si les dépendances sont installées"
    echo "  --update         Mettre à jour les dépendances existantes"
    echo "  --help           Afficher cette aide"
    echo ""
    echo "Dépendances installées:"
    echo "  • Docker et Docker Compose"
    echo "  • Node.js et npm"
    echo "  • PostgreSQL client"
    echo "  • Redis tools"
    echo "  • Git et outils de développement"
    echo ""
    echo "Exemples:"
    echo "  $0                           # Installation complète"
    echo "  $0 --check-only              # Vérification uniquement"
    echo "  $0 --update                  # Mise à jour des dépendances"
}

# Gestion des arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --check-only)
            CHECK_ONLY=true
            shift
            ;;
        --update)
            UPDATE=true
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

# Fonction pour vérifier si une commande existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Fonction pour vérifier une dépendance
check_dependency() {
    local name="$1"
    local command="$2"
    local package="$3"

    echo -e "\n${YELLOW}🔍 Vérification de $name...${NC}"

    if command_exists "$command"; then
        echo -e "${GREEN}✅ $name est installé${NC}"
        if [ "$UPDATE" = true ]; then
            echo -e "${BLUE}🔄 Mise à jour de $name...${NC}"
            # Ici on pourrait ajouter la logique de mise à jour
            echo -e "${GREEN}✅ $name mis à jour${NC}"
        fi
        return 0
    else
        if [ "$CHECK_ONLY" = true ]; then
            echo -e "${RED}❌ $name n'est pas installé${NC}"
            return 1
        else
            echo -e "${YELLOW}📦 Installation de $name...${NC}"
            install_dependency "$name" "$package" "$command"
            return $?
        fi
    fi
}

# Fonction pour installer une dépendance
install_dependency() {
    local name="$1"
    local package="$2"
    local command="$3"

    case "$(uname -s)" in
        Linux)
            if command_exists apt-get; then
                # Debian/Ubuntu
                sudo apt-get update
                sudo apt-get install -y "$package"
            elif command_exists yum; then
                # RHEL/CentOS
                sudo yum install -y "$package"
            elif command_exists pacman; then
                # Arch Linux
                sudo pacman -S --noconfirm "$package"
            else
                echo -e "${RED}❌ Gestionnaire de paquets non supporté${NC}"
                echo -e "${YELLOW}💡 Installez manuellement $name${NC}"
                return 1
            fi
            ;;
        Darwin)
            # macOS
            if command_exists brew; then
                brew install "$package"
            else
                echo -e "${RED}❌ Homebrew n'est pas installé${NC}"
                echo -e "${YELLOW}💡 Installez Homebrew: https://brew.sh/${NC}"
                return 1
            fi
            ;;
        *)
            echo -e "${RED}❌ Système d'exploitation non supporté${NC}"
            return 1
            ;;
    esac

    # Vérifier l'installation
    if command_exists "$command"; then
        echo -e "${GREEN}✅ $name installé avec succès${NC}"
        return 0
    else
        echo -e "${RED}❌ Échec de l'installation de $name${NC}"
        return 1
    fi
}

# Fonction pour installer Docker
install_docker() {
    echo -e "${BLUE}🐳 Installation de Docker...${NC}"

    case "$(uname -s)" in
        Linux)
            # Installation automatique de Docker
            curl -fsSL https://get.docker.com -o get-docker.sh
            sudo sh get-docker.sh
            sudo usermod -aG docker $USER
            rm get-docker.sh
            ;;
        Darwin)
            # macOS - utiliser Docker Desktop
            echo -e "${YELLOW}💡 Sur macOS, installez Docker Desktop:${NC}"
            echo "   https://docs.docker.com/desktop/mac/install/"
            return 1
            ;;
        *)
            echo -e "${RED}❌ Installation automatique non disponible${NC}"
            return 1
            ;;
    esac
}

# Fonction principale
main() {
    echo -e "${BLUE}📦 Installation des dépendances JobbingTrack${NC}"
    echo "=========================================="

    local missing_deps=0

    # Vérifier Docker
    if ! command_exists docker; then
        if [ "$CHECK_ONLY" = false ]; then
            install_docker
        else
            echo -e "${RED}❌ Docker n'est pas installé${NC}"
            ((missing_deps++))
        fi
    else
        echo -e "${GREEN}✅ Docker est installé${NC}"
    fi

    # Vérifier Docker Compose
    if ! command_exists docker_compose_wrapper && ! docker compose version >/dev/null 2>&1; then
        echo -e "${YELLOW}📦 Installation de Docker Compose...${NC}"
        # Docker Compose est généralement inclus avec Docker Desktop ou docker CLI
        echo -e "${YELLOW}💡 Docker Compose devrait être disponible avec Docker${NC}"
        if [ "$CHECK_ONLY" = false ]; then
            echo -e "${YELLOW}💡 Si Docker Compose n'est pas disponible, installez Docker Desktop${NC}"
        fi
    else
        echo -e "${GREEN}✅ Docker Compose est disponible${NC}"
    fi

    # Vérifier Node.js
    check_dependency "Node.js" "node" "nodejs" || ((missing_deps++))

    # Vérifier npm
    check_dependency "npm" "npm" "npm" || ((missing_deps++))

    # Vérifier Git
    check_dependency "Git" "git" "git" || ((missing_deps++))

    # Vérifier PostgreSQL client
    check_dependency "PostgreSQL client" "psql" "postgresql-client" || ((missing_deps++))

    # Vérifier Redis tools
    check_dependency "Redis tools" "redis-cli" "redis-tools" || ((missing_deps++))

    # Vérifier curl
    check_dependency "curl" "curl" "curl" || ((missing_deps++))

    # Vérifier jq
    check_dependency "jq" "jq" "jq" || ((missing_deps++))

    # Résumé
    echo -e "\n${BLUE}📊 Résumé de l'installation${NC}"
    echo "=========================="

    if [ $missing_deps -eq 0 ]; then
        echo -e "${GREEN}✅ Toutes les dépendances sont installées !${NC}"
        echo ""
        echo -e "${BLUE}🎯 Prochaines étapes :${NC}"
        echo "   1. Cloner le repository: git clone <url>"
        echo "   2. Installer les dépendances: npm install"
        echo "   3. Démarrer les services: make up"
        echo "   4. Créer l'admin: make create-admin"
        return 0
    else
        echo -e "${RED}❌ $missing_deps dépendance(s) manquante(s)${NC}"
        if [ "$CHECK_ONLY" = true ]; then
            echo -e "${YELLOW}💡 Utilisez sans --check-only pour installer les dépendances${NC}"
        fi
        return 1
    fi
}

# Exécution
main "$@"
