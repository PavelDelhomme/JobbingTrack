#!/bin/bash

# ============================================
# Script de Fix Complet JobbingTrack
# ============================================

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║   Fix Complet JobbingTrack                           ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

cd "$(dirname "$0")/.."

# ============================================
# Fix 1 : Frontend Dependencies
# ============================================
echo "📦 Installation des dépendances frontend..."
cd frontend
npm install critters
cd ..
echo "✅ Dépendances frontend installées"
echo ""

# ============================================
# Fix 2 : Rebuild Metrics Aggregator
# ============================================
echo "🔨 Rebuild metrics-aggregator..."
docker stop jobbingtrack-metrics-aggregator 2>/dev/null || true
docker rm jobbingtrack-metrics-aggregator 2>/dev/null || true
docker rmi jobbingtrack-metrics-aggregator 2>/dev/null || true
docker-compose up -d --build jobbingtrack-metrics-aggregator
echo "✅ Metrics-aggregator reconstruit"
echo ""

# ============================================
# Fix 3 : Rebuild Frontend
# ============================================
echo "🔨 Rebuild frontend..."
docker stop jobbingtrack-frontend 2>/dev/null || true
docker rm jobbingtrack-frontend 2>/dev/null || true
docker rmi jobbingtrack-frontend 2>/dev/null || true
docker-compose up -d --build frontend
echo "✅ Frontend reconstruit"
echo ""

# ============================================
# Fix 4 : Créer l'utilisateur super admin
# ============================================
echo "👤 Création de l'utilisateur super administrateur..."
chmod +x backend/scripts/database/create-admin-user.sh
./backend/scripts/database/create-admin-user.sh || {
    echo "⚠️  Erreur lors de la création de l'utilisateur admin"
    echo "   Vous pouvez le faire manuellement avec: make create-admin-user"
}
echo ""

# ============================================
# Attendre que les services démarrent
# ============================================
echo "⏳ Attente du démarrage des services (15s)..."
sleep 15
echo ""

# ============================================
# Vérification
# ============================================
echo "╔════════════════════════════════════════════════════════╗"
echo "║   Vérification                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

echo "📊 Test metrics-aggregator..."
curl -s http://localhost:8014/api/v1/metrics | jq '.system | {cpus, cpu_percent, memory_percent, containers}'
echo ""

echo "📋 Conteneurs actifs:"
docker ps --filter "name=jobbingtrack-" --format "table {{.Names}}\t{{.Status}}"
echo ""

echo "✅ Fix terminé !"
echo ""
echo "🌐 Accès:"
echo "  Frontend:    http://localhost:8080"
echo "  API Metrics: http://localhost:8014/api/v1/metrics"
echo ""
echo "🔑 Identifiants Admin:"
echo "  Email:       admin@jobbingtrack.test"
echo "  Password:    password123"
echo ""
