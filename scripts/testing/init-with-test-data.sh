#!/bin/bash

# Script d'initialisation avec données de test
# Génère automatiquement des données de test cohérentes au démarrage

echo "🚀 Initialisation avec données de test..."

# Vérifier si les services sont démarrés
echo "🔍 Vérification des services..."
if ! docker ps | grep -q postgres; then
    echo "❌ PostgreSQL n'est pas démarré"
    echo "💡 Exécutez d'abord: make up"
    exit 1
fi

if ! docker ps | grep -q redis; then
    echo "❌ Redis n'est pas démarré"
    echo "💡 Exécutez d'abord: make up"
    exit 1
fi

# Attendre que les services soient prêts
echo "⏳ Attente que les services soient prêts..."
sleep 10

# Vérifier la connectivité de la base de données
echo "🔗 Test de connectivité base de données..."
if ! node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => {
    console.log('✅ Base de données connectée');
    process.exit(0);
  })
  .catch((e) => {
    console.log('❌ Erreur de connexion:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.\$disconnect());
" 2>/dev/null; then
    echo "❌ Impossible de se connecter à la base de données"
    echo "💡 Vérifiez la configuration dans .env"
    exit 1
fi

# Générer des données de test
echo "🎲 Génération des données de test..."
node scripts/testing/generate-default-test-data.js

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Initialisation terminée avec succès !"
    echo ""
    echo "🔐 Comptes de test créés :"
    echo "   1. user1@jobbingtrack.com (SUPER_ADMIN) - password123"
    echo "   2. user2@jobbingtrack.com (ADMIN) - password123"
    echo "   3. user3@jobbingtrack.com (USER) - password123"
    echo "   4. user4@jobbingtrack.com (USER) - password123"
    echo ""
    echo "📊 Données générées :"
    echo "   - 4 utilisateurs avec différents rôles"
    echo "   - 8 entreprises (Google, Microsoft, etc.)"
    echo "   - 12 candidatures avec différents statuts"
    echo "   - 10 contacts liés aux entreprises"
    echo "   - 4 entretiens planifiés"
    echo "   - 6 relances actives"
    echo "   - 4 appels effectués"
    echo "   - 8 événements créés"
    echo ""
    echo "🚀 Prêt pour les tests !"
    echo ""
    echo "🧪 Pour lancer les tests :"
    echo "   make test-quick      # Tests rapides"
    echo "   make test-e2e        # Tests E2E"
    echo "   make test-all        # Suite complète"
    echo ""
    echo "🎭 Interface admin :"
    echo "   http://localhost:8080/backoffice/playwright-tests"
else
    echo "❌ Erreur lors de la génération des données de test"
    exit 1
fi
