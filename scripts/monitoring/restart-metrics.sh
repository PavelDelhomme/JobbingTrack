#!/bin/bash

echo "🔄 Redémarrage du Metrics Aggregator Service..."

# Arrêter le conteneur
docker-compose stop metrics-aggregator-service

# Redémarrer le conteneur
docker-compose up -d metrics-aggregator-service

echo "✅ Metrics Aggregator Service redémarré"
echo ""
echo "📊 Attendez 10-15 secondes pour que les métriques se chargent..."
echo ""
echo "🔍 Pour voir les logs :"
echo "   docker logs -f jobbingtrack-metrics-aggregator"

