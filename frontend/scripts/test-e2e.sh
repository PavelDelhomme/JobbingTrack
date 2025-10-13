#!/bin/bash

# Script pour exécuter les tests e2e avec les services backend
# Usage: ./scripts/test-e2e.sh [playwright-options]

set -e

echo "🚀 Démarrage des tests e2e avec services backend..."

# Démarrer les services backend en arrière-plan
echo "📦 Démarrage des services backend..."
cd ../backend
docker compose up -d --build

# Attendre que les services soient prêts
echo "⏳ Attente de la disponibilité des services..."
sleep 30

# Vérifier que les services répondent
echo "🔍 Vérification de la santé des services..."
curl -f http://localhost:3000/health || { echo "❌ API Gateway non disponible"; exit 1; }

# Retourner au frontend
cd ../frontend

# Exécuter les tests Playwright
echo "🧪 Exécution des tests Playwright..."
npx playwright test "$@"

# Nettoyer les services après les tests
echo "🧹 Arrêt des services backend..."
cd ../backend
docker compose down

echo "✅ Tests e2e terminés avec succès!"
