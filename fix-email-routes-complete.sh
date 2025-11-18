#!/bin/bash

# Script complet pour résoudre le problème des routes /api/v1/emails/*

set -e

echo "🔧 Résolution complète du problème des routes /api/v1/emails/*"
echo "================================================================"
echo ""

# Vérifier que Docker est disponible
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé"
    exit 1
fi

# Vérifier que le code est bien présent
echo "📋 Étape 1 : Vérification du code"
echo "----------------------------------------"
if ! grep -q "/api/v1/emails" backend/api-gateway/src/server.js; then
    echo "❌ La route /api/v1/emails n'est pas dans backend/api-gateway/src/server.js"
    exit 1
fi
echo "✅ API Gateway : route /api/v1/emails présente (ligne 500)"

if [ ! -f "backend/auth-service/src/routes/email.routes.js" ]; then
    echo "❌ Le fichier backend/auth-service/src/routes/email.routes.js n'existe pas"
    exit 1
fi
echo "✅ Auth Service : fichier email.routes.js présent"

if ! grep -q "router.get('/health'" backend/auth-service/src/routes/email.routes.js; then
    echo "❌ La route /health n'est pas dans email.routes.js"
    exit 1
fi
echo "✅ Auth Service : route /health présente dans email.routes.js"

if ! grep -q "app.use('/api/v1/emails'" backend/auth-service/src/server.js; then
    echo "❌ La route /api/v1/emails n'est pas enregistrée dans server.js"
    exit 1
fi
echo "✅ Auth Service : route /api/v1/emails enregistrée dans server.js (ligne 80)"
echo ""

# Arrêter les services
echo "📋 Étape 2 : Arrêt des services"
echo "----------------------------------------"
echo "🛑 Arrêt de auth-service..."
docker stop jobbingtrack-auth-service 2>/dev/null || echo "⚠️  Conteneur déjà arrêté"

echo "🛑 Arrêt de api-gateway..."
docker stop jobbingtrack-api-gateway 2>/dev/null || echo "⚠️  Conteneur déjà arrêté"
echo ""

# Supprimer les anciennes images
echo "📋 Étape 3 : Suppression des anciennes images"
echo "----------------------------------------"
echo "🗑️  Suppression de l'image auth-service..."
docker rmi jobbingtrack-auth-service 2>/dev/null || echo "⚠️  Image non trouvée (normal si première fois)"

echo "🗑️  Suppression de l'image api-gateway..."
docker rmi jobbingtrack-api-gateway 2>/dev/null || echo "⚠️  Image non trouvée (normal si première fois)"
echo ""

# Reconstruire les images
echo "📋 Étape 4 : Reconstruction des images"
echo "----------------------------------------"
echo "🔨 Build auth-service en cours..."
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrackProject/JobbingTrack
docker-compose build --no-cache auth-service

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de la reconstruction de auth-service"
    exit 1
fi

echo "🔨 Build api-gateway en cours..."
docker-compose build --no-cache api-gateway

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de la reconstruction de api-gateway"
    exit 1
fi
echo ""

# Redémarrer les services
echo "📋 Étape 5 : Redémarrage des services"
echo "----------------------------------------"
echo "🚀 Démarrage de auth-service..."
docker-compose up -d auth-service

echo "⏳ Attente que auth-service démarre (5 secondes)..."
sleep 5

echo "🚀 Démarrage de api-gateway..."
docker-compose up -d api-gateway

echo "⏳ Attente que api-gateway démarre (5 secondes)..."
sleep 5
echo ""

# Vérification
echo "📋 Étape 6 : Vérification"
echo "----------------------------------------"
echo "📊 Logs auth-service (dernières lignes) :"
docker logs jobbingtrack-auth-service --tail 20 | grep -E "emails|Routes|Route" || echo "⚠️  Aucun log emails trouvé"

echo ""
echo "📊 Logs api-gateway (dernières lignes) :"
docker logs jobbingtrack-api-gateway --tail 20 | grep -E "emails|Routes" || echo "⚠️  Aucun log emails trouvé"

echo ""
echo "📋 Étape 7 : Test de la route"
echo "----------------------------------------"
echo "🧪 Test direct auth-service :"
RESPONSE_AUTH=$(curl -s http://localhost:8001/api/v1/emails/health 2>/dev/null || echo "ERROR")
if echo "$RESPONSE_AUTH" | grep -q "success"; then
    echo "✅ Route /api/v1/emails/health fonctionne dans auth-service !"
    echo "📄 Réponse : $RESPONSE_AUTH"
else
    echo "❌ Route /api/v1/emails/health ne fonctionne pas dans auth-service"
    echo "📄 Réponse : $RESPONSE_AUTH"
fi

echo ""
echo "🧪 Test via API Gateway :"
RESPONSE_GATEWAY=$(curl -s http://localhost:3000/api/v1/emails/health 2>/dev/null || echo "ERROR")
if echo "$RESPONSE_GATEWAY" | grep -q "success"; then
    echo "✅ Route /api/v1/emails/health fonctionne via API Gateway !"
    echo "📄 Réponse : $RESPONSE_GATEWAY"
    echo ""
    echo "🎉 SUCCÈS ! Les routes emails sont maintenant accessibles"
else
    echo "❌ Route /api/v1/emails/health ne fonctionne pas via API Gateway"
    echo "📄 Réponse : $RESPONSE_GATEWAY"
    echo ""
    echo "💡 Solutions possibles :"
    echo "   1. Vérifier les logs : docker logs jobbingtrack-auth-service --tail 100"
    echo "   2. Vérifier les logs : docker logs jobbingtrack-api-gateway --tail 100"
    echo "   3. Vérifier que le code est bien dans les fichiers"
    exit 1
fi

echo ""
echo "✅ Script terminé avec succès !"

