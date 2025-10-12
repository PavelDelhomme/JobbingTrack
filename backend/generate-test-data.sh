#!/bin/bash

# 🎲 Script de génération de données de test pour JobbingTrack
# Usage: ./generate-test-data.sh [preset]
# Presets: minimal, standard, complete, demo

set -e

echo "🎲 Générateur de données de test JobbingTrack"
echo "=============================================="

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
PRESET=${1:-standard}

case $PRESET in
  minimal)
    CONFIG='{"users":2,"companies":5,"applications":5,"contacts":5,"interviews":2,"followups":3,"calls":2,"events":5,"deletedItems":1,"archivedItems":1}'
    echo -e "${BLUE}📊 Preset: Minimal${NC}"
    ;;
  standard)
    CONFIG='{"users":3,"companies":10,"applications":20,"contacts":15,"interviews":8,"followups":12,"calls":10,"events":20,"deletedItems":5,"archivedItems":3}'
    echo -e "${BLUE}📊 Preset: Standard${NC}"
    ;;
  complete)
    CONFIG='{"users":5,"companies":20,"applications":50,"contacts":40,"interviews":20,"followups":30,"calls":25,"events":50,"deletedItems":10,"archivedItems":8}'
    echo -e "${BLUE}📊 Preset: Complet${NC}"
    ;;
  demo)
    CONFIG='{"users":1,"companies":8,"applications":15,"contacts":12,"interviews":6,"followups":8,"calls":5,"events":15,"deletedItems":2,"archivedItems":2}'
    echo -e "${BLUE}📊 Preset: Démo${NC}"
    ;;
  *)
    echo -e "${RED}❌ Preset invalide: $PRESET${NC}"
    echo "Presets disponibles: minimal, standard, complete, demo"
    exit 1
    ;;
esac

echo ""
echo -e "${YELLOW}⚠️  Cette opération va générer des données dans la base de données${NC}"
echo ""
read -p "Continuer ? (o/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Oo]$ ]]; then
    echo "Opération annulée"
    exit 0
fi

# Exécuter le script de génération
echo ""
echo -e "${BLUE}🔄 Génération en cours...${NC}"
echo ""

cd "$(dirname "$0")"

# Via Docker si disponible
if docker compose ps | grep -q "jobbingtrack-auth-service"; then
    echo -e "${BLUE}🐳 Exécution via Docker...${NC}"
    docker compose exec -T auth-service node /app/../generate-test-data.js "$CONFIG"
else
    # Directement avec Node.js
    echo -e "${BLUE}💻 Exécution locale...${NC}"
    node generate-test-data.js "$CONFIG"
fi

echo ""
echo -e "${GREEN}✅ Génération terminée !${NC}"
echo ""
echo -e "${BLUE}🔐 Comptes de test créés:${NC}"
echo "   user1@jobbingtrack.com (SUPER_ADMIN) - password123"
echo "   user2@jobbingtrack.com (ADMIN) - password123"
echo "   user3@jobbingtrack.com (USER) - password123"
echo ""

