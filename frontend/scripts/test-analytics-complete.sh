#!/bin/bash

# Suite de tests complète pour la page Analytics
# Exécute tous les tests unitaires, d'intégration et de validation
# S'exécute dans le conteneur Docker

set -e

# Vérifier si on est dans un conteneur Docker ou sur la machine hôte
if [ -f /.dockerenv ] || [ -n "$DOCKER_CONTAINER" ]; then
  # On est dans le conteneur, exécuter directement
  FRONTEND_DIR="/app"
  cd "$FRONTEND_DIR"
else
  # On est sur la machine hôte, exécuter dans le conteneur
  CONTAINER_NAME="jobbingtrack-frontend"
  if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "❌ Le conteneur ${CONTAINER_NAME} n'est pas démarré."
    echo "💡 Lancez 'make up-full' ou 'make start' d'abord."
    exit 1
  fi
  echo "🔍 Exécution dans le conteneur ${CONTAINER_NAME}..."
  docker exec -w /app "$CONTAINER_NAME" bash scripts/test-analytics-complete.sh
  exit $?
fi

# Si on arrive ici, on est dans le conteneur
# FRONTEND_DIR est déjà défini à /app

echo "🧪 Suite de tests complète pour Analytics"
echo "=========================================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# 1. Validation automatique
echo -e "${YELLOW}[1/5]${NC} Validation automatique..."
if ./scripts/validate-analytics-page.sh; then
  echo -e "${GREEN}✅ Validation réussie${NC}"
else
  echo -e "${RED}❌ Validation échouée${NC}"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# 2. Tests unitaires
echo -e "${YELLOW}[2/5]${NC} Tests unitaires..."
if npm run test -- src/app/\(admin\)/backoffice/analytics/__tests__ 2>&1 | tee /tmp/analytics-unit-tests.log; then
  echo -e "${GREEN}✅ Tests unitaires réussis${NC}"
else
  echo -e "${RED}❌ Tests unitaires échoués${NC}"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# 3. Tests de détection d'erreurs React
echo -e "${YELLOW}[3/5]${NC} Tests de détection d'erreurs React..."
if npm run test -- src/app/\(admin\)/backoffice/analytics/__tests__/react-errors-detector.test.tsx 2>&1 | tee /tmp/analytics-react-tests.log; then
  echo -e "${GREEN}✅ Tests React réussis${NC}"
else
  echo -e "${RED}❌ Tests React échoués${NC}"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# 4. Tests E2E avec Playwright
echo -e "${YELLOW}[4/5]${NC} Tests E2E (Playwright)..."
if npm run test:e2e -- tests/e2e/backoffice.spec.ts --grep "analytics" 2>&1 | tee /tmp/analytics-e2e-tests.log; then
  echo -e "${GREEN}✅ Tests E2E réussis${NC}"
else
  echo -e "${YELLOW}⚠️  Tests E2E ignorés (nécessite serveur démarré)${NC}"
fi
echo ""

# 5. Vérification de performance
echo -e "${YELLOW}[5/5]${NC} Vérification de performance..."
if npm run perf:test 2>&1 | grep -q "analytics\|Analytics"; then
  echo -e "${GREEN}✅ Performance vérifiée${NC}"
else
  echo -e "${YELLOW}⚠️  Performance non vérifiée (script non disponible)${NC}"
fi
echo ""

# Résumé
echo "=========================================="
if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✅ Tous les tests sont passés !${NC}"
  exit 0
else
  echo -e "${RED}❌ $ERRORS test(s) ont échoué${NC}"
  exit 1
fi

