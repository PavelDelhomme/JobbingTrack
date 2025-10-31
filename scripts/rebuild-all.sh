#!/bin/bash

# ============================================
# Script de Rebuild Complet des Images Docker
# ============================================

set -e

echo "🔨 Rebuild complet de toutes les images Docker..."
echo ""

cd "$(dirname "$0")/.."

# Arrêter tous les services
echo "🛑 Arrêt de tous les services..."
docker-compose -f docker-compose.yml down

echo ""
echo "🗑️  Suppression des anciennes images JobbingTrack..."
docker images | grep "jobbingtrack-" | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true

echo ""
echo "🔨 Rebuild de toutes les images avec le profil 'full'..."
docker-compose -f docker-compose.yml --profile full build --no-cache

echo ""
echo "✅ Rebuild terminé !"
echo ""
echo "💡 Pour démarrer les services:"
echo "   make up-full"
echo ""
