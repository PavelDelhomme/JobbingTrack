#!/bin/bash

# ============================================================================
# Script pour Reprendre la Collecte de Métriques
# ============================================================================
# Redémarre monitoring-c pour reprendre la collecte après une pause
# ============================================================================

set -e

echo "▶️  Reprise de la collecte de métriques..."
echo ""

# Vérifier que PostgreSQL est démarré
POSTGRES_CONTAINER=$(docker ps -q --filter "name=jobbingtrack-postgres")
if [ -z "$POSTGRES_CONTAINER" ]; then
    echo "⚠️  PostgreSQL n'est pas démarré. Démarrage..."
    docker start jobbingtrack-postgres
    echo "⏳ Attente que PostgreSQL soit prêt..."
    sleep 5
fi

# Démarrer monitoring-c
echo "1️⃣  Démarrage de monitoring-c..."
docker start jobbingtrack-monitoring-c 2>/dev/null || {
    echo "   monitoring-c n'existe pas, création..."
    docker compose up -d monitoring-c
}
echo "✅ monitoring-c démarré"
echo ""

# Optionnel: Démarrer metrics-aggregator-c aussi si nécessaire
# docker start jobbingtrack-metrics-aggregator-c 2>/dev/null || docker compose up -d metrics-aggregator-c

echo "✅ Collecte de métriques reprise"
echo "💡 Les nouvelles métriques seront maintenant collectées et stockées"
echo ""

