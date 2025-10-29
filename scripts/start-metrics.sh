#!/bin/bash

# Script pour démarrer les services de métriques
# Usage: ./scripts/start-metrics.sh

set -e

echo "🚀 Démarrage des services de métriques..."

cd "$(dirname "$0")/.."

# Vérifier que Docker est en cours d'exécution
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker n'est pas en cours d'exécution"
    exit 1
fi

echo "✅ Docker est actif"

# Démarrer cAdvisor
echo "📊 Démarrage de cAdvisor..."
docker-compose up -d cadvisor

# Attendre que cAdvisor soit prêt
echo "⏳ Attente de cAdvisor..."
for i in {1..30}; do
    if curl -s http://localhost:8081/healthz > /dev/null 2>&1; then
        echo "✅ cAdvisor est prêt"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "⚠️  cAdvisor prend du temps à démarrer (normal)"
    fi
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
