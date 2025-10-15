#!/bin/bash

# Script de démarrage du système de monitoring complet
# Usage: ./monitoring/start-monitoring.sh [up|down|restart]

set -e

ACTION="${1:-up}"

echo "🚀 Démarrage du système de monitoring JobbingTrack..."
echo "=================================================="

# Vérifier Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé"
    exit 1
fi

# Vérifier Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé"
    exit 1
fi

cd "$(dirname "$0")"

case "$ACTION" in
    "up")
        echo "📦 Démarrage de tous les services de monitoring..."

        # Démarrer les services de monitoring
        if command -v docker-compose &> /dev/null; then
            docker-compose up -d
        else
            docker compose up -d
        fi

        echo ""
        echo "✅ Système de monitoring démarré !"
        echo ""
        echo "🌐 Interfaces disponibles :"
        echo "   📊 cAdvisor:         http://localhost:8082"
        echo "   📈 Prometheus:       http://localhost:9093"
        echo "   📊 Grafana:          http://localhost:3003 (admin/admin)"
        echo "   🚨 Alertmanager:     http://localhost:9096"
        echo "   🔍 Node Exporter:    http://localhost:9101"
        echo "   🌐 Blackbox Exp.:    http://localhost:9118"
        echo ""
        echo "💡 Commandes utiles :"
        echo "   ./start-monitoring.sh logs    - Voir les logs"
        echo "   ./start-monitoring.sh down    - Arrêter le monitoring"
        echo "   ./start-monitoring.sh restart - Redémarrer le monitoring"
        ;;

    "down")
        echo "🛑 Arrêt du système de monitoring..."

        if command -v docker-compose &> /dev/null; then
            docker-compose down
        else
            docker compose down
        fi

        echo "✅ Système de monitoring arrêté"
        ;;

    "restart")
        echo "🔄 Redémarrage du système de monitoring..."

        if command -v docker-compose &> /dev/null; then
            docker-compose restart
        else
            docker compose restart
        fi

        echo "✅ Système de monitoring redémarré"
        ;;

    "logs")
        echo "📋 Affichage des logs du système de monitoring..."

        if command -v docker-compose &> /dev/null; then
            docker-compose logs -f
        else
            docker compose logs -f
        fi
        ;;

    "status")
        echo "📊 État du système de monitoring:"

        if command -v docker-compose &> /dev/null; then
            docker-compose ps
        else
            docker compose ps
        fi
        ;;

    *)
        echo "❌ Action inconnue: $ACTION"
        echo ""
        echo "Usage: $0 [up|down|restart|logs|status]"
        echo ""
        echo "Actions disponibles :"
        echo "  up      - Démarrer tous les services de monitoring"
        echo "  down    - Arrêter tous les services de monitoring"
        echo "  restart - Redémarrer tous les services de monitoring"
        echo "  logs    - Afficher les logs en temps réel"
        echo "  status  - Afficher l'état des services"
        exit 1
        ;;
esac
