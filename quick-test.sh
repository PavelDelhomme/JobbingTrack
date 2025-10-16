#!/bin/bash

# Script de test rapide du système

echo "🚀 Test rapide du système JobbingTrack"
echo "====================================="

# Vérifier si Docker est en cours d'exécution
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker n'est pas en cours d'exécution"
    exit 1
fi

echo "✅ Docker est en cours d'exécution"

# Vérifier les services essentiels
echo ""
echo "📊 Vérification des services..."

services=("prometheus" "cadvisor" "api-gateway")
for service in "${services[@]}"; do
    if docker ps --format "table {{.Names}}" | grep -q "$service"; then
        echo "✅ $service - En cours d'exécution"
    else
        echo "❌ $service - Arrêté"
    fi
done

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

echo ""
echo "📋 Instructions pour tester l'interface:"
echo ""
echo "1. Ouvrir le navigateur à l'adresse: http://localhost:3000"
echo "2. Se connecter avec les identifiants de développement"
echo "3. Aller dans le backoffice pour voir les métriques"
echo ""
echo "🎯 Services disponibles:"
echo "• Frontend: http://localhost:3000"
echo "• API Gateway: http://localhost:3000"
echo "• Prometheus: http://localhost:9090"
echo "• cAdvisor: http://localhost:8080"
echo ""
echo "✅ Test rapide terminé!"
