#!/bin/bash

# ============================================
# Script pour Initialiser les Nouveaux Schémas Prisma
# ============================================

set -e

echo "🚀 Initialisation des nouveaux schémas Prisma..."
echo ""

cd "$(dirname "$0")/.."

# contact-service
echo "📦 contact-service - Création de la migration initiale..."
cd backend/contact-service
npx prisma migrate dev --name init --create-only
echo "✅ Migration créée pour contact-service"
echo ""
cd ../..

# metrics-aggregator-service
echo "📦 metrics-aggregator-service - Création de la migration initiale..."
cd backend/metrics-aggregator-service
npx prisma migrate dev --name init --create-only
echo "✅ Migration créée pour metrics-aggregator-service"
echo ""
cd ../..

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Migrations créées !"
echo ""
echo "💡 Prochaines étapes:"
echo "   1. make rebuild"
echo "   2. make up-full"
echo "   3. make db-migrate"
