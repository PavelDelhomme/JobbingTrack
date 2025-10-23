#!/usr/bin/env bash

# ============================================================================
# Script de diagnostic complet et interactif - JobbingTrack
# ============================================================================
# Ce script diagnostique et corrige automatiquement tous les problèmes
# système, Docker, Docker Compose, CORS, réseau, etc.
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

# Variables globales
DIAGNOSTIC_MODE="all"
AUTO_FIX=false

# ============================================================================
# FONCTIONS DE DIAGNOSTIC SYSTÈME
# ============================================================================

# Vérifier les informations système
check_system_info() {
    echo -e "${BLUE}🔍 DIAGNOSTIC SYSTÈME${NC}"
    echo "=================="

    echo -e "${CYAN}📋 Informations système:${NC}"
    echo "OS: $(uname -s) $(uname -r)"
    echo "Architecture: $(uname -m)"
    echo "Utilisateur: $(whoami)"
    echo "UID: $(id -u)"
    echo "GID: $(id -g)"

    if command -v lsb_release &>/dev/null; then
        echo "Distribution: $(lsb_release -d | cut -d: -f2 | tr -d '\t')"
    elif [ -f /etc/os-release ]; then
        echo "Distribution: $(grep PRETTY_NAME /etc/os-release | cut -d= -f2 | tr -d '"')"
    fi

    echo ""
}

# Vérifier les permissions utilisateur
check_user_permissions() {
    echo -e "${BLUE}🔍 VÉRIFICATION PERMISSIONS${NC}"
    echo "=========================="

    # Vérifier si on est root
    if [ "$(id -u)" -eq 0 ]; then
        echo -e "${RED}⚠️ Exécution en tant que root détectée${NC}"
        echo "💡 Il est recommandé d'exécuter en tant qu'utilisateur normal"
        echo "   avec les permissions Docker appropriées"
        echo ""
        return 0
    fi

    # Vérifier le groupe docker
    if groups | grep -q docker; then
        echo -e "${GREEN}✅ Utilisateur dans le groupe docker${NC}"
    else
        echo -e "${YELLOW}⚠️ Utilisateur PAS dans le groupe docker${NC}"
        echo "💡 Ajouter au groupe docker:"
        echo "   sudo usermod -aG docker \$USER"
        echo "   # Puis redémarrer la session ou:"
        echo "   newgrp docker"
        echo ""
    fi

    # Vérifier les permissions sudo
    if sudo -n true 2>/dev/null; then
        echo -e "${GREEN}✅ Sudo disponible sans mot de passe${NC}"
    else
        echo -e "${YELLOW}⚠️ Sudo nécessite un mot de passe${NC}"
        echo "💡 Certaines corrections nécessiteront un mot de passe"
        echo ""
    fi
}

# ============================================================================
# FONCTIONS DE DIAGNOSTIC DOCKER
# ============================================================================

# Vérifier Docker de manière exhaustive
check_docker_comprehensive() {
    echo -e "${BLUE}🔍 DIAGNOSTIC DOCKER COMPLET${NC}"
    echo "=============================="

    # Test 1: Commande docker existe
    if ! command -v docker &>/dev/null; then
        echo -e "${RED}❌ Docker n'est pas installé${NC}"
        echo ""
        echo -e "${YELLOW}💡 Installation Docker:${NC}"
        echo "   # Ubuntu/Debian:"
        echo "   curl -fsSL https://get.docker.com | sudo sh"
        echo ""
        echo "   # CentOS/RHEL:"
        echo "   sudo dnf install docker docker-compose"
        echo ""
        echo "   # Docker Desktop:"
        echo "   https://docs.docker.com/desktop/"
        echo ""
        return 1
    fi
    echo -e "${GREEN}✅ Docker command trouvé: $(docker --version)${NC}"

    # Test 2: Docker daemon répond
    if ! docker info &>/dev/null 2>&1; then
        echo -e "${RED}❌ Docker daemon n'est pas en cours d'exécution${NC}"
        echo ""
        echo -e "${YELLOW}💡 Démarrage Docker daemon:${NC}"
        echo "   sudo systemctl start docker    # Linux systemd"
        echo "   sudo service docker start      # Linux sysvinit"
        echo "   # Docker Desktop: Démarrer l'application"
        echo ""
        return 1
    fi
    echo -e "${GREEN}✅ Docker daemon fonctionne${NC}"

    # Test 3: Permissions utilisateur
    if ! docker ps &>/dev/null 2>&1; then
        echo -e "${RED}❌ Permissions Docker insuffisantes${NC}"
        echo ""
        echo -e "${YELLOW}💡 Solution permissions:${NC}"
        echo "   sudo usermod -aG docker \$USER"
        echo "   # Redémarrer la session ou:"
        echo "   newgrp docker"
        echo ""
        echo -e "${YELLOW}💡 Solution alternative (temporaire):${NC}"
        echo "   sudo make up"
        echo ""
        return 1
    fi
    echo -e "${GREEN}✅ Permissions Docker OK${NC}"

    # Test 4: Docker fonctionne correctement
    if docker run --rm hello-world &>/dev/null 2>&1; then
        echo -e "${GREEN}✅ Docker fonctionne correctement${NC}"
        return 0
    else
        echo -e "${RED}❌ Docker ne fonctionne pas correctement${NC}"
        echo "💡 Vérifiez l'installation Docker"
        return 1
    fi
}

