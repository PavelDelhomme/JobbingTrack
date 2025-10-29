#!/bin/bash
set -e

cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack/backend/metrics-aggregator-service

echo "📦 Génération package-lock.json..."
npm install

echo ""
echo "✅ Terminé - Vous pouvez maintenant lancer: make up-full"
