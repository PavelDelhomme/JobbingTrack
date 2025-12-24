#!/bin/bash

# ============================================================================
# Script pour Pauser Temporairement la Collecte de Métriques
# ============================================================================
# Arrête monitoring-c temporairement (pour reprendre demain matin)
# ============================================================================

set -e

echo "⏸️  Arrêt temporaire de la collecte de métriques..."
echo ""

# Arrêter monitoring-c
echo "1️⃣  Arrêt de monitoring-c..."
docker stop jobbingtrack-monitoring-c 2>/dev/null || echo "   monitoring-c n'était pas démarré"
echo "✅ monitoring-c arrêté"
echo ""

# Optionnel: Arrêter metrics-aggregator-c aussi si nécessaire
# docker stop jobbingtrack-metrics-aggregator-c 2>/dev/null || echo "   metrics-aggregator-c n'était pas démarré"

echo "✅ Collecte de métriques mise en pause"
echo ""
echo "💡 Pour reprendre la collecte demain matin:"
echo "   docker start jobbingtrack-monitoring-c"
echo "   ou"
echo "   make up-full"
echo ""

