#!/bin/bash

# Script pour résoudre le problème des routes emails non accessibles
# Ce script redémarre l'API Gateway pour charger les nouvelles routes

echo "🔧 Résolution du problème des routes /api/v1/emails/*"
echo ""

# Vérifier que Docker est disponible
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé ou non accessible"
    exit 1
fi

# Vérifier que le conteneur API Gateway existe
if ! docker ps -a | grep -q "jobbingtrack-api-gateway"; then
    echo "❌ Le conteneur jobbingtrack-api-gateway n'existe pas"
    echo "💡 Lancez d'abord : make up"
    exit 1
fi

echo "📋 Étape 1 : Vérification de l'état actuel"
echo "----------------------------------------"
docker ps | grep "api-gateway" || echo "⚠️  API Gateway n'est pas démarré"

echo ""
echo "📋 Étape 2 : Redémarrage de l'API Gateway"
echo "----------------------------------------"
echo "🔄 Redémarrage en cours..."
docker restart jobbingtrack-api-gateway

echo ""
echo "⏳ Attente que le service redémarre (5 secondes)..."
sleep 5

echo ""
echo "📋 Étape 3 : Vérification des logs"
echo "----------------------------------------"
echo "📊 Logs de démarrage :"
docker logs jobbingtrack-api-gateway --tail 30 | grep -E "emails|Routes disponibles" || echo "⚠️  Route emails non trouvée dans les logs"

echo ""
echo "📋 Étape 4 : Test de la route /api/v1/emails/health"
echo "----------------------------------------"
RESPONSE=$(curl -s http://localhost:3000/api/v1/emails/health 2>/dev/null)
if echo "$RESPONSE" | grep -q "success"; then
    echo "✅ Route /api/v1/emails/health fonctionne !"
    echo "📄 Réponse : $RESPONSE"
else
    echo "❌ Route /api/v1/emails/health ne fonctionne pas encore"
    echo "📄 Réponse : $RESPONSE"
    echo ""
    echo "💡 Solutions possibles :"
    echo "   1. Vérifier que le code est bien dans backend/api-gateway/src/server.js (ligne 500)"
    echo "   2. Reconstruire l'image : make rebuild-api-gateway"
    echo "   3. Vérifier les logs : docker logs jobbingtrack-api-gateway --tail 100"
fi

echo ""
echo "✅ Script terminé !"
echo ""
echo "📋 Prochaines étapes :"
echo "   1. Tester les routes depuis le frontend : http://localhost:8080/backoffice/emails"
echo "   2. Vérifier les logs : docker logs jobbingtrack-api-gateway --tail 50"
echo "   3. Si ça ne marche toujours pas, reconstruire : make rebuild-api-gateway"

