#!/bin/bash

# Script de démarrage avec le système de métriques
# Ce script démarre tous les services avec le Metrics Aggregator et cAdvisor

echo "🚀 Démarrage de JobbingTrack avec le système de métriques..."

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

# Vérifier si Docker Compose est installé
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

# Construire les images si nécessaire
echo "🔨 Construction des images Docker..."
docker-compose build --parallel

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de la construction des images"
    exit 1
fi

# Démarrer tous les services
echo "▶️  Démarrage de tous les services..."
docker-compose up -d

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors du démarrage des services"
    exit 1
fi

# Attendre que les services soient prêts
echo "⏳ Attente du démarrage des services..."
sleep 10

# Vérifier l'état des services principaux
echo "🔍 Vérification de l'état des services..."

# Vérifier le Metrics Aggregator
if curl -f http://localhost:3014/api/v1/health &>/dev/null; then
    echo "✅ Metrics Aggregator Service : OK (http://localhost:3014)"
else
    echo "❌ Metrics Aggregator Service : NON ACCESSIBLE"
fi

# Vérifier cAdvisor
if curl -f http://localhost:8080/api/v1.3/docker/ &>/dev/null; then
    echo "✅ cAdvisor : OK (http://localhost:8080)"
else
    echo "❌ cAdvisor : NON ACCESSIBLE"
fi

# Vérifier quelques services backend
services=("auth-service:3001" "application-service:3002" "company-service:3003")
for service in "${services[@]}"; do
    IFS=':' read -r service_name port <<< "$service"
    if curl -f "http://localhost:$port/api/v1/${service_name%%-service}/health" &>/dev/null; then
        echo "✅ $service_name : OK (http://localhost:$port)"
    else
        echo "❌ $service_name : NON ACCESSIBLE"
    fi
done

# Vérifier le frontend
if curl -f http://localhost:3000/health &>/dev/null; then
    echo "✅ Frontend : OK (http://localhost:3000)"
else
    echo "❌ Frontend : NON ACCESSIBLE"
fi

echo ""
echo "🎉 Système démarré avec succès !"
echo ""
echo "📊 Services disponibles :"
echo "   • Dashboard admin : http://localhost:3000/backoffice"
echo "   • API Gateway : http://localhost:3000/api/v1"
echo "   • Metrics Aggregator : http://localhost:3014"
echo "   • cAdvisor : http://localhost:8080"
echo ""
echo "🔧 Pour arrêter tous les services : docker-compose down"
echo "📈 Pour voir les logs : docker-compose logs -f [service-name]"
