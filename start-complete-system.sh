#!/bin/bash

# Script de démarrage complet du système JobbingTrack avec métriques

echo "🚀 Démarrage complet du système JobbingTrack avec métriques"
echo "==========================================================="

# Vérifier si Docker est en cours d'exécution
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker n'est pas en cours d'exécution"
    echo "💡 Démarrer Docker : systemctl start docker"
    exit 1
fi

echo "✅ Docker est en cours d'exécution"

# Arrêter tous les conteneurs existants
echo ""
echo "🛑 Arrêt des conteneurs existants..."
docker-compose down

# Démarrer tous les services avec monitoring
echo ""
echo "🚀 Démarrage de tous les services avec monitoring..."

# Démarrer la stack complète avec monitoring
docker-compose up -d

# Attendre que les services démarrent
echo ""
echo "⏳ Attente du démarrage des services..."
echo "   Cela peut prendre quelques minutes..."
sleep 30

# Vérifier que les services essentiels sont démarrés
echo ""
echo "📊 Vérification des services démarrés..."

essential_services=("postgres" "redis" "api-gateway" "prometheus" "cadvisor" "grafana")
for service in "${essential_services[@]}"; do
    if docker ps --format "table {{.Names}}" | grep -q "$service"; then
        echo "✅ $service - En cours d'exécution"
    else
        echo "❌ $service - Arrêté"
    fi
done

# Vérifier quelques services backend
echo ""
echo "🔧 Vérification des services backend..."

backend_services=("auth-service" "application-service" "company-service")
for service in "${backend_services[@]}"; do
    if docker ps --format "table {{.Names}}" | grep -q "jobbingtrack-$service"; then
        echo "✅ $service - En cours d'exécution"
    else
        echo "❌ $service - Arrêté"
    fi
done

# Test des endpoints essentiels
echo ""
echo "🔗 Test des endpoints essentiels..."

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

# Test de Grafana
echo "Test Grafana (http://localhost:4000)..."
if curl -s http://localhost:4000/api/health > /dev/null; then
    echo "✅ Grafana - Réponse OK"
else
    echo "❌ Grafana - Non accessible"
fi

# Test des nouveaux endpoints
echo ""
echo "🔗 Test des nouveaux endpoints..."

# Test de l'endpoint de personnalisation
echo "Test endpoint personnalisation..."
if curl -s -H "Authorization: Bearer test-token" http://localhost:3000/api/v1/users/customization > /dev/null; then
    echo "✅ Endpoint personnalisation - Accessible"
else
    echo "❌ Endpoint personnalisation - Non accessible"
fi

# Test de l'endpoint des services
echo "Test endpoint services..."
if curl -s -H "Authorization: Bearer test-token" http://localhost:3000/api/v1/services > /dev/null; then
    echo "✅ Endpoint services - Accessible"
else
    echo "❌ Endpoint services - Non accessible"
fi

# Test de l'endpoint Prometheus via API Gateway
echo "Test endpoint Prometheus via API Gateway..."
if curl -s -H "Authorization: Bearer test-token" "http://localhost:3000/api/v1/maintenance/metrics/prometheus/query?query=node_cpu_seconds_total" > /dev/null; then
    echo "✅ Endpoint Prometheus - Accessible"
else
    echo "❌ Endpoint Prometheus - Non accessible"
fi

echo ""
echo "📋 Résumé des services disponibles :"
echo ""
echo "🌐 Interface Web :"
echo "• Frontend: http://localhost:3000"
echo "• Grafana: http://localhost:4000 (admin/admin)"
echo ""
echo "📊 Monitoring :"
echo "• Prometheus: http://localhost:9090"
echo "• cAdvisor: http://localhost:8080"
echo "• AlertManager: http://localhost:9097"
echo ""
echo "🔧 Services Backend :"
echo "• API Gateway: http://localhost:3000"
echo "• Auth Service: http://localhost:3001"
echo "• Application Service: http://localhost:3002"
echo "• Company Service: http://localhost:3003"
echo "• Contact Service: http://localhost:3004"
echo "• Interview Service: http://localhost:3005"
echo "• Notification Service: http://localhost:3006"
echo "• Dashboard Service: http://localhost:3007"
echo "• Call Service: http://localhost:3008"
echo "• Profile Service: http://localhost:3009"
echo "• Event Service: http://localhost:3011"
echo "• FollowUp Service: http://localhost:3012"
echo "• Workflow Service: http://localhost:3013"
echo "• Docker Stats Service: http://localhost:3015"
echo ""
echo "💾 Base de données :"
echo "• PostgreSQL: localhost:5432"
echo "• Redis: localhost:6379"
echo ""
echo "✅ Système démarré avec succès!"
echo ""
echo "🎯 Instructions pour utiliser l'interface :"
echo "1. Ouvrir http://localhost:3000"
echo "2. Se connecter avec les identifiants de développement"
echo "3. Aller dans le backoffice pour voir TOUS les services"
echo "4. Vérifier les métriques système et de conteneurs"
echo "5. Tester les boutons de redémarrage et logs des services"
echo ""
echo "📈 Monitoring recommandé :"
echo "• Prometheus: http://localhost:9090"
echo "• Grafana: http://localhost:4000"
echo "• cAdvisor: http://localhost:8080"
echo ""
echo "💡 Pour arrêter : docker-compose down"
echo "💡 Pour voir les logs : docker-compose logs [service-name]"
