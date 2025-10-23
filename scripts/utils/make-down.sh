#!/usr/bin/env bash

# ============================================================================
# Script de remplacement pour "make down" - JobbingTrack
# ============================================================================
# Arrête tous les services JobbingTrack
# ============================================================================

# Couleurs pour les messages
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🛑 Arrêt de tous les services JobbingTrack...${NC}"

# Vérifier que Docker est disponible
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker n'est pas installé${NC}"
    exit 1
fi

# Détecter la commande Docker Compose
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    echo -e "${RED}❌ Docker Compose n'est pas disponible${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Commande détectée: $DOCKER_COMPOSE_CMD${NC}"

# Arrêter tous les services
if [ "$DOCKER_COMPOSE_CMD" = "docker-compose" ]; then
    docker-compose -f docker-compose.yml down
else
    docker compose -f docker-compose.yml down
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Tous les services arrêtés${NC}"
else
    echo -e "${RED}❌ Erreur lors de l'arrêt des services${NC}"
    exit 1
fi
