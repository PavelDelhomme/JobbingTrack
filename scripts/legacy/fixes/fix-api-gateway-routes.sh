#!/bin/bash

# Script pour résoudre le problème des routes /api/v1/emails/* non accessibles
# Ce script reconstruit l'image API Gateway et redémarre le service

set -e

echo "🔧 Résolution du problème des routes /api/v1/emails/*"
echo ""

# Vérifier que Docker est disponible
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé ou non accessible"
    exit 1
fi

# Vérifier que le code est bien présent
if ! grep -q "/api/v1/emails" backend/api-gateway/src/server.js; then
    echo "❌ La route /api/v1/emails n'est pas dans backend/api-gateway/src/server.js"
    echo "💡 Vérifiez que le code a été commité"
    exit 1
fi

echo "✅ Code vérifié : route /api/v1/emails présente dans server.js (ligne 500)"
echo ""

echo "📋 Étape 1 : Arrêt de l'API Gateway"
echo "----------------------------------------"
docker stop jobbingtrack-api-gateway 2>/dev/null || echo "⚠️  Conteneur déjà arrêté"

echo ""
echo "📋 Étape 2 : Suppression de l'ancienne image"
echo "----------------------------------------"
docker rmi jobbingtrack-api-gateway 2>/dev/null || echo "⚠️  Image non trouvée (normal si première fois)"

echo ""
echo "📋 Étape 3 : Reconstruction de l'image API Gateway"
echo "----------------------------------------"
echo "🔨 Build en cours (cela peut prendre quelques minutes)..."
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrackProject/JobbingTrack
docker-compose build api-gateway

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de la reconstruction de l'image"
    echo "💡 Essayez manuellement : docker-compose build api-gateway"
    exit 1
fi

echo ""
echo "📋 Étape 4 : Redémarrage de l'API Gateway"
echo "----------------------------------------"
docker-compose up -d api-gateway

echo ""
echo "⏳ Attente que le service démarre (10 secondes)..."
sleep 10

echo ""
echo "📋 Étape 5 : Vérification des logs"
echo "----------------------------------------"
echo "📊 Logs de démarrage :"
docker logs jobbingtrack-api-gateway --tail 50 | grep -E "emails|Routes disponibles" || echo "⚠️  Route emails non trouvée dans les logs"

echo ""
echo "📋 Étape 6 : Test de la route /api/v1/emails/health"
echo "----------------------------------------"
RESPONSE=$(curl -s http://localhost:3000/api/v1/emails/health 2>/dev/null || echo "ERROR")
if echo "$RESPONSE" | grep -q "success"; then
    echo "✅ Route /api/v1/emails/health fonctionne !"
    echo "📄 Réponse : $RESPONSE"
    echo ""
    echo "🎉 SUCCÈS ! Les routes emails sont maintenant accessibles"
else
    echo "❌ Route /api/v1/emails/health ne fonctionne pas encore"
    echo "📄 Réponse : $RESPONSE"
    echo ""
    echo "💡 Solutions possibles :"
    echo "   1. Vérifier les logs : docker logs jobbingtrack-api-gateway --tail 100"
    echo "   2. Vérifier que le code est bien dans backend/api-gateway/src/server.js"
    echo "   3. Redémarrer tous les services : make restart"
    exit 1
fi

echo ""
echo "✅ Script terminé avec succès !"
echo ""
echo "📋 Prochaines étapes :"
echo "   1. Tester les routes depuis le frontend : http://localhost:8080/backoffice/emails"
echo "   2. Vérifier que les stats s'affichent correctement"
echo "   3. Tester l'envoi d'un email de test"

