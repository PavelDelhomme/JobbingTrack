#!/usr/bin/env bash

# ============================================================================
# Script de remplacement pour "make up" - JobbingTrack
# ============================================================================
# Démarre les services essentiels JobbingTrack
# ============================================================================

# Couleurs pour les messages
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Démarrage des services essentiels JobbingTrack...${NC}"
echo "📦 Services: postgres, redis, api-gateway, frontend, auth-service, dashboard-service"

# Vérifier que Docker est disponible
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker n'est pas installé${NC}"
    echo -e "${YELLOW}💡 Installez Docker: https://docs.docker.com/get-docker/${NC}"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker daemon n'est pas en cours d'exécution${NC}"
    echo -e "${YELLOW}💡 Démarrer Docker: sudo systemctl start docker (Linux) ou démarrer Docker Desktop${NC}"
    exit 1
fi

# Détecter la commande Docker Compose
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
    echo -e "${GREEN}✅ Docker Compose détecté: docker-compose${NC}"
elif docker compose version &> /dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker compose"
    echo -e "${GREEN}✅ Docker Compose détecté: docker compose${NC}"
else
    echo -e "${RED}❌ Docker Compose n'est pas disponible${NC}"
    echo -e "${YELLOW}💡 Installez Docker Compose ou utilisez Docker Desktop${NC}"
    exit 1
fi

# Démarrer les services essentiels
echo -e "${BLUE}🔄 Démarrage des services...${NC}"

if [ "$DOCKER_COMPOSE_CMD" = "docker-compose" ]; then
    docker-compose -f docker-compose.yml up -d postgres redis api-gateway frontend auth-service dashboard-service
else
    docker compose -f docker-compose.yml up -d postgres redis api-gateway frontend auth-service dashboard-service
fi

if [ $? -eq 0 ]; then
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
    if [ -n "${ADMIN_EMAIL:-}" ]; then
        echo "   Email:    $ADMIN_EMAIL"
        if [ -n "${ADMIN_PASSWORD:-}" ]; then
            echo "   Password: $ADMIN_PASSWORD"
        else
            echo "   Password: [Défini dans les variables d'environnement]"
        fi
    else
        echo "   Email:    [Défini dans le fichier .env]"
        echo "   Password: [Défini dans le fichier .env]"
    fi
    echo ""
    echo -e "${YELLOW}💡 Utilisez './make-up-full.sh' pour démarrer tous les services${NC}"
else
    echo -e "${RED}❌ Erreur lors du démarrage des services${NC}"
    exit 1
fi
