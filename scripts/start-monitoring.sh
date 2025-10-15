#!/bin/bash

# Script pour démarrer tous les services de monitoring
echo "🚀 Démarrage des services de monitoring..."

# Démarrer cAdvisor
echo "📊 Démarrage de cAdvisor..."
docker-compose up -d cadvisor

# Attendre que cAdvisor soit prêt
echo "⏳ Attente du démarrage de cAdvisor..."
sleep 10

# Démarrer Prometheus
echo "📈 Démarrage de Prometheus..."
docker-compose up -d prometheus

# Attendre que Prometheus soit prêt
echo "⏳ Attente du démarrage de Prometheus..."
sleep 15

# Démarrer le service de métriques agrégateur
echo "🔧 Démarrage du service de métriques agrégateur..."
docker-compose up -d metrics-aggregator-service

# Attendre que tous les services soient prêts
echo "⏳ Attente du démarrage complet des services..."
sleep 10

# Vérifier que les services sont accessibles
echo "🔍 Vérification des services de monitoring..."

# Vérifier cAdvisor
if curl -s http://localhost:8080/api/v1.3/docker/ > /dev/null; then
    echo "✅ cAdvisor est accessible sur http://localhost:8080"
else
    echo "❌ cAdvisor n'est pas accessible sur http://localhost:8080"
fi

# Vérifier Prometheus
if curl -s http://localhost:9090/api/v1/query?query=up > /dev/null; then
    echo "✅ Prometheus est accessible sur http://localhost:9090"
else
    echo "❌ Prometheus n'est pas accessible sur http://localhost:9090"
fi

# Vérifier le service de métriques agrégateur
if curl -s http://localhost:3014/api/v1/metrics > /dev/null; then
    echo "✅ Service de métriques agrégateur est accessible sur http://localhost:3014"
else
    echo "❌ Service de métriques agrégateur n'est pas accessible sur http://localhost:3014"
fi

echo ""
echo "🎯 Services de monitoring démarrés !"
echo ""
echo "📊 Accès aux interfaces :"
echo "   • cAdvisor: http://localhost:8080"
echo "   • Prometheus: http://localhost:9090"
echo "   • Métriques API: http://localhost:3014/api/v1/metrics"
echo ""
echo "📈 Pour voir les métriques Prometheus :"
echo "   • Interface web: http://localhost:9090"
echo "   • Requête UP: http://localhost:9090/api/v1/query?query=up"
echo "   • Targets: http://localhost:9090/targets"
