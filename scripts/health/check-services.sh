#!/bin/bash

# Script de vérification des services JobbingTrack

echo "🔍 Vérification des services en cours..."

# Vérifier si Docker est en cours d'exécution
if ! docker info >/dev/null 2>&1; then
  echo "❌ Docker n'est pas en cours d'exécution"
  exit 1
fi

# Vérifier les conteneurs en cours d'exécution
echo "\n🔄 Conteneurs en cours d'exécution :"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Vérifier les logs des services principaux
services=("postgres" "redis" "api-gateway" "frontend" "auth-service")

for service in "${services[@]}"; do
  echo "\n📋 Logs de $service :"
  docker logs "jobbingtrack-$service" --tail 20 2>&1
  
  # Vérifier l'état de santé si disponible
  if docker ps --filter "name=jobbingtrack-$service" --format '{{.Status}}' | grep -q "healthy"; then
    echo "✅ $service est en bonne santé"
  else
    echo "⚠️  $service pourrait avoir des problèmes"
  fi
done

# Vérifier les connexions réseau
echo "\n🌐 Vérification des connexions réseau :"

# Vérifier si le frontend est accessible
frontend_port=$(docker ps --filter "name=jobbingtrack-frontend" --format '{{.Ports}}' | grep -oP '\d+->3000/tcp' | cut -d'-' -f1)
if [ -n "$frontend_port" ]; then
  echo "- Frontend accessible sur http://localhost:$frontend_port"
else
  echo "❌ Frontend non accessible"
fi

# Vérifier si l'API Gateway répond
api_port=$(docker ps --filter "name=jobbingtrack-api-gateway" --format '{{.Ports}}' | grep -oP '\d+->3000/tcp' | cut -d'-' -f1)
if [ -n "$api_port" ]; then
  echo "- API Gateway accessible sur http://localhost:$api_port"
  echo "  Test de santé :"
  curl -s "http://localhost:$api_port/health" || echo "  ❌ L'API Gateway ne répond pas"
else
  echo "❌ API Gateway non accessible"
fi

echo "\n✅ Vérification terminée"