# Vérifier Docker Compose de manière exhaustive
check_docker_compose_comprehensive() {
    echo -e "${BLUE}🔍 DIAGNOSTIC DOCKER COMPOSE COMPLET${NC}"
    echo "======================================"

    local found=false
    local working_cmd=""

    echo -e "${CYAN}📋 Test des installations Docker Compose:${NC}"

    # Test 1: docker-compose standalone
    if command -v docker-compose &>/dev/null 2>&1; then
        echo "🔍 Test docker-compose standalone..."
        if docker-compose version &>/dev/null 2>&1; then
            echo -e "${GREEN}✅ docker-compose standalone: $(docker-compose --version)${NC}"
            found=true
            working_cmd="docker-compose"
        else
            echo -e "${RED}❌ docker-compose standalone non fonctionnel${NC}"
        fi
    fi

    # Test 2: docker compose plugin
    echo "🔍 Test docker compose plugin..."
    if docker compose version &>/dev/null 2>&1; then
        echo -e "${GREEN}✅ docker compose plugin: $(docker compose version)${NC}"
        found=true
        working_cmd="docker compose"
    else
        echo -e "${RED}❌ docker compose plugin non disponible${NC}"
    fi

    # Test 3: docker-compose dans /usr/bin
    echo "🔍 Test /usr/bin/docker-compose..."
    if [ -x "/usr/bin/docker-compose" ]; then
        if /usr/bin/docker-compose version &>/dev/null 2>&1; then
            echo -e "${GREEN}✅ docker-compose /usr/bin: $(/usr/bin/docker-compose --version)${NC}"
            found=true
            working_cmd="/usr/bin/docker-compose"
        else
            echo -e "${RED}❌ docker-compose /usr/bin non fonctionnel${NC}"
        fi
    fi

    # Test 4: docker-compose dans /usr/local/bin
    echo "🔍 Test /usr/local/bin/docker-compose..."
    if [ -x "/usr/local/bin/docker-compose" ]; then
        if /usr/local/bin/docker-compose version &>/dev/null 2>&1; then
            echo -e "${GREEN}✅ docker-compose /usr/local/bin: $(/usr/local/bin/docker-compose --version)${NC}"
            found=true
            working_cmd="/usr/local/bin/docker-compose"
        else
            echo -e "${RED}❌ docker-compose /usr/local/bin non fonctionnel${NC}"
        fi
    fi

    # Test 5: docker-compose dans /opt/bin
    echo "🔍 Test /opt/bin/docker-compose..."
    if [ -x "/opt/bin/docker-compose" ]; then
        if /opt/bin/docker-compose version &>/dev/null 2>&1; then
            echo -e "${GREEN}✅ docker-compose /opt/bin: $(/opt/bin/docker-compose --version)${NC}"
            found=true
            working_cmd="/opt/bin/docker-compose"
        else
            echo -e "${RED}❌ docker-compose /opt/bin non fonctionnel${NC}"
        fi
    fi

    # Test 6: docker-compose dans /snap/bin
    echo "🔍 Test /snap/bin/docker-compose..."
    if [ -x "/snap/bin/docker-compose" ]; then
        if /snap/bin/docker-compose version &>/dev/null 2>&1; then
            echo -e "${GREEN}✅ docker-compose /snap/bin: $(/snap/bin/docker-compose --version)${NC}"
            found=true
            working_cmd="/snap/bin/docker-compose"
        else
            echo -e "${RED}❌ docker-compose /snap/bin non fonctionnel${NC}"
        fi
    fi

    if [ "$found" = true ]; then
        echo ""
        echo -e "${GREEN}🎉 Docker Compose détecté et fonctionnel !${NC}"
        echo "Commande recommandée: $working_cmd"
        return 0
    else
        echo ""
        echo -e "${RED}❌ Aucun Docker Compose fonctionnel trouvé${NC}"
        echo ""
        echo -e "${YELLOW}💡 Installation Docker Compose:${NC}"
        echo ""
        echo "📦 Option 1 - Installation standalone:"
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
        echo "📦 Option 3 - Docker Desktop (recommandé):"
        echo "   https://docs.docker.com/desktop/"
        echo ""
        return 1
    fi
}

