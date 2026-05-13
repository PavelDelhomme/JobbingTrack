#!/bin/bash

# Script de test automatisé end-to-end complet pour JobbingTrack
# Ce script exécute tous les tests du parcours utilisateur

set -e  # Arrêter en cas d'erreur

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}   TESTS AUTOMATISÉS JOBBING TRACK${NC}"
echo -e "${BLUE}=================================================${NC}\n"

# Vérifier que les services sont démarrés
echo -e "${YELLOW}🔍 Vérification des services...${NC}"

check_service() {
    local url=$1
    local name=$2
    
    if curl -s "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $name est accessible${NC}"
        return 0
    else
        echo -e "${RED}❌ $name n'est pas accessible sur $url${NC}"
        return 1
    fi
}

# Vérifier le frontend
if ! check_service "http://localhost:3000" "Frontend"; then
    echo -e "${YELLOW}⚠️  Démarrage du frontend...${NC}"
    cd "$ROOT_DIR/frontend"
    npm run dev &
    FRONTEND_PID=$!
    sleep 10
    cd "$ROOT_DIR/tests"
fi

# Vérifier l'API Gateway
if ! check_service "http://localhost:3000/api/v1/auth/health" "API Gateway"; then
    echo -e "${YELLOW}⚠️  Démarrage des services backend...${NC}"
    cd "$ROOT_DIR/backend"
    docker-compose up -d
    sleep 15
    cd "$ROOT_DIR/tests"
fi

cd "$ROOT_DIR/tests"

echo -e "\n${BLUE}=================================================${NC}"
echo -e "${BLUE}   EXÉCUTION DES TESTS E2E${NC}"
echo -e "${BLUE}=================================================${NC}\n"

# Installer les dépendances si nécessaire
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installation des dépendances...${NC}"
    npm install
fi

# Créer le répertoire de rapports
mkdir -p reports

# Exécuter les tests avec Playwright
echo -e "\n${GREEN}🧪 Lancement des tests Playwright...${NC}\n"

# Test 1: Login basique
echo -e "${BLUE}Test 1/5: Connexion de base${NC}"
npx playwright test e2e/specs/login.spec.ts --reporter=line

# Test 2: Backoffice admin
echo -e "\n${BLUE}Test 2/5: Backoffice administrateur${NC}"
npx playwright test e2e/specs/admin-backoffice.spec.ts --reporter=line

# Test 3: Parcours utilisateur complet
echo -e "\n${BLUE}Test 3/5: Parcours utilisateur complet${NC}"
cd "$ROOT_DIR/frontend"
npx playwright test tests/e2e/complete-user-journey.spec.ts --reporter=line
cd "$ROOT_DIR/tests"

# Test 4: Tests de sécurité
echo -e "\n${BLUE}Test 4/5: Tests de sécurité${NC}"
if [ -f "e2e/test-playwright-security.js" ]; then
    node e2e/test-playwright-security.js
else
    echo -e "${YELLOW}⚠️  Tests de sécurité non trouvés${NC}"
fi

# Test 5: Tests de performance
echo -e "\n${BLUE}Test 5/5: Tests de performance${NC}"
if [ -f "performance/api-performance.js" ]; then
    node performance/api-performance.js
else
    echo -e "${YELLOW}⚠️  Tests de performance non trouvés${NC}"
fi

# Générer le rapport HTML
echo -e "\n${GREEN}📊 Génération du rapport HTML...${NC}"
npx playwright show-report &

# Résumé des tests
echo -e "\n${BLUE}=================================================${NC}"
echo -e "${BLUE}   RÉSUMÉ DES TESTS${NC}"
echo -e "${BLUE}=================================================${NC}\n"

if [ -f "test-results.json" ]; then
    echo -e "${GREEN}✅ Tests terminés avec succès${NC}"
    echo -e "${GREEN}📄 Rapport disponible dans test-results.json${NC}"
    echo -e "${GREEN}🌐 Rapport HTML ouvert dans le navigateur${NC}"
else
    echo -e "${YELLOW}⚠️  Fichier de résultats non trouvé${NC}"
fi

echo -e "\n${BLUE}=================================================${NC}"
echo -e "${BLUE}   TESTS COMPLETS TERMINÉS${NC}"
echo -e "${BLUE}=================================================${NC}\n"

# Nettoyer les processus si nécessaire
if [ ! -z "$FRONTEND_PID" ]; then
    echo -e "${YELLOW}🧹 Nettoyage des processus...${NC}"
    kill $FRONTEND_PID 2>/dev/null || true
fi

exit 0

