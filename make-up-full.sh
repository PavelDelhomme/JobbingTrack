#!/usr/bin/env bash

# ============================================================================
# Script de remplacement pour "make up-full" - JobbingTrack
# ============================================================================
# Démarre TOUS les services JobbingTrack avec tous les profils
# ============================================================================

# Couleurs pour les messages
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Démarrage complet de JobbingTrack...${NC}"
echo "📦 Tous les services avec métriques complètes"

# Vérifier que Docker est disponible
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker n'est pas installé${NC}"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker daemon n'est pas en cours d'exécution${NC}"
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

# Démarrer d'abord les services essentiels
echo -e "${BLUE}🔄 Démarrage des services essentiels...${NC}"

if [ "$DOCKER_COMPOSE_CMD" = "docker-compose" ]; then
    docker-compose -f docker-compose.yml up -d postgres redis api-gateway frontend auth-service dashboard-service
else
    docker compose -f docker-compose.yml up -d postgres redis api-gateway frontend auth-service dashboard-service
fi

# Puis les services optionnels avec profils
echo -e "${BLUE}🔄 Démarrage des services avec profils...${NC}"

if [ "$DOCKER_COMPOSE_CMD" = "docker-compose" ]; then
    docker-compose -f docker-compose.yml --profile applications up -d
    docker-compose -f docker-compose.yml --profile companies up -d
    docker-compose -f docker-compose.yml --profile contacts up -d
    docker-compose -f docker-compose.yml --profile interviews up -d
    docker-compose -f docker-compose.yml --profile notifications up -d
    docker-compose -f docker-compose.yml --profile calls up -d
    docker-compose -f docker-compose.yml --profile profiles up -d
    docker-compose -f docker-compose.yml --profile events up -d
    docker-compose -f docker-compose.yml --profile followups up -d
    docker-compose -f docker-compose.yml --profile workflows up -d
    docker-compose -f docker-compose.yml --profile monitoring up -d
else
    docker compose -f docker-compose.yml --profile applications up -d
    docker compose -f docker-compose.yml --profile companies up -d
    docker compose -f docker-compose.yml --profile contacts up -d
    docker compose -f docker-compose.yml --profile interviews up -d
    docker compose -f docker-compose.yml --profile notifications up -d
    docker compose -f docker-compose.yml --profile calls up -d
    docker compose -f docker-compose.yml --profile profiles up -d
    docker compose -f docker-compose.yml --profile events up -d
    docker compose -f docker-compose.yml --profile followups up -d
    docker compose -f docker-compose.yml --profile workflows up -d
    docker compose -f docker-compose.yml --profile monitoring up -d
fi

echo ""
echo -e "${GREEN}✅ Système complet démarré avec succès !${NC}"
echo ""
echo -e "${BLUE}🌐 Toutes les interfaces sont disponibles${NC}"
echo -e "${BLUE}📊 Monitoring: Prometheus (9090), Grafana (4000), cAdvisor (8080)${NC}"