# ============================================================================
# FONCTIONS DE DIAGNOSTIC RÉSEAU
# ============================================================================

# Vérifier les ports utilisés
check_ports() {
    echo -e "${BLUE}🔍 DIAGNOSTIC PORTS ET RÉSEAU${NC}"
    echo "=============================="

    local ports=(3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3011 3012 3013 3014 3015 5432 6379 8080 9090)

    echo -e "${CYAN}📋 Vérification des ports critiques:${NC}"

    for port in "${ports[@]}"; do
        if command -v ss &>/dev/null; then
            if ss -tuln | grep -q ":$port "; then
                echo -e "${RED}❌ Port $port: OCCUPÉ${NC}"
                ss -tuln | grep ":$port " | head -1
            else
                echo -e "${GREEN}✅ Port $port: Libre${NC}"
            fi
        elif command -v netstat &>/dev/null; then
            if netstat -tuln 2>/dev/null | grep -q ":$port "; then
                echo -e "${RED}❌ Port $port: OCCUPÉ${NC}"
                netstat -tuln 2>/dev/null | grep ":$port " | head -1
            else
                echo -e "${GREEN}✅ Port $port: Libre${NC}"
            fi
        else
            echo -e "${YELLOW}⚠️ Impossible de vérifier le port $port (ss/netstat non disponibles)${NC}"
        fi
    done

    echo ""
    echo -e "${CYAN}📋 Services Docker en cours:${NC}"
    if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
        docker ps --filter "name=jobbingtrack" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "Aucun service JobbingTrack"
    else
        echo "Docker non disponible"
    fi
}

# ============================================================================
# FONCTIONS DE DIAGNOSTIC CORS
# ============================================================================

# Diagnostiquer les problèmes CORS
check_cors_issues() {
    echo -e "${BLUE}🔍 DIAGNOSTIC CORS${NC}"
    echo "================="

    local api_url="http://localhost:3000/api/v1/auth/login"

    echo -e "${CYAN}📋 Test des requêtes CORS:${NC}"

    # Test avec différentes origines
    local origins=(
        "http://localhost:8080"
        "http://localhost:3000"
        "http://127.0.0.1:8080"
    )

    local cors_ok=false

    for origin in "${origins[@]}"; do
        echo -e "${BLUE}🔍 Test origine: $origin${NC}"

        response=$(curl -s -I -H "Origin: $origin" -H "Access-Control-Request-Method: POST" -X OPTIONS "$api_url" 2>/dev/null || echo "")

        if echo "$response" | grep -q "Access-Control-Allow-Origin"; then
            echo -e "${GREEN}✅ CORS OK pour $origin${NC}"
            echo "Headers: $(echo "$response" | grep "Access-Control" | tr '\n' ' ')"
            cors_ok=true
        else
            echo -e "${RED}❌ CORS BLOQUÉ pour $origin${NC}"
        fi
        echo ""
    done

    if [ "$cors_ok" = true ]; then
        echo -e "${GREEN}🎉 CORS fonctionne correctement !${NC}"
        return 0
    else
        echo -e "${RED}❌ CORS nécessite une correction${NC}"
        echo ""
        echo -e "${YELLOW}💡 Solution:${NC}"
        echo "   make cors-fix       # Diagnostic et correction interactive"
        echo "   make cors-fix-auto  # Correction automatique"
        echo ""
        return 1
    fi
}

# ============================================================================
# FONCTIONS DE CORRECTION AUTOMATIQUE
# ============================================================================

