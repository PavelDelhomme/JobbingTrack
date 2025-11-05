#!/bin/bash

echo "🚀 Démarrage des Tests Parcours Utilisateur"
echo "=========================================="
echo ""

cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack

echo "📦 1/3 - Rebuild auth-service avec fix..."
docker-compose build --no-cache auth-service

echo ""
echo "🔄 2/3 - Démarrage de TOUS les services nécessaires..."
make up-for-tests

echo ""
echo "⏳ 3/3 - Attente que tous les services soient prêts (30 secondes)..."
sleep 30

echo ""
echo "✅ Vérification des services..."

# Test API Gateway
API_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null)
echo "   API Gateway (port 3000): $API_CODE"

# Test Frontend
FRONTEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 2>/dev/null)
echo "   Frontend (port 8080): $FRONTEND_CODE"

echo ""

if [ "$FRONTEND_CODE" -eq 200 ] || [ "$FRONTEND_CODE" -eq 304 ]; then
    echo "✅ =================================="
    echo "✅ TOUT EST PRÊT !"
    echo "✅ =================================="
    echo ""
    echo "🌐 Ouvrez dans votre navigateur :"
    echo "   http://localhost:8080/backoffice/user-journey"
    echo ""
    echo "🔑 Identifiants :"
    echo "   Email:    admin@jobbingtrack.test"
    echo "   Password: password123"
    echo ""
    echo "📊 Cliquez sur 'Lancer le parcours' pour tester !"
    echo ""
elif [ "$API_CODE" -eq 200 ]; then
    echo "⚠️  API Gateway OK mais Frontend pas encore prêt"
    echo ""
    echo "🔧 Solutions :"
    echo "   1. Attendez encore 20 secondes et ouvrez :"
    echo "      http://localhost:8080/backoffice/user-journey"
    echo ""
    echo "   2. Ou vérifiez les logs :"
    echo "      docker logs jobbingtrack-frontend"
else
    echo "⚠️  Services pas encore prêts"
    echo ""
    echo "🔧 Solutions :"
    echo "   1. Attendez 30 secondes de plus"
    echo "   2. Vérifiez l'état : docker ps"
    echo "   3. Voir les logs : make logs"
fi

echo ""
echo "📚 Documentation complète : GUIDE_COMPLET.md"
echo ""
