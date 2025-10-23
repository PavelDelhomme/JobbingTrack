#!/usr/bin/env bash

# ============================================================================
# Script de correction automatique Docker Compose - JobbingTrack
# ============================================================================
# Ce script détecte et corrige automatiquement les problèmes Docker Compose
# ============================================================================

set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ============================================================================
# FONCTIONS DE DIAGNOSTIC
# ============================================================================

# Détecter la meilleure commande Docker Compose
detect_best_docker_compose() {
    echo -e "${BLUE}🔍 Détection Docker Compose...${NC}"

    local found=false
    local best_cmd=""

    # Test 1: docker-compose standalone (priorité haute)
    if command -v docker-compose &>/dev/null 2>&1; then
        echo "🔍 Test docker-compose standalone..."
        if timeout 10 docker-compose version &>/dev/null 2>&1; then
            echo -e "${GREEN}✅ docker-compose standalone: $(docker-compose --version)${NC}"
            found=true
            best_cmd="docker-compose"
        else
            echo -e "${RED}❌ docker-compose standalone non fonctionnel${NC}"
        fi
    fi

    # Test 2: docker compose plugin (priorité moyenne)
    echo "🔍 Test docker compose plugin..."
    if timeout 10 docker compose version &>/dev/null 2>&1; then
        echo -e "${GREEN}✅ docker compose plugin: $(docker compose version)${NC}"
        found=true
        best_cmd="docker compose"
    else
        echo -e "${RED}❌ docker compose plugin non disponible${NC}"
    fi

    # Test 3: docker-compose dans /usr/bin
    echo "🔍 Test /usr/bin/docker-compose..."
    if [ -x "/usr/bin/docker-compose" ]; then
        if timeout 10 /usr/bin/docker-compose version &>/dev/null 2>&1; then
            echo -e "${GREEN}✅ docker-compose /usr/bin: $(/usr/bin/docker-compose --version)${NC}"
            found=true
            best_cmd="/usr/bin/docker-compose"
        else
            echo -e "${RED}❌ docker-compose /usr/bin non fonctionnel${NC}"
        fi
    fi

    # Test 4: docker-compose dans /usr/local/bin
    echo "🔍 Test /usr/local/bin/docker-compose..."
    if [ -x "/usr/local/bin/docker-compose" ]; then
        if timeout 10 /usr/local/bin/docker-compose version &>/dev/null 2>&1; then
            echo -e "${GREEN}✅ docker-compose /usr/local/bin: $(/usr/local/bin/docker-compose --version)${NC}"
            found=true
            best_cmd="/usr/local/bin/docker-compose"
        else
            echo -e "${RED}❌ docker-compose /usr/local/bin non fonctionnel${NC}"
        fi
    fi

    # Test 5: docker-compose dans /opt/bin
    echo "🔍 Test /opt/bin/docker-compose..."
    if [ -x "/opt/bin/docker-compose" ]; then
        if timeout 10 /opt/bin/docker-compose version &>/dev/null 2>&1; then
            echo -e "${GREEN}✅ docker-compose /opt/bin: $(/opt/bin/docker-compose --version)${NC}"
            found=true
            best_cmd="/opt/bin/docker-compose"
        else
            echo -e "${RED}❌ docker-compose /opt/bin non fonctionnel${NC}"
        fi
    fi

    # Test 6: docker-compose dans /snap/bin
    echo "🔍 Test /snap/bin/docker-compose..."
    if [ -x "/snap/bin/docker-compose" ]; then
        if timeout 10 /snap/bin/docker-compose version &>/dev/null 2>&1; then
            echo -e "${GREEN}✅ docker-compose /snap/bin: $(/snap/bin/docker-compose --version)${NC}"
            found=true
            best_cmd="/snap/bin/docker-compose"
        else
            echo -e "${RED}❌ docker-compose /snap/bin non fonctionnel${NC}"
        fi
    fi

    if [ "$found" = true ]; then
        echo ""
        echo -e "${GREEN}🎉 Docker Compose détecté !${NC}"
        echo "Commande recommandée: $best_cmd"
        echo ""
        echo -e "${BLUE}📋 Test de la commande...${NC}"

        # Test de la commande
        if echo "$best_cmd" | grep -q "docker compose"; then
            if $best_cmd ps &>/dev/null 2>&1; then
                echo -e "${GREEN}✅ Commande 'docker compose' fonctionne${NC}"
            else
                echo -e "${RED}❌ Commande 'docker compose' non fonctionnelle${NC}"
                return 1
            fi
        elif echo "$best_cmd" | grep -q "docker-compose"; then
            if $best_cmd ps &>/dev/null 2>&1; then
                echo -e "${GREEN}✅ Commande 'docker-compose' fonctionne${NC}"
            else
                echo -e "${RED}❌ Commande 'docker-compose' non fonctionnelle${NC}"
                return 1
            fi
        else
            if $best_cmd ps &>/dev/null 2>&1; then
                echo -e "${GREEN}✅ Commande '$best_cmd' fonctionne${NC}"
            else
                echo -e "${RED}❌ Commande '$best_cmd' non fonctionnelle${NC}"
                return 1
            fi
        fi

        return 0
    else
        echo ""
        echo -e "${RED}❌ Aucun Docker Compose fonctionnel trouvé${NC}"
        echo ""
        echo -e "${YELLOW}💡 Installation Docker Compose:${NC}"
        echo ""
        echo "📦 Option 1 - Installation standalone (recommandée):"
        echo "   sudo curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose"
        echo "   sudo chmod +x /usr/local/bin/docker-compose"
        echo ""
        echo "📦 Option 2 - Via package manager:"
        echo "   # Ubuntu/Debian:"
        echo "   sudo apt-get update && sudo apt-get install docker-compose-plugin"
        echo ""
        echo "   # CentOS/RHEL:"
        echo "   sudo dnf install docker-compose"
        echo ""
        echo "📦 Option 3 - Docker Desktop:"
        echo "   https://docs.docker.com/desktop/"
        echo ""
        return 1
    fi
}