# Corriger les permissions Docker
fix_docker_permissions() {
    echo -e "${BLUE}🔧 Correction des permissions Docker...${NC}"

    if [ "$(id -u)" -eq 0 ]; then
        echo -e "${YELLOW}⚠️ Exécution en root - permissions déjà OK${NC}"
        return 0
    fi

    if ! groups | grep -q docker; then
        echo "📋 Ajout au groupe docker..."
        if sudo usermod -aG docker "$USER" 2>/dev/null; then
            echo -e "${GREEN}✅ Utilisateur ajouté au groupe docker${NC}"
            echo -e "${YELLOW}💡 Redémarrez la session ou utilisez:${NC}"
            echo "   newgrp docker"
            return 0
        else
            echo -e "${RED}❌ Échec de l'ajout au groupe docker${NC}"
            return 1
        fi
    else
        echo -e "${GREEN}✅ Utilisateur déjà dans le groupe docker${NC}"
    fi
}

# Installer Docker Compose
install_docker_compose() {
    echo -e "${BLUE}🔧 Installation Docker Compose...${NC}"

    echo "📦 Installation en cours..."

    # Détecter le système
    if command -v apt-get &>/dev/null; then
        # Ubuntu/Debian
        echo "🔍 Système Ubuntu/Debian détecté"
        if sudo apt-get update && sudo apt-get install -y docker-compose-plugin; then
            echo -e "${GREEN}✅ Docker Compose plugin installé${NC}"
            return 0
        fi
    elif command -v dnf &>/dev/null; then
        # CentOS/RHEL
        echo "🔍 Système CentOS/RHEL détecté"
        if sudo dnf install -y docker-compose; then
            echo -e "${GREEN}✅ Docker Compose installé${NC}"
            return 0
        fi
    elif command -v yum &>/dev/null; then
        # CentOS/RHEL ancien
        echo "🔍 Système CentOS/RHEL ancien détecté"
        if sudo yum install -y docker-compose; then
            echo -e "${GREEN}✅ Docker Compose installé${NC}"
            return 0
        fi
    fi

    # Installation standalone si package manager échoue
    echo "📦 Tentative d'installation standalone..."
    if sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose 2>/dev/null; then
        sudo chmod +x /usr/local/bin/docker-compose
        echo -e "${GREEN}✅ Docker Compose standalone installé${NC}"
        return 0
    else
        echo -e "${RED}❌ Échec de l'installation automatique${NC}"
        echo "💡 Installez manuellement Docker Compose"
        return 1
    fi
}

# ============================================================================
# FONCTIONS INTERACTIVES
# ============================================================================

# Menu principal de diagnostic
show_diagnostic_menu() {
    echo -e "${PURPLE}🚀 DIAGNOSTIC COMPLET - JobbingTrack${NC}"
    echo "===================================="
    echo ""
    echo -e "${CYAN}📋 Que voulez-vous diagnostiquer ?${NC}"
    echo ""
    echo "1) 🔍 Tout diagnostiquer (complet)"
    echo "2) 🐳 Docker uniquement"
    echo "3) 🐳 Docker Compose uniquement"
    echo "4) 🌐 CORS uniquement"
    echo "5) 🔌 Réseau et ports uniquement"
    echo "6) 🔧 Corriger automatiquement les problèmes"
    echo "7) ❌ Quitter"
    echo ""
    read -p "Votre choix (1-7): " choice

    case $choice in
        1) DIAGNOSTIC_MODE="all" ;;
        2) DIAGNOSTIC_MODE="docker" ;;
        3) DIAGNOSTIC_MODE="docker-compose" ;;
        4) DIAGNOSTIC_MODE="cors" ;;
        5) DIAGNOSTIC_MODE="network" ;;
        6) DIAGNOSTIC_MODE="auto-fix" ;;
        7) echo -e "${YELLOW}❌ Diagnostic annulé${NC}"; exit 0 ;;
        *) echo -e "${RED}❌ Choix invalide${NC}"; show_diagnostic_menu ;;
    esac
}

# ============================================================================
# SCRIPT PRINCIPAL
# ============================================================================

