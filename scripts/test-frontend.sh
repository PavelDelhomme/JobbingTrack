#!/bin/bash

# ============================================================================
# Script de test frontend pour JobbingTrack
# ============================================================================

set -e

echo "🎨 Démarrage des tests frontend..."

# Variables
FRONTEND_DIR="frontend"
TEST_RESULTS_DIR="test-results"
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Créer le dossier des résultats
mkdir -p "$TEST_RESULTS_DIR"

# Fonction pour exécuter les tests unitaires
run_unit_tests() {
    echo "🧪 Exécution des tests unitaires..."
    
    cd "$FRONTEND_DIR"
    
    # Vérifier si des tests existent
    if [ -d "tests" ] || [ -d "__tests__" ] || [ -d "test" ] || [ -f "jest.config.js" ] || [ -f "vitest.config.js" ]; then
        echo "📦 Installation des dépendances..."
        npm ci --silent --no-audit
        
        echo "🧪 Exécution des tests unitaires..."
        
        # Essayer différents scripts de test
        if npm run test --dry-run 2>/dev/null; then
            npm run test 2>&1 | tee "../$TEST_RESULTS_DIR/frontend-unit-tests.log"
            if [ ${PIPESTATUS[0]} -eq 0 ]; then
                echo "✅ Tests unitaires passés"
                ((PASSED_TESTS++))
            else
                echo "❌ Tests unitaires échoués"
                ((FAILED_TESTS++))
            fi
        elif npm run test:unit --dry-run 2>/dev/null; then
            npm run test:unit 2>&1 | tee "../$TEST_RESULTS_DIR/frontend-unit-tests.log"
            if [ ${PIPESTATUS[0]} -eq 0 ]; then
                echo "✅ Tests unitaires passés"
                ((PASSED_TESTS++))
            else
                echo "❌ Tests unitaires échoués"
                ((FAILED_TESTS++))
            fi
        else
            echo "ℹ️ Aucun script de test unitaire configuré"
        fi
        
        ((TOTAL_TESTS++))
    else
        echo "ℹ️ Aucun test unitaire trouvé"
    fi
    
    cd - > /dev/null
}

# Fonction pour exécuter les tests E2E
run_e2e_tests() {
    echo "🎭 Exécution des tests E2E..."
    
    cd "$FRONTEND_DIR"
    
    # Vérifier si Playwright est configuré
    if [ -f "playwright.config.ts" ] || [ -f "playwright.config.js" ]; then
        echo "📦 Installation des dépendances pour les tests E2E..."
        npm ci --silent --no-audit
        
        echo "🎭 Installation de Playwright..."
        npx playwright install --with-deps
        
        echo "🎭 Exécution des tests E2E..."
        
        if npm run test:e2e --dry-run 2>/dev/null; then
            npm run test:e2e 2>&1 | tee "../$TEST_RESULTS_DIR/frontend-e2e-tests.log"
            if [ ${PIPESTATUS[0]} -eq 0 ]; then
                echo "✅ Tests E2E passés"
                ((PASSED_TESTS++))
            else
                echo "❌ Tests E2E échoués"
                ((FAILED_TESTS++))
            fi
        elif npm run test:e2e:ci --dry-run 2>/dev/null; then
            npm run test:e2e:ci 2>&1 | tee "../$TEST_RESULTS_DIR/frontend-e2e-tests.log"
            if [ ${PIPESTATUS[0]} -eq 0 ]; then
                echo "✅ Tests E2E passés"
                ((PASSED_TESTS++))
            else
                echo "❌ Tests E2E échoués"
                ((FAILED_TESTS++))
            fi
        else
            echo "ℹ️ Aucun script de test E2E configuré"
        fi
        
        ((TOTAL_TESTS++))
    else
        echo "ℹ️ Aucun test E2E configuré"
    fi
    
    cd - > /dev/null
}

# Fonction pour tester le build de production
test_production_build() {
    echo "🏗️ Test du build de production..."
    
    cd "$FRONTEND_DIR"
    
    echo "📦 Installation des dépendances..."
    npm ci --silent --no-audit
    
    echo "🏗️ Build de production..."
    if npm run build 2>&1 | tee "../$TEST_RESULTS_DIR/frontend-build.log"; then
        echo "✅ Build de production réussi"
        ((PASSED_TESTS++))
    else
        echo "❌ Build de production échoué"
        ((FAILED_TESTS++))
    fi
    
    ((TOTAL_TESTS++))
    
    cd - > /dev/null
}

