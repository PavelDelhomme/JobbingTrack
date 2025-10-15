#!/bin/bash

# Script pour démarrer complètement le système de monitoring avec tous les services
echo "🚀 Démarrage complet du système de monitoring JobbingTrack..."

echo ""
echo "📋 Vérification de Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé ou accessible"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé ou accessible"
    exit 1
fi

echo "✅ Docker et Docker Compose sont disponibles"

echo ""
echo "🏗️  Construction des images personnalisées..."
docker-compose build --parallel

echo ""
echo "📊 Démarrage des services de base..."
# Démarrer seulement les services essentiels d'abord
docker-compose up -d postgres redis

# Attendre que PostgreSQL soit prêt
echo "⏳ Attente du démarrage de PostgreSQL..."
sleep 20

echo ""
echo "🔧 Démarrage des services backend..."
# Démarrer les services backend
docker-compose up -d api-gateway auth-service application-service company-service contact-service interview-service notification-service dashboard-service call-service event-service followup-service profile-service workflow-service

# Attendre que les services backend soient prêts
echo "⏳ Attente du démarrage des services backend..."
sleep 30

echo ""
echo "📈 Démarrage des services de monitoring..."
# Démarrer les services de monitoring
./scripts/start-monitoring.sh

echo ""
echo "🎯 Système de monitoring complètement démarré !"
echo ""
echo "🌐 Interfaces disponibles :"
echo "   📊 Dashboard : http://localhost:3000/backoffice"
echo "   📈 Prometheus : http://localhost:9090"
echo "   🔍 cAdvisor : http://localhost:8080"
echo "   🔧 API Métriques : http://localhost:3014/api/v1/metrics"
echo ""
echo "🧪 Test des métriques :"
echo "   ./scripts/test-metrics.sh"
echo ""
echo "📋 Commandes utiles :"
echo "   • docker-compose logs -f [service-name] : Voir les logs d'un service"
echo "   • docker-compose ps : Voir l'état de tous les services"
echo "   • docker-compose down : Arrêter tous les services"
