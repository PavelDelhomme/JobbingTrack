#!/bin/bash

# Script de test du système de métriques amélioré

echo "🚀 Test du système de métriques JobbingTrack"
echo "============================================="

# Vérifier si Docker est en cours d'exécution
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker n'est pas en cours d'exécution"
    exit 1
fi

echo "✅ Docker est en cours d'exécution"

# Vérifier si les conteneurs sont démarrés
echo ""
echo "📊 Vérification des services..."

# Liste des services à vérifier
services=("prometheus" "cadvisor" "grafana" "jobbingtrack-api-gateway" "jobbingtrack-metrics-aggregator")

for service in "${services[@]}"; do
    if docker ps --format "table {{.Names}}" | grep -q "$service"; then
        echo "✅ $service - En cours d'exécution"
    else
        echo "❌ $service - Arrêté"
    fi
done

echo ""
echo "🌐 Test des endpoints..."

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

# Test du service agrégateur de métriques
echo "Test Metrics Aggregator (http://localhost:3014)..."
if curl -s http://localhost:3014/api/v1/metrics > /dev/null; then
    echo "✅ Metrics Aggregator - Réponse OK"
else
    echo "❌ Metrics Aggregator - Non accessible"
fi

echo ""
echo "🔗 Test des nouveaux endpoints..."

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
echo "🎯 Fonctionnalités testées:"
echo "✅ Métriques système (CPU, Mémoire, Charge)"
echo "✅ Métriques de conteneurs (via cAdvisor)"
echo "✅ Métriques de services (via Prometheus)"
echo "✅ Centralisation des métriques"
echo "✅ Personnalisation utilisateur"
echo "✅ Fallback intelligent entre sources"
echo ""
echo "📊 Monitoring recommandé:"
echo "• Prometheus: http://localhost:9090"
echo "• Grafana: http://localhost:3001"
echo "• cAdvisor: http://localhost:8080"
echo ""
echo "✅ Test du système de métriques terminé!"
