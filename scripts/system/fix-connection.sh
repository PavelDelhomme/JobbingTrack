#!/bin/bash

# Script de correction automatique des problèmes de connexion
# Usage: ./scripts/fix-connection.sh

set -e

echo "🔧 Correction automatique des problèmes de connexion..."
echo "==================================================="

# Vérifier que Docker est disponible
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé"
    exit 1
fi

# 1. Nettoyer les conteneurs problématiques
echo "🧹 Nettoyage des conteneurs..."
docker rm -f $(docker ps -aq --filter name=jobbingtrack) 2>/dev/null || true

# 2. Nettoyer les volumes
docker volume prune -f

# 3. Redémarrer les services essentiels
echo "🚀 Redémarrage des services essentiels..."
cd backend && docker-compose up -d postgres redis

# 4. Attendre que PostgreSQL soit prêt
echo "⏳ Attente de PostgreSQL..."
sleep 15

# 5. Vérifier que PostgreSQL est accessible
echo "🔍 Vérification de PostgreSQL..."
if ! docker-compose exec postgres psql -U jobbingtrack -d jobbingtrack -c "SELECT 1" > /dev/null 2>&1; then
    echo "❌ PostgreSQL n'est pas accessible après redémarrage"
    exit 1
fi
echo "✅ PostgreSQL est accessible"

# 6. Démarrer les autres services
echo "🌐 Démarrage des services backend..."
docker-compose up -d auth-service api-gateway

# 7. Créer l'utilisateur admin
echo "👤 Création de l'utilisateur administrateur..."
./scripts/create-admin-user.sh

# 8. Vérifier que la connexion fonctionne
echo "🔍 Test de la connexion..."
if curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@jobbingtrack.com","password":"test123"}' \
  | grep -q '"success":true'; then

    echo "✅ Connexion restaurée avec succès !"
    echo ""
    echo "🌐 Vous pouvez maintenant accéder à :"
    echo "   Frontend: http://localhost:8080"
    echo "   API Gateway: http://localhost:3000"
    echo ""
    echo "🔑 Identifiants :"
    echo "   Email: admin@jobbingtrack.com"
    echo "   Mot de passe: SuperAdmin123!"
else
    echo "❌ Problème persistant de connexion"
    echo "💡 Essayez : make fix"
    exit 1
fi
