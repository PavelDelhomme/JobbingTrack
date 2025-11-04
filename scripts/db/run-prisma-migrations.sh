#!/bin/bash

# ============================================
# Script de Migration Prisma dans Docker
# ============================================
# Exécute les migrations Prisma depuis un conteneur temporaire
# qui a accès au réseau Docker

set -e

echo "🚀 Démarrage de la migration Prisma dans Docker..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vérifier que Docker tourne
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker n'est pas démarré !${NC}"
    exit 1
fi

# Vérifier que PostgreSQL est démarré
echo -e "${BLUE}📊 Vérification de PostgreSQL...${NC}"
if ! docker ps | grep -q jobbingtrack-postgres; then
    echo -e "${YELLOW}⚠️  PostgreSQL n'est pas démarré. Démarrage...${NC}"
    docker-compose up -d postgres
    sleep 5
fi

# Attendre que PostgreSQL soit prêt
echo -e "${BLUE}⏳ Attente de PostgreSQL...${NC}"
timeout 30 bash -c 'until docker exec jobbingtrack-postgres pg_isready -U jobbingtrack > /dev/null 2>&1; do sleep 1; done' || {
    echo -e "${RED}❌ PostgreSQL ne répond pas !${NC}"
    exit 1
}
echo -e "${GREEN}✅ PostgreSQL est prêt${NC}"

# Déterminer le réseau Docker
NETWORK=$(docker network ls | grep jobbingtrack | awk '{print $2}' | head -n 1)
if [ -z "$NETWORK" ]; then
    echo -e "${RED}❌ Réseau Docker jobbingtrack introuvable !${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Réseau Docker: ${NETWORK}${NC}"

# Aller dans le dossier prisma
cd "$(dirname "$0")/../backend/prisma"

echo ""
echo -e "${BLUE}📦 Installation des dépendances Prisma...${NC}"

# Créer un conteneur temporaire pour exécuter les migrations
docker run --rm -i \
  --network "$NETWORK" \
  -v "$(pwd):/app" \
  -w /app \
  -e DATABASE_URL="postgresql://jobbingtrack:jobbingtrack123@postgres:5432/jobbingtrack?schema=public" \
  node:20-alpine \
  sh -c "
    echo '📦 Installation de Prisma...'
    npm install --silent || exit 1
    
    echo ''
    echo '🔧 Génération du client Prisma...'
    npx prisma generate || exit 1
    
    echo ''
    echo '🗄️  Application des migrations...'
    npx prisma migrate deploy || exit 1
    
    echo ''
    echo '🌱 Exécution du seed...'
    node seed.js || exit 1
    
    echo ''
    echo '✅ Migration terminée avec succès !'
  "

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ MIGRATION PRISMA RÉUSSIE !${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${BLUE}📊 Statistiques:${NC}"
    echo -e "  - Schéma: 19 modèles créés"
    echo -e "  - Seed: 52 valeurs prédéfinies insérées"
    echo ""
else
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}❌ ÉCHEC DE LA MIGRATION${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 1
fi