main() {
    echo -e "${PURPLE}🚀 DIAGNOSTIC ET RÉPARATION AUTOMATIQUE${NC}"
    echo "========================================"
    echo ""
    echo "Ce script va diagnostiquer et corriger automatiquement"
    echo "tous les problèmes système, Docker, Docker Compose, CORS, etc."
    echo ""

    # Vérifier les arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --auto-fix)
                AUTO_FIX=true
                echo -e "${YELLOW}🔧 Mode correction automatique activé${NC}"
                shift
                ;;
            --docker)
                DIAGNOSTIC_MODE="docker"
                shift
                ;;
            --docker-compose)
                DIAGNOSTIC_MODE="docker-compose"
                shift
                ;;
            --cors)
                DIAGNOSTIC_MODE="cors"
                shift
                ;;
            --network)
                DIAGNOSTIC_MODE="network"
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --auto-fix        Corriger automatiquement les problèmes"
                echo "  --docker          Diagnostiquer Docker uniquement"
                echo "  --docker-compose  Diagnostiquer Docker Compose uniquement"
                echo "  --cors            Diagnostiquer CORS uniquement"
                echo "  --network         Diagnostiquer réseau uniquement"
                echo "  --help            Afficher cette aide"
                exit 0
                ;;
            *)
                echo -e "${RED}❌ Option inconnue: $1${NC}"
                exit 1
                ;;
        esac
    done

    echo ""

    case $DIAGNOSTIC_MODE in
        "all")
            echo -e "${CYAN}📋 DIAGNOSTIC COMPLET EN COURS...${NC}"
            echo ""

            # 1. Informations système
            check_system_info

            # 2. Permissions
            check_user_permissions

            # 3. Docker complet
            if ! check_docker_comprehensive; then
                if [ "$AUTO_FIX" = true ]; then
                    echo ""
                    echo -e "${YELLOW}🔧 Tentative de correction Docker...${NC}"
                    fix_docker_permissions
                fi
            fi

            # 4. Docker Compose
            if ! check_docker_compose_comprehensive; then
                if [ "$AUTO_FIX" = true ]; then
                    echo ""
                    echo -e "${YELLOW}🔧 Tentative d'installation Docker Compose...${NC}"
                    install_docker_compose
                fi
            fi

            # 5. Réseau et ports
            check_ports

            # 6. CORS (seulement si services démarrés)
            if docker ps --filter "name=jobbingtrack-api-gateway" | grep -q "Up"; then
                check_cors_issues
            else
                echo -e "${YELLOW}⚠️ Services non démarrés - test CORS ignoré${NC}"
                echo "💡 Démarrez les services avec 'make up' pour tester CORS"
            fi
            ;;

        "docker")
            check_docker_comprehensive
            ;;

        "docker-compose")
            check_docker_compose_comprehensive
            ;;

        "cors")
            check_cors_issues
            ;;

        "network")
            check_ports
            ;;

        "auto-fix")
            echo -e "${CYAN}🔧 CORRECTION AUTOMATIQUE EN COURS...${NC}"
            echo ""

            # Docker
            if ! check_docker_comprehensive; then
                echo ""
                echo -e "${YELLOW}🔧 Correction Docker...${NC}"
                fix_docker_permissions
            fi

            # Docker Compose
            if ! check_docker_compose_comprehensive; then
                echo ""
                echo -e "${YELLOW}🔧 Installation Docker Compose...${NC}"
                install_docker_compose
            fi

            # CORS (seulement si services démarrés)
            if docker ps --filter "name=jobbingtrack-api-gateway" | grep -q "Up"; then
                if ! check_cors_issues; then
                    echo ""
                    echo -e "${YELLOW}🔧 Correction CORS...${NC}"
                    if [ -f "scripts/utils/cors-fix-direct.sh" ]; then
                        ./scripts/utils/cors-fix-direct.sh
                    else
                        echo -e "${RED}❌ Script CORS non trouvé${NC}"
                    fi
                fi
            else
                echo -e "${YELLOW}⚠️ Services non démarrés - correction CORS ignorée${NC}"
            fi

            echo ""
            echo -e "${GREEN}🎉 Corrections terminées !${NC}"
            echo ""
            echo -e "${BLUE}🔄 Testez maintenant:${NC}"
            echo "  make up"
            echo ""
            ;;
    esac

    echo ""
    echo -e "${GREEN}🎉 Diagnostic terminé !${NC}"
    echo ""
    echo -e "${BLUE}💡 Commandes disponibles:${NC}"
    echo "  make up              # Démarrer les services"
    echo "  make down            # Arrêter les services"
    echo "  make cors-fix        # Diagnostiquer/corriger CORS"
    echo "  make cors-fix-auto   # Correction automatique CORS"
    echo "  make check-deps      # Vérifier les dépendances"
    echo "  make show-docker-info # Informations Docker/Docker Compose"
    echo ""
    echo -e "${YELLOW}🔧 Si des problèmes persistent:${NC}"
    echo "  • Utilisez 'make cors-fix' pour le diagnostic interactif"
    echo "  • Utilisez 'make cors-fix-auto' pour la correction automatique"
    echo "  • Vérifiez les logs avec 'make logs'"
    echo "  • Utilisez 'sudo make up' si problèmes de permissions"
}

# ============================================================================
# EXÉCUTION
# ============================================================================

main "$@"