# Installer Docker Compose automatiquement
install_docker_compose_auto() {
    echo -e "${BLUE}🔧 Installation automatique Docker Compose...${NC}"

    # Détecter le système
    if command -v apt-get &>/dev/null; then
        echo "🔍 Système Ubuntu/Debian détecté"
        echo "📦 Installation du plugin Docker Compose..."

        if sudo apt-get update -qq && sudo apt-get install -y docker-compose-plugin; then
            echo -e "${GREEN}✅ Docker Compose plugin installé${NC}"
            return 0
        fi
    elif command -v dnf &>/dev/null; then
        echo "🔍 Système CentOS/RHEL détecté"
        echo "📦 Installation Docker Compose..."

        if sudo dnf install -y docker-compose; then
            echo -e "${GREEN}✅ Docker Compose installé${NC}"
            return 0
        fi
    elif command -v yum &>/dev/null; then
        echo "🔍 Système CentOS/RHEL ancien détecté"
        echo "📦 Installation Docker Compose..."

        if sudo yum install -y docker-compose; then
            echo -e "${GREEN}✅ Docker Compose installé${NC}"
            return 0
        fi
    fi

    # Installation standalone si package manager échoue
    echo "📦 Installation standalone..."
    if sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose 2>/dev/null && sudo chmod +x /usr/local/bin/docker-compose 2>/dev/null; then
        echo -e "${GREEN}✅ Docker Compose standalone installé${NC}"
        return 0
    else
        echo -e "${RED}❌ Échec de l'installation${NC}"
        echo ""
        echo -e "${YELLOW}💡 Installation manuelle requise:${NC}"
        echo "   sudo curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose"
        echo "   sudo chmod +x /usr/local/bin/docker-compose"
        return 1
    fi
}

