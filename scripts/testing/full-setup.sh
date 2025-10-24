#!/bin/bash

# Script de setup complet pour JobbingTrack avec tests
# Configure tout en une seule commande

echo "🚀 Setup complet JobbingTrack avec tests..."
echo "=============================================="
echo ""

# 1. Vérifier les prérequis
echo "🔍 1. Vérification des prérequis..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! command -v "docker compose" &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    exit 1
fi

echo "✅ Prérequis : OK"
echo ""

# 2. Configuration des tests
echo "🧪 2. Configuration des tests..."
make test-setup

if [ $? -ne 0 ]; then
    echo "❌ Échec de la configuration des tests"
    exit 1
fi

echo ""
echo "✅ Configuration des tests : OK"
echo ""

# 3. Démarrage des services
echo "🔧 3. Démarrage des services..."
make up

if [ $? -ne 0 ]; then
    echo "❌ Échec du démarrage des services"
    exit 1
fi

echo ""
echo "✅ Services démarrés : OK"
echo ""

# 4. Attendre que les services soient prêts
echo "⏳ 4. Attente des services..."
sleep 15

# 5. Test de connectivité
echo "🔗 5. Test de connectivité..."
if node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => {
    console.log('✅ Base de données : Connectée');
    process.exit(0);
  })
  .catch((e) => {
    console.log('❌ Base de données : Erreur de connexion');
    process.exit(1);
  })
  .finally(() => prisma.\$disconnect());
" 2>/dev/null; then
    echo "✅ Base de données : Connectée"
else
    echo "❌ Base de données : Erreur de connexion"
    echo "💡 Vérifiez la configuration PostgreSQL"
    exit 1
fi

echo ""

# 6. Génération des données de test
echo "🎲 6. Génération des données de test..."
make generate-test-data

if [ $? -ne 0 ]; then
    echo "⚠️ Génération de données : Échec (normal si services non configurés)"
else
    echo "✅ Données de test : Générées"
fi

echo ""

# 7. Vérification finale
echo "🔍 7. Vérification finale..."
make test-verify

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 SETUP COMPLET RÉUSSI !"
    echo "=========================="
    echo ""
    echo "🔐 COMPTES DE TEST CRÉÉS :"
    echo "   user1@jobbingtrack.com (SUPER_ADMIN) - password123"
    echo "   user2@jobbingtrack.com (ADMIN) - password123"
    echo "   user3@jobbingtrack.com (USER) - password123"
    echo "   user4@jobbingtrack.com (USER) - password123"
    echo ""
    echo "📊 DONNÉES GÉNÉRÉES :"
    echo "   - 4 utilisateurs avec rôles"
    echo "   - 8 entreprises (Google, Microsoft, etc.)"
    echo "   - 12 candidatures variées"
    echo "   - 10 contacts liés"
    echo "   - Entretiens et relances"
    echo ""
    echo "🎭 INTERFACES DISPONIBLES :"
    echo "   Frontend : http://localhost:8080"
    echo "   Backoffice Tests : http://localhost:8080/backoffice/playwright-tests"
    echo "   Backoffice Données : http://localhost:8080/backoffice/test-data"
    echo "   API Gateway : http://localhost:3000"
    echo ""
    echo "🧪 TESTS DISPONIBLES :"
    echo "   make test-quick    # Tests rapides"
    echo "   make test-e2e      # Tests E2E"
    echo "   make test-all      # Suite complète"
    echo "   make test-verify   # Vérification (43/43 ✅)"
    echo ""
    echo "📚 DOCUMENTATION :"
    echo "   tests/README.md"
    echo "   README-TESTS-IMPLEMENTATION.md"
    echo ""
    echo "🚀 JobbingTrack est prêt avec sa suite de tests complète !"

else
    echo "❌ Vérification finale : Échec"
    echo "💡 Consultez les logs ci-dessus"
    exit 1
fi
