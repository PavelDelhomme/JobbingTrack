#!/bin/bash

# Script pour démarrer les services de métriques
# Usage: ./scripts/start-metrics.sh

set -e

echo "🚀 Démarrage Metrics Aggregator (Read-Only + Export)"
echo "===================================================="
echo ""

cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack

# 1. Créer le dossier d'export
echo "📁 Création /tmp/jobbingtrack-metrics..."
mkdir -p /tmp/jobbingtrack-metrics
chmod 777 /tmp/jobbingtrack-metrics

# 2. Arrêter et nettoyer
echo "🧹 Nettoyage..."
docker stop jobbingtrack-metrics-aggregator 2>/dev/null || true
docker rm jobbingtrack-metrics-aggregator 2>/dev/null || true
docker rmi jobbingtrack-metrics-aggregator 2>/dev/null || true

# 3. Construire
echo ""
echo "🔨 Construction de l'image..."
docker build -t jobbingtrack-metrics-aggregator backend/metrics-aggregator-service/

if [ $? -ne 0 ]; then
    echo "❌ Erreur construction"
    exit 1
fi

# 4. Démarrer
echo ""
echo "🚀 Démarrage..."
docker-compose up -d cadvisor
sleep 2
    sleep 1
done

# Démarrer Metrics Aggregator
echo "📈 Démarrage du Metrics Aggregator..."
docker-compose up -d jobbingtrack-metrics-aggregator

# Attendre que le service soit prêt
echo "⏳ Attente du Metrics Aggregator..."
for i in {1..30}; do
    if curl -s http://localhost:3014/api/v1/health > /dev/null 2>&1; then
        echo "✅ Metrics Aggregator est prêt"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Le Metrics Aggregator ne répond pas"
        echo "📋 Vérification des logs..."
        docker-compose logs --tail=20 jobbingtrack-metrics-aggregator
        exit 1
    fi
    sleep 1
done

# Tester l'endpoint
echo "🧪 Test de l'endpoint /api/v1/metrics..."
if curl -s http://localhost:3014/api/v1/metrics | grep -q "system"; then
    echo "✅ L'endpoint renvoie des données"
else
    echo "⚠️  L'endpoint ne renvoie pas de données système"
fi

# Afficher l'état des services
echo ""
echo "📊 État des services de métriques:"
docker-compose ps | grep -E "cadvisor|metrics"

echo ""
echo "✅ Services de métriques démarrés avec succès!"
echo ""
echo "📝 Endpoints disponibles:"
echo "   - cAdvisor:          http://localhost:8081"
echo "   - Metrics Health:    http://localhost:3014/api/v1/health"
echo "   - Metrics System:    http://localhost:3014/api/v1/metrics"
echo ""
echo "🌐 Ouvrez votre dashboard: http://localhost:8080"