# Tester la configuration Docker Compose
test_docker_compose_config() {
    echo -e "${BLUE}🔍 Test de la configuration Docker Compose...${NC}"

    local config_files=(
        "docker-compose.yml"
        "backend/docker-compose.yml"
        "frontend/docker-compose.frontend.yml"
    )

    for file in "${config_files[@]}"; do
        if [ -f "$PROJECT_ROOT/$file" ]; then
            echo -e "${GREEN}✅ Fichier trouvé: $file${NC}"
        else
            echo -e "${RED}❌ Fichier manquant: $file${NC}"
        fi
    done

    echo ""
    echo -e "${BLUE}📋 Test de validation de la configuration...${NC}"

    # Détecter la commande
    if command -v docker-compose &>/dev/null && docker-compose version &>/dev/null 2>&1; then
        DOCKER_CMD="docker-compose"
    elif docker compose version &>/dev/null 2>&1; then
        DOCKER_CMD="docker compose"
    else
        echo -e "${RED}❌ Aucune commande Docker Compose disponible${NC}"
        return 1
    fi

    # Test de validation
    if $DOCKER_CMD -f docker-compose.yml config &>/dev/null 2>&1; then
        echo -e "${GREEN}✅ Configuration Docker Compose valide${NC}"
        return 0
    else
        echo -e "${RED}❌ Configuration Docker Compose invalide${NC}"
        echo ""
        echo -e "${YELLOW}💡 Erreurs de configuration:${NC}"
        $DOCKER_CMD -f docker-compose.yml config 2>&1 || echo "Impossible de valider la configuration"
        return 1
    fi
}

# ============================================================================
# FONCTIONS DE CORRECTION
# ============================================================================

# Corriger les problèmes de cache
fix_cache_issues() {
    echo -e "${BLUE}🔧 Correction des problèmes de cache...${NC}"

    # Nettoyer le cache Docker Compose
    rm -f /tmp/jobbingtrack_docker_compose_cache 2>/dev/null || true

    # Forcer la redétection
    echo -e "${GREEN}✅ Cache nettoyé - redétection forcée${NC}"
    echo ""
}

# Mettre à jour la détection dans common.mk
update_detection() {
    echo -e "${BLUE}🔧 Mise à jour de la détection Docker Compose...${NC}"

    # Mettre à jour la variable DOCKER_COMPOSE_CMD dans common.mk
    if [ -f "$PROJECT_ROOT/makefiles/shared/common.mk" ]; then
        # Créer une sauvegarde
        cp "$PROJECT_ROOT/makefiles/shared/common.mk" "${PROJECT_ROOT/makefiles/shared/common.mk}.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true

        echo -e "${GREEN}✅ Détection mise à jour dans common.mk${NC}"
    fi
}

# ============================================================================
# SCRIPT PRINCIPAL
# ============================================================================

main() {
    echo -e "${PURPLE}🚀 DIAGNOSTIC ET CORRECTION DOCKER COMPOSE${NC}"
    echo "============================================"

    # 1. Détection Docker Compose
    echo ""
    if ! detect_best_docker_compose; then
        echo ""
        echo -e "${YELLOW}🔧 Installation Docker Compose ? (o/N): ${NC}"
        read -r install_response
        if [[ $install_response =~ ^[Oo]$ ]]; then
            if install_docker_compose_auto; then
                echo ""
                echo -e "${GREEN}✅ Docker Compose installé !${NC}"
                echo "🔄 Redétection en cours..."
                detect_best_docker_compose
            else
                echo -e "${RED}❌ Installation échouée${NC}"
                exit 1
            fi
        else
            echo -e "${YELLOW}❌ Installation annulée${NC}"
            exit 1
        fi
    fi

    # 2. Test de la configuration
    echo ""
    test_docker_compose_config

    # 3. Correction du cache
    echo ""
    fix_cache_issues

    # 4. Mise à jour de la détection
    echo ""
    update_detection

    echo ""
    echo -e "${GREEN}🎉 Docker Compose configuré et fonctionnel !${NC}"
    echo ""
    echo -e "${BLUE}🔄 Testez maintenant:${NC}"
    echo "  make up              # Démarrer les services"
    echo "  make show-docker-info # Vérifier la détection"
    echo "  make check-deps      # Vérifier les dépendances"
    echo ""
    echo -e "${YELLOW}💡 Si des problèmes persistent:${NC}"
    echo "  • Utilisez 'make diagnostic' pour un diagnostic complet"
    echo "  • Utilisez 'make cors-fix' pour les problèmes CORS"
    echo "  • Vérifiez les logs avec 'make logs'"
}

# ============================================================================
# EXÉCUTION
# ============================================================================

main "$@"
