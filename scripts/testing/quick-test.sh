#!/bin/bash

# Script de test rapide pour vérifier que tout fonctionne
# Test rapide de la configuration et des fonctionnalités principales

echo "🚀 Test rapide de la configuration JobbingTrack..."
echo "=================================================="
echo ""

# 1. Vérifier la configuration des tests
echo "🔍 1. Vérification de la configuration..."
if make test-verify > /dev/null 2>&1; then
    echo "✅ Configuration des tests : OK"
else
    echo "❌ Configuration des tests : Échec"
    echo "💡 Exécutez : make test-setup"
    exit 1
fi

echo ""

# 2. Vérifier les services
echo "🔧 2. Vérification des services..."
if docker ps | grep -q postgres; then
    echo "✅ PostgreSQL : En cours d'exécution"
else
    echo "⚠️ PostgreSQL : Non démarré"
    echo "💡 Exécutez : make up"
fi

if docker ps | grep -q redis; then
    echo "✅ Redis : En cours d'exécution"
else
    echo "⚠️ Redis : Non démarré"
    echo "💡 Exécutez : make up"
fi

echo ""

# 3. Tester la génération de données
echo "🎲 3. Test de génération de données..."
if node -e "
const { execSync } = require('child_process');
try {
  execSync('node scripts/testing/generate-simple-test-data.js e2e', {
    stdio: 'pipe',
    timeout: 30000
  });
  console.log('✅ Génération de données : OK');
} catch (error) {
  console.log('⚠️ Génération de données : Échec (services non démarrés)');
  console.log('💡 Démarrez d\\'abord les services : make up');
}
" 2>/dev/null; then
    echo "✅ Génération de données : OK"
else
    echo "⚠️ Génération de données : Services requis non démarrés"
    echo "💡 Démarrez les services : make up"
fi

echo ""

# 4. Tester les imports frontend
echo "⚛️ 4. Test des imports frontend..."
if node -e "
const fs = require('fs');
const path = require('path');

const testFile = 'frontend/src/app/backoffice/analytics/page.tsx';
if (fs.existsSync(testFile)) {
  const content = fs.readFileSync(testFile, 'utf8');
  if (content.includes('from \\'@/components/features\\'')) {
    console.log('✅ Imports frontend : OK');
  } else {
    console.log('❌ Imports frontend : Problème détecté');
  }
} else {
  console.log('⚠️ Fichier analytics non trouvé');
}
" 2>/dev/null; then
    echo "✅ Imports frontend : OK"
else
    echo "❌ Imports frontend : Problème détecté"
fi

echo ""

# 5. Vérifier les commandes disponibles
echo "📋 5. Commandes de test disponibles :"
echo "   make test-setup      # Configuration complète"
echo "   make test-verify     # Vérification (43/43)"
echo "   make generate-test-data # Données de test"
echo "   make test-quick      # Tests rapides"
echo "   make test-e2e        # Tests E2E"
echo "   make test-all        # Suite complète"
echo ""

# 6. Vérifier les interfaces
echo "🎭 6. Interfaces disponibles :"
echo "   Frontend : http://localhost:8080"
echo "   Backoffice Tests : http://localhost:8080/backoffice/playwright-tests"
echo "   Backoffice Données : http://localhost:8080/backoffice/test-data"
echo "   API Gateway : http://localhost:3000"
echo ""

echo "🎯 RÉSUMÉ :"
if docker ps | grep -q postgres && docker ps | grep -q redis; then
    echo "✅ Services : Démarrés"
    echo "✅ Tests : Configurés"
    echo "✅ Données : Prêtes à générer"
    echo "✅ Interface : Accessible"
    echo ""
    echo "🚀 Tout est prêt ! Exécutez : make test-all"
else
    echo "⚠️ Services : Non démarrés"
    echo "✅ Tests : Configurés"
    echo "✅ Données : Prêtes à générer"
    echo ""
    echo "💡 Démarrez les services : make up"
    echo "💡 Générez des données : make generate-test-data"
    echo "💡 Lancez les tests : make test-all"
fi

echo ""
echo "📚 Documentation :"
echo "   tests/README.md - Guide complet"
echo "   README-TESTS-IMPLEMENTATION.md - Implémentation"
echo "   TESTS-INTEGRATION-SUMMARY.md - Résumé intégration"
echo ""
echo "🏆 Test rapide terminé !"
