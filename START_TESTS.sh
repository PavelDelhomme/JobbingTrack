#!/bin/bash

echo "🚀 Démarrage des Tests Parcours Utilisateur"
echo "=========================================="
echo ""

cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack

echo "📦 1/4 - Rebuild auth-service avec fix..."
docker-compose build --no-cache auth-service

echo ""
echo "🔄 2/4 - Redémarrage des services..."
docker-compose up -d auth-service api-gateway

echo ""
echo "⏳ 3/4 - Attente (15 secondes)..."
sleep 15

echo ""
echo "✅ 4/4 - Test de connexion..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health)

if [ "$HTTP_CODE" -eq 200 ]; then
    echo ""
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
else
    echo ""
    echo "⚠️  Problème détecté (HTTP $HTTP_CODE)"
    echo ""
    echo "🔧 Solutions :"
    echo "   1. Attendez encore 10 secondes et réessayez"
    echo "   2. Exécutez : make up-for-tests"
    echo "   3. Vérifiez les logs : docker logs jobbingtrack-auth-service"
fi

echo ""
echo "📚 Documentation complète : CORRECTIONS_TERMINEES.md"
echo ""

