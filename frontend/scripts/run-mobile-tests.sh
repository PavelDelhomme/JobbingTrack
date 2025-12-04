#!/bin/bash

# Script simplifié pour lancer les tests mobile
# Résout les problèmes de permissions et utilise npx

set -e

cd "$(dirname "$0")/.."

echo "🚀 Lancement des tests mobile Playwright..."
echo ""

# Vérifier que Playwright est installé
if ! command -v npx &> /dev/null; then
    echo "❌ npx n'est pas installé"
    exit 1
fi

# Vérifier les services
echo "🔍 Vérification des services..."
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5003}"
API_URL="${API_GATEWAY_URL:-http://localhost:5002}"

if ! curl -s "$FRONTEND_URL" > /dev/null 2>&1; then
    echo "⚠️  Frontend non accessible sur $FRONTEND_URL"
    echo "💡 Démarrez avec: cd frontend && npm run dev"
fi

if ! curl -s "$API_URL/health" > /dev/null 2>&1; then
    echo "⚠️  API Gateway non accessible sur $API_URL"
    echo "💡 Démarrez avec: make up"
fi

echo "✅ Services vérifiés"
echo ""

# Lancer les tests
echo "🧪 Exécution des tests mobile..."
echo ""

# Utiliser npx pour éviter les problèmes de PATH
npx playwright test tests/e2e/mobile \
    --config=playwright.mobile.config.ts \
    --project="iPhone 13 Pro" \
    --reporter=list \
    "$@"

echo ""
echo "✅ Tests terminés !"
echo "📊 Pour voir le rapport: npx playwright show-report playwright-report-mobile"

