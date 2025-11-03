#!/bin/bash

# ============================================
# Script de Nettoyage Complet du Monitoring
# ============================================
# Nettoie TOUS les conteneurs monitoring pour éviter les conflits

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║   Nettoyage Complet Monitoring JobbingTrack          ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# ============================================
# ARRÊT DES CONTENEURS
# ============================================
echo "🛑 Arrêt des conteneurs monitoring..."

# Anciens noms (avant renommage)
docker stop cadvisor-monitoring prometheus grafana loki promtail node-exporter 2>/dev/null || true

# Nouveaux noms (après renommage)
docker stop jobbingtrack-cadvisor jobbingtrack-prometheus jobbingtrack-grafana \
           jobbingtrack-loki jobbingtrack-promtail jobbingtrack-node-exporter 2>/dev/null || true

# Metrics aggregator
docker stop jobbingtrack-metrics-aggregator 2>/dev/null || true

echo "✅ Conteneurs arrêtés"
echo ""

# ============================================
# SUPPRESSION DES CONTENEURS
# ============================================
echo "🗑️  Suppression des conteneurs..."

# Anciens noms
docker rm cadvisor-monitoring prometheus grafana loki promtail node-exporter 2>/dev/null || true

# Nouveaux noms
docker rm jobbingtrack-cadvisor jobbingtrack-prometheus jobbingtrack-grafana \
          jobbingtrack-loki jobbingtrack-promtail jobbingtrack-node-exporter 2>/dev/null || true

# Metrics aggregator
docker rm jobbingtrack-metrics-aggregator 2>/dev/null || true

echo "✅ Conteneurs supprimés"
echo ""

# ============================================
# NETTOYAGE DES RÉSEAUX
# ============================================
echo "🌐 Nettoyage des réseaux..."

docker network rm jobbingtrack_jobbingtrack-network 2>/dev/null || true
docker network rm backend_jobbingtrack-network 2>/dev/null || true

echo "✅ Réseaux nettoyés"
echo ""

# ============================================
# ARRÊT DES STACKS DOCKER COMPOSE
# ============================================
echo "📦 Arrêt des stacks Docker Compose..."

cd "$(dirname "$0")/.."

# Stack principale
docker-compose down 2>/dev/null || true

# Stack monitoring
cd monitoring
docker-compose -f docker-compose.monitoring.yml down 2>/dev/null || true
cd ..

# Stack metrics (obsolète)
docker-compose -f docker-compose.metrics.yml down 2>/dev/null || true

echo "✅ Stacks arrêtées"
echo ""

# ============================================
# NETTOYAGE DES IMAGES (OPTIONNEL)
# ============================================
read -p "🗑️  Voulez-vous aussi supprimer les images monitoring ? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "🗑️  Suppression des images..."
    docker rmi prom/prometheus:v2.47.0 2>/dev/null || true
    docker rmi gcr.io/cadvisor/cadvisor:v0.47.0 2>/dev/null || true
    docker rmi grafana/grafana:10.1.0 2>/dev/null || true
    docker rmi grafana/loki:2.9.0 2>/dev/null || true
    docker rmi grafana/promtail:2.9.0 2>/dev/null || true
    docker rmi prom/node-exporter:v1.8.2 2>/dev/null || true
    docker rmi jobbingtrack-metrics-aggregator 2>/dev/null || true
    echo "✅ Images supprimées"
fi

echo ""

# ============================================
# RÉSUMÉ
# ============================================
echo "╔════════════════════════════════════════════════════════╗"
echo "║   Nettoyage Terminé !                                 ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "✅ Tous les conteneurs monitoring ont été nettoyés"
echo "✅ Les réseaux ont été supprimés"
echo "✅ Les stacks Docker Compose ont été arrêtées"
echo ""
echo "🚀 Vous pouvez maintenant démarrer proprement avec :"
echo "    make monitoring-full"
echo ""
