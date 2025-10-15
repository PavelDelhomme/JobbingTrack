#!/bin/bash

# Script pour démarrer l'intégralité du projet JobbingTrack
# Usage: ./scripts/start-all.sh [rebuild]

set -e

REBUILD="${1:-false}"

echo "🚀 Démarrage complet de JobbingTrack"
echo "==================================="

# Vérifier que Docker est disponible
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé ou n'est pas dans le PATH"
    exit 1
fi

echo "📦 Vérification des services Docker..."

# Vérifier si on doit reconstruire
if [ "$REBUILD" = "true" ]; then
    echo "🔨 Reconstruction des images Docker..."
    make build
fi

# Démarrer les services backend
echo "🌐 Démarrage des services backend..."
make up

# Attendre que les services soient prêts
echo "⏳ Attente de la disponibilité des services..."
sleep 15

# Créer l'utilisateur admin
echo "👤 Création de l'utilisateur administrateur..."
./scripts/create-admin-user.sh

# Vérifier que tout fonctionne
echo "🔍 Vérification de l'état des services..."
./scripts/diagnostic-fix.sh check

echo ""
echo "🎉 JobbingTrack est maintenant opérationnel !"
echo ""
echo "🌐 Interfaces disponibles :"echo "
echo "   Frontend:           http://localhost:8080"
echo "   Dashboard admin:    http://localhost:8080/backoffice"
echo "   API Gateway:        http://localhost:3000"
echo "   Auth Service:       http://localhost:3001"
echo "   Application Service: http://localhost:3002"
echo "   Company Service:     http://localhost:3003"
echo "   Deployment Service:  http://localhost:3016"
echo "   Security Service:    http://localhost:3017"
echo "   System Metrics Service: http://localhost:3018"
echo ""
echo "📊 Services de métriques :"
echo "   Metrics Aggregator: http://localhost:3014"
echo "   cAdvisor:           http://localhost:8080/api/v1.3/docker/"
echo "   Prometheus:         http://localhost:9090"
echo ""
echo "🔑 Identifiants de connexion :"
echo "   Email:    admin@jobbingtrack.com"
echo "   Password: SuperAdmin123!"
echo ""
echo "💡 Commandes utiles :"
echo "   make logs           - Voir les logs de tous les services"
echo "   make status         - Voir le statut des services"
echo "   make metrics-test   - Tester le système de métriques"
echo "   make down           - Arrêter tous les services"
echo "   make clean          - Nettoyer complètement"
echo ""
echo "📚 Documentation complète : README.md"
echo "📊 Guide des métriques : METRICS_SYSTEM_README.md"
