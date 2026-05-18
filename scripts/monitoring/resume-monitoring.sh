#!/bin/bash

# ============================================================================
# Script pour reprendre la collecte de métriques (stack Rust par défaut)
# ============================================================================
# Redémarre monitoring-agent-rs (+ log-collector-rs si besoin) après une pause.
# Legacy C : démarrer manuellement jobbingtrack-monitoring-c ou `make monitoring-c-up`.
# ============================================================================

set -e

echo "▶️  Reprise de la collecte de métriques (Rust)..."
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT"

# Vérifier que PostgreSQL est démarré
POSTGRES_CONTAINER=$(docker ps -q --filter "name=jobbingtrack-postgres")
if [ -z "$POSTGRES_CONTAINER" ]; then
    echo "⚠️  PostgreSQL n'est pas démarré. Démarrage..."
    docker start jobbingtrack-postgres 2>/dev/null || docker compose -f docker-compose.yml up -d postgres
    echo "⏳ Attente que PostgreSQL soit prêt..."
    sleep 5
fi

echo "1️⃣  Démarrage monitoring-agent-rs + log-collector-rs + jobbingtrack-metrics-aggregator…"
docker compose -f docker-compose.yml --profile monitoring up -d monitoring-agent-rs log-collector-rs jobbingtrack-metrics-aggregator
echo "✅ Stack monitoring Rust + agrégateur démarrée"
echo ""

echo "✅ Collecte de métriques reprise"
echo "💡 Legacy C uniquement si besoin : make monitoring-c-up"
echo ""
