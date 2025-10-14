#!/bin/bash

# Script de diagnostic et de résolution automatique des problèmes JobbingTrack
# Usage: ./scripts/diagnostic-fix.sh [action]

set -e

ACTION="${1:-full}"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Script de Diagnostic et Résolution JobbingTrack${NC}"
echo "==============================================="

# Fonction de vérification
check_service() {
    local service=$1
    local port=$2
    if curl -s --max-time 5 "http://localhost:$port/health" > /dev/null 2>&1; then
        echo -e "   ✅ $service (port $port)"
        return 0
    else
        echo -e "   ❌ $service (port $port)"
        return 1
    fi
}

# Fonction de vérification Docker
check_docker() {
    if command -v docker &> /dev/null; then
        echo -e "   ✅ Docker disponible"
        return 0
    else
        echo -e "   ❌ Docker non installé"
        return 1
    fi
}

# Fonction de vérification Docker Compose
check_docker_compose() {
    if command -v docker-compose &> /dev/null; then
        echo -e "   ✅ Docker Compose disponible"
        return 0
    else
        echo -e "   ❌ Docker Compose non installé"
        return 1
    fi
}

# Fonction de nettoyage
cleanup() {
    echo -e "${YELLOW}🧹 Nettoyage des conteneurs problématiques...${NC}"

    # Supprimer tous les conteneurs jobbingtrack
    docker rm -f $(docker ps -aq --filter name=jobbingtrack) 2>/dev/null || true

    # Supprimer les volumes orphelins
    docker volume prune -f

    # Supprimer les réseaux orphelins
    docker network prune -f

    echo -e "${GREEN}✅ Nettoyage terminé${NC}"
}

# Fonction de reconstruction
rebuild_services() {
    echo -e "${YELLOW}🔨 Reconstruction des services...${NC}"

    # Reconstruire toutes les images
    docker-compose build --parallel

    echo -e "${GREEN}✅ Reconstruction terminée${NC}"
}

# Fonction de démarrage
start_services() {
    echo -e "${YELLOW}🚀 Démarrage des services...${NC}"

    # Démarrer les services de base d'abord
    docker-compose up -d postgres redis

    # Attendre que PostgreSQL soit prêt
    echo "⏳ Attente de PostgreSQL..."
    sleep 10

    # Créer l'utilisateur admin
    echo -e "${BLUE}👤 Création de l'utilisateur administrateur...${NC}"
    ./scripts/create-admin-user.sh

    # Démarrer les autres services
    docker-compose up -d

    echo -e "${GREEN}✅ Services démarrés${NC}"
}

# Fonction de vérification complète
full_check() {
    echo -e "${BLUE}🔍 Diagnostic complet...${NC}"

    local issues=0

    # Vérifier Docker
    echo "📦 Vérification Docker:"
    check_docker || ((issues++))
    check_docker_compose || ((issues++))

    # Vérifier les services
    echo ""
    echo "🌐 Vérification des services:"
    check_service "API Gateway" "3000" || ((issues++))
    check_service "Auth Service" "3001" || ((issues++))
    check_service "Application Service" "3002" || ((issues++))
    check_service "Company Service" "3003" || ((issues++))
    check_service "Contact Service" "3004" || ((issues++))
    check_service "Interview Service" "3005" || ((issues++))
    check_service "Notification Service" "3006" || ((issues++))
    check_service "Dashboard Service" "3007" || ((issues++))

    # Vérifier le frontend
    echo ""
    echo "🖥️ Vérification du frontend:"
    if curl -s --max-time 5 "http://localhost:8080" > /dev/null 2>&1; then
        echo -e "   ✅ Frontend (port 8080)"
    else
        echo -e "   ❌ Frontend (port 8080)"
        ((issues++))
    fi

    # Vérifier la base de données
    echo ""
    echo "🗄️ Vérification de la base de données:"
    if docker-compose exec postgres psql -U jobbingtrack -d jobbingtrack -c "SELECT 1" > /dev/null 2>&1; then
        echo -e "   ✅ PostgreSQL accessible"

        # Vérifier l'utilisateur admin
        if docker-compose exec postgres psql -U jobbingtrack -d jobbingtrack -c "SELECT id FROM \"User\" WHERE email = 'admin@jobbingtrack.com'" | grep -q "admin_"; then
            echo -e "   ✅ Utilisateur admin existe"
        else
            echo -e "   ❌ Utilisateur admin manquant"
            ((issues++))
        fi
    else
        echo -e "   ❌ PostgreSQL non accessible"
        ((issues++))
    fi

    return $issues
}

# Fonction de correction automatique
auto_fix() {
    echo -e "${YELLOW}🔧 Correction automatique des problèmes...${NC}"

    # Nettoyer d'abord
    cleanup

    # Reconstruire si nécessaire
    rebuild_services

    # Redémarrer
    start_services

    echo -e "${GREEN}✅ Correction automatique terminée${NC}"
}

# Menu principal
case "$ACTION" in
    "check")
        echo "🔍 Mode diagnostic uniquement"
        full_check
        ;;
    "fix")
        echo "🔧 Mode correction automatique"
        auto_fix
        ;;
    "full")
        echo "🔍 Diagnostic complet + correction"
        if full_check > /dev/null; then
            echo -e "${YELLOW}⚠️ Des problèmes ont été détectés, correction automatique...${NC}"
            auto_fix
        else
            echo -e "${GREEN}✅ Aucun problème détecté${NC}"
        fi
        ;;
    "cleanup")
        echo "🧹 Mode nettoyage uniquement"
        cleanup
        ;;
    "rebuild")
        echo "🔨 Mode reconstruction uniquement"
        rebuild_services
        ;;
    "start")
        echo "🚀 Mode démarrage uniquement"
        start_services
        ;;
    "help"|*)
        echo "📖 Aide - Script de diagnostic et résolution JobbingTrack"
        echo ""
        echo "Usage: $0 [action]"
        echo ""
        echo "Actions disponibles:"
        echo "  check     - Diagnostic uniquement (vérifie l'état)"
        echo "  fix       - Correction automatique (nettoie et redémarre)"
        echo "  full      - Diagnostic + correction automatique (recommandé)"
        echo "  cleanup   - Nettoyage des conteneurs seulement"
        echo "  rebuild   - Reconstruction des images seulement"
        echo "  start     - Démarrage des services seulement"
        echo "  help      - Afficher cette aide"
        echo ""
        echo "Exemples:"
        echo "  ./scripts/diagnostic-fix.sh check    # Vérifier l'état"
        echo "  ./scripts/diagnostic-fix.sh full     # Diagnostic + correction"
        echo "  ./scripts/diagnostic-fix.sh fix      # Correction automatique"
        echo ""
        echo "Variables d'environnement:"
        echo "  SUPER_ADMIN_EMAIL    - Email de l'admin (défaut: admin@jobbingtrack.com)"
        echo "  SUPER_ADMIN_PASSWORD - Mot de passe de l'admin (défaut: SuperAdmin123!)"
        ;;
esac
