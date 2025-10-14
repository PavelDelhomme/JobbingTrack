#!/bin/bash

# Script pour arrêter proprement tout le projet JobbingTrack
# Usage: ./scripts/stop-all.sh [clean]

set -e

CLEAN="${1:-false}"

echo "🛑 Arrêt complet de JobbingTrack"
echo "================================"

# Arrêter tous les services
echo "🔽 Arrêt des services backend..."
make down

echo "🖥️ Arrêt du frontend..."
make down-backend 2>/dev/null || echo "   Frontend déjà arrêté"

if [ "$CLEAN" = "true" ]; then
    echo "🧹 Nettoyage complet..."
    make clean
fi

echo ""
echo "✅ JobbingTrack arrêté avec succès !"

if [ "$CLEAN" = "true" ]; then
    echo ""
    echo "💡 Pour redémarrer :"
    echo "   ./scripts/start-all.sh"
else
    echo ""
    echo "💡 Pour redémarrer :"
    echo "   make up"
    echo "   cd frontend && docker-compose up -d"
fi