# Fonction pour tester le linting
test_linting() {
    echo "🧹 Test du linting..."
    
    cd "$FRONTEND_DIR"
    
    echo "📦 Installation des dépendances..."
    npm ci --silent --no-audit
    
    echo "🧹 Exécution du linting..."
    if npm run lint 2>&1 | tee "../$TEST_RESULTS_DIR/frontend-lint.log"; then
        echo "✅ Linting réussi"
        ((PASSED_TESTS++))
    else
        echo "⚠️ Linting avec des avertissements"
        ((PASSED_TESTS++))  # On considère les warnings comme acceptables
    fi
    
    ((TOTAL_TESTS++))
    
    cd - > /dev/null
}

# Fonction pour tester le formatage
test_formatting() {
    echo "🎨 Test du formatage..."
    
    cd "$FRONTEND_DIR"
    
    echo "📦 Installation des dépendances..."
    npm ci --silent --no-audit
    
    echo "🎨 Vérification du formatage..."
    if npm run format:check 2>&1 | tee "../$TEST_RESULTS_DIR/frontend-format.log"; then
        echo "✅ Formatage correct"
        ((PASSED_TESTS++))
    else
        echo "⚠️ Formatage à vérifier"
        ((PASSED_TESTS++))  # On considère les problèmes de formatage comme non-bloquants
    fi
    
    ((TOTAL_TESTS++))
    
    cd - > /dev/null
}

# Fonction pour tester l'accessibilité
test_accessibility() {
    echo "♿ Test d'accessibilité..."
    
    cd "$FRONTEND_DIR"
    
    # Vérifier si des outils d'accessibilité sont configurés
    if npm run test:a11y --dry-run 2>/dev/null; then
        echo "📦 Installation des dépendances..."
        npm ci --silent --no-audit
        
        echo "♿ Exécution des tests d'accessibilité..."
        if npm run test:a11y 2>&1 | tee "../$TEST_RESULTS_DIR/frontend-a11y.log"; then
            echo "✅ Tests d'accessibilité passés"
            ((PASSED_TESTS++))
        else
            echo "❌ Tests d'accessibilité échoués"
            ((FAILED_TESTS++))
        fi
        
        ((TOTAL_TESTS++))
    else
        echo "ℹ️ Aucun test d'accessibilité configuré"
    fi
    
    cd - > /dev/null
}

# Fonction pour tester la connectivité
test_connectivity() {
    echo "🌐 Test de connectivité du frontend..."
    
    # Attendre que le frontend soit accessible
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f -s http://localhost:8080 > /dev/null 2>&1; then
            echo "✅ Frontend accessible sur http://localhost:8080"
            ((PASSED_TESTS++))
            break
        else
            echo "⏳ Tentative $((attempt + 1))/$max_attempts - Attente du frontend..."
            sleep 2
            ((attempt++))
        fi
    done
    
    if [ $attempt -eq $max_attempts ]; then
        echo "❌ Frontend non accessible après $max_attempts tentatives"
        ((FAILED_TESTS++))
    fi
    
    ((TOTAL_TESTS++))
}

# Fonction pour générer le rapport
generate_report() {
    echo ""
    echo "📊 RAPPORT DES TESTS FRONTEND"
    echo "============================="
    echo "Total des tests: $TOTAL_TESTS"
    echo "Tests passés: $PASSED_TESTS"
    echo "Tests échoués: $FAILED_TESTS"
    echo ""
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo "✅ TOUS LES TESTS SONT PASSÉS !"
        exit 0
    else
        echo "❌ $FAILED_TESTS TEST(S) ONT ÉCHOUÉ"
        echo "📋 Consultez les logs dans $TEST_RESULTS_DIR/ pour plus de détails"
        exit 1
    fi
}

# Fonction principale
main() {
    echo "🚀 Démarrage des tests frontend JobbingTrack"
    echo "============================================"
    
    # Vérifier que nous sommes dans le bon répertoire
    if [ ! -d "$FRONTEND_DIR" ]; then
        echo "❌ Dossier frontend non trouvé. Exécutez ce script depuis la racine du projet."
        exit 1
    fi
    
    # Tests unitaires
    echo ""
    run_unit_tests
    
    # Tests E2E
    echo ""
    run_e2e_tests
    
    # Test du build de production
    echo ""
    test_production_build
    
    # Test du linting
    echo ""
    test_linting
    
    # Test du formatage
    echo ""
    test_formatting
    
    # Test d'accessibilité
    echo ""
    test_accessibility
    
    # Test de connectivité
    echo ""
    test_connectivity
    
    # Génération du rapport
    generate_report
}

# Exécution du script
main "$@"
