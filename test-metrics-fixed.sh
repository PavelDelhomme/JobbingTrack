#!/bin/bash

# Script de test du système de métriques corrigé

echo "🔧 Test du système de métriques JobbingTrack (version corrigée)"
echo "=============================================================="

# Vérifier si Docker est en cours d'exécution
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker n'est pas en cours d'exécution"
    echo "💡 Démarrer Docker : systemctl start docker"
    exit 1
fi

echo "✅ Docker est en cours d'exécution"

# Démarrer les services nécessaires
echo ""
echo "🚀 Démarrage des services de monitoring..."

# Démarrer Prometheus, cAdvisor et Grafana
docker-compose up -d prometheus cadvisor grafana

# Attendre que les services démarrent
echo "⏳ Attente du démarrage des services..."
sleep 10

# Vérifier les services de monitoring
echo ""
echo "📊 Vérification des services de monitoring..."

services=("prometheus" "cadvisor" "grafana")
for service in "${services[@]}"; do
    if docker ps --format "table {{.Names}}" | grep -q "$service"; then
        echo "✅ $service - En cours d'exécution"
    else
        echo "❌ $service - Arrêté"
    fi
done

# Démarrer l'API Gateway
echo ""
echo "🌐 Démarrage de l'API Gateway..."
docker-compose up -d api-gateway

# Attendre que l'API Gateway démarre
sleep 5

# Test des endpoints
echo ""
echo "🔗 Test des endpoints..."

# Test de l'API Gateway
echo "Test API Gateway (http://localhost:3000)..."
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ API Gateway - Réponse OK"
else
    echo "❌ API Gateway - Non accessible"
fi

# Test de Prometheus
echo "Test Prometheus (http://localhost:9090)..."
if curl -s http://localhost:9090/-/healthy > /dev/null; then
    echo "✅ Prometheus - Réponse OK"
else
    echo "❌ Prometheus - Non accessible"
fi

# Test de cAdvisor
echo "Test cAdvisor (http://localhost:8080)..."
if curl -s http://localhost:8080/api/v1.3/docker/ > /dev/null; then
    echo "✅ cAdvisor - Réponse OK"
else
    echo "❌ cAdvisor - Non accessible"
fi

# Test de l'endpoint de personnalisation
echo "Test endpoint personnalisation..."
if curl -s -H "Authorization: Bearer test-token" http://localhost:3000/api/v1/users/customization > /dev/null; then
    echo "✅ Endpoint personnalisation - Accessible"
else
    echo "❌ Endpoint personnalisation - Non accessible"
fi

# Test de l'endpoint Prometheus via API Gateway
echo "Test endpoint Prometheus via API Gateway..."
if curl -s -H "Authorization: Bearer test-token" "http://localhost:3000/api/v1/maintenance/metrics/prometheus/query?query=node_cpu_seconds_total" > /dev/null; then
    echo "✅ Endpoint Prometheus - Accessible"
else
    echo "❌ Endpoint Prometheus - Non accessible"
fi

echo ""
echo "📋 Instructions pour tester l'interface:"
echo ""
echo "1. Ouvrir le navigateur à l'adresse: http://localhost:3000"
echo "2. Se connecter avec les identifiants de développement"
echo "3. Aller dans le backoffice pour voir les métriques système"
echo "4. Aller dans la page des services pour voir les métriques détaillées"
echo ""
echo "🎯 Services disponibles:"
echo "• Frontend: http://localhost:3000"
echo "• API Gateway: http://localhost:3000"
echo "• Prometheus: http://localhost:9090"
echo "• Grafana: http://localhost:3000 (admin/admin)"
echo "• cAdvisor: http://localhost:8080"
echo ""
echo "✅ Système de métriques prêt à être testé!"
echo ""
echo "💡 Pour arrêter les services : docker-compose down"
echo "💡 Pour voir les logs : docker-compose logs [service-name]"
