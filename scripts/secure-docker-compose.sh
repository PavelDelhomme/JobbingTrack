#!/bin/bash

# ============================================
# Script de Sécurisation docker-compose.yml
# ============================================
# Remplace toutes les DATABASE_URL hardcodées par des variables d'environnement

set -e

echo "🔐 Sécurisation du fichier docker-compose.yml..."
echo ""

cd "$(dirname "$0")/.."

# Backup
cp docker-compose.yml docker-compose.yml.backup-$(date +%Y%m%d-%H%M%S)
echo "✅ Backup créé"

# Remplacer DATABASE_URL hardcodées
sed -i 's|DATABASE_URL=postgresql://jobbingtrack:jobbingtrack123@postgres:5432/jobbingtrack?schema=public|DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public|g' docker-compose.yml

sed -i 's|DATABASE_URL=postgresql://admin@jobbingtrack.test:admin@jobbingtrack.test@postgres:5432/jobbingtrack|DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}|g' docker-compose.yml

sed -i 's|DATABASE_URL=postgresql://jobbingtrack:jobbingtrack123@postgres:5432/jobbingtrack?schema=deployment|DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=deployment|g' docker-compose.yml

echo "✅ DATABASE_URL sécurisées"

# Remplacer JWT_SECRET avec valeur par défaut
sed -i 's|JWT_SECRET=${JWT_SECRET:-your-secret-key-change-in-production-2025}|JWT_SECRET=${JWT_SECRET}|g' docker-compose.yml

echo "✅ JWT_SECRET sécurisés"

echo ""
echo "✅ Sécurisation terminée !"
echo ""
echo "⚠️  IMPORTANT: Vérifiez que votre fichier .env contient:"
echo "   POSTGRES_USER=postgres"
echo "   POSTGRES_PASSWORD=votre-mot-de-passe"
echo "   POSTGRES_DB=jobbingtrack"
echo "   JWT_SECRET=votre-secret"
echo "   JWT_REFRESH_SECRET=votre-secret-refresh"
echo ""
