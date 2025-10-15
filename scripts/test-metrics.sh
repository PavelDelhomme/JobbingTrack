#!/bin/bash

# Script pour tester les services de métriques
echo "🔍 Test des services de métriques..."

echo ""
echo "📊 1. Test de cAdvisor..."
if curl -s http://localhost:8080/api/v1.3/docker/ > /dev/null; then
    echo "✅ cAdvisor répond correctement"
    echo "   📈 Données disponibles : $(curl -s http://localhost:8080/api/v1.3/docker/ | jq '. | length') conteneurs détectés"
else
    echo "❌ cAdvisor ne répond pas sur http://localhost:8080"
fi

echo ""
echo "📈 2. Test de Prometheus..."
if curl -s http://localhost:9090/api/v1/query?query=up > /dev/null; then
    echo "✅ Prometheus répond correctement"

    # Tester la requête UP
    UP_COUNT=$(curl -s http://localhost:9090/api/v1/query?query=up | jq '.data.result | length')
    echo "   📊 Services UP détectés : $UP_COUNT"

    # Lister les targets
    echo "   🎯 Targets configurés :"
    curl -s http://localhost:9090/api/v1/targets | jq -r '.data.activeTargets[].discoveredLabels.job' | sort | uniq -c | sed 's/^/      • /'
else
    echo "❌ Prometheus ne répond pas sur http://localhost:9090"
fi

echo ""
echo "🔧 3. Test du service de métriques agrégateur..."
if curl -s http://localhost:3014/api/v1/metrics > /dev/null; then
    echo "✅ Service de métriques agrégateur répond correctement"

    # Afficher un aperçu des données
    SERVICES_COUNT=$(curl -s http://localhost:3014/api/v1/metrics | jq '.services | length')
    echo "   📊 Services surveillés : $SERVICES_COUNT"

    # Lister les services surveillés
    echo "   🎯 Services surveillés :"
    curl -s http://localhost:3014/api/v1/metrics | jq -r '.services | keys[]' | sed 's/^/      • /'
else
    echo "❌ Service de métriques agrégateur ne répond pas sur http://localhost:3014"
fi

echo ""
echo "🌐 4. Test des endpoints /metrics des services..."
SERVICES=("api-gateway:3000" "auth-service:3001" "application-service:3002")

for service in "${SERVICES[@]}"; do
    IFS=':' read -r service_name port <<< "$service"
    if curl -s "http://localhost:$port/metrics" > /dev/null; then
        echo "✅ $service_name expose des métriques sur /metrics"
    else
        echo "❌ $service_name n'expose pas de métriques sur /metrics"
    fi
done

echo ""
echo "🎯 Test terminé !"
echo ""
echo "💡 Conseils :"
echo "   • Interface Prometheus : http://localhost:9090"
echo "   • Interface cAdvisor : http://localhost:8080"
echo "   • API des métriques : http://localhost:3014/api/v1/metrics"
