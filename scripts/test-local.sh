#!/bin/bash

# ============================================================================
# Script de test local pour vérifier la CI/CD avant push
# ============================================================================

set -e

echo "🧪 TEST LOCAL - VÉRIFICATION CI/CD"
echo "=================================="

# Variables
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Fonction pour exécuter un test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo "🔍 Test: $test_name"
    
    if eval "$test_command" 2>/dev/null; then
        echo "✅ $test_name: RÉUSSI"
        ((PASSED_TESTS++))
    else
        echo "❌ $test_name: ÉCHOUÉ"
        ((FAILED_TESTS++))
    fi
    
    ((TOTAL_TESTS++))
}

# Fonction pour vérifier les prérequis
check_prerequisites() {
    echo "🔍 Vérification des prérequis..."
    
    # Vérifier Node.js
    if command -v node >/dev/null 2>&1; then
        echo "✅ Node.js installé: $(node --version)"
    else
        echo "❌ Node.js non installé"
        exit 1
    fi
    
    # Vérifier npm
    if command -v npm >/dev/null 2>&1; then
        echo "✅ npm installé: $(npm --version)"
    else
        echo "❌ npm non installé"
        exit 1
    fi
    
    # Vérifier Docker
    if command -v docker >/dev/null 2>&1; then
        echo "✅ Docker installé: $(docker --version)"
    else
        echo "❌ Docker non installé"
        exit 1
    fi
    
    # Vérifier Docker Compose
    if command -v docker-compose >/dev/null 2>&1 || docker compose version >/dev/null 2>&1; then
        echo "✅ Docker Compose installé"
    else
        echo "❌ Docker Compose non installé"
        exit 1
    fi
}

# Fonction pour tester l'installation des dépendances
test_dependencies() {
    echo ""
    echo "📦 Test des dépendances..."
    
    # Test frontend
    run_test "Installation frontend" "cd frontend && npm ci --prefer-offline --no-audit"
    
    # Test backend (premier service trouvé)
    if [ -d "backend" ]; then
        for service in backend/*/; do
            if [ -f "$service/package.json" ]; then
                service_name=$(basename "$service")
                run_test "Installation $service_name" "cd '$service' && npm ci --prefer-offline --no-audit"
                break
            fi
        done
    fi
}

# Fonction pour tester le build
test_build() {
    echo ""
    echo "🏗️ Test du build..."
    
    # Test build frontend
    run_test "Build frontend" "cd frontend && npm run build"
    
    # Test build backend (premier service trouvé)
    if [ -d "backend" ]; then
        for service in backend/*/; do
            if [ -f "$service/package.json" ] && [ -f "$service/Dockerfile" ]; then
                service_name=$(basename "$service")
                run_test "Build Docker $service_name" "cd '$service' && docker build -t test-$service_name ."
                break
            fi
        done
    fi
}

# Fonction pour tester les scripts
test_scripts() {
    echo ""
    echo "📜 Test des scripts..."
    
    # Test des scripts de test
    run_test "Script test-backend" "[ -x scripts/test-backend.sh ]"
    run_test "Script test-frontend" "[ -x scripts/test-frontend.sh ]"
    run_test "Script test-integration" "[ -x scripts/test-integration.sh ]"
    run_test "Script run-all-tests" "[ -x scripts/run-all-tests.sh ]"
}

# Fonction pour tester la configuration
test_configuration() {
    echo ""
    echo "⚙️ Test de la configuration..."
    
    # Test des fichiers de configuration
    run_test "Workflow CI/CD" "[ -f .github/workflows/ci-cd.yml ]"
    run_test "Docker Compose backend" "[ -f backend/docker-compose.yml ]"
    run_test "Docker Compose frontend" "[ -f frontend/docker-compose.frontend.yml ]"
    run_test "Configuration Jest" "[ -f frontend/jest.config.js ]"
    run_test "Configuration Playwright" "[ -f frontend/playwright.config.ts ]"
}

# Fonction pour tester les tests
test_tests() {
    echo ""
    echo "🧪 Test des tests..."
    
    # Test Jest (si configuré)
    if [ -f "frontend/jest.config.js" ]; then
        run_test "Tests Jest" "cd frontend && npm run test:ci"
    else
        echo "ℹ️ Jest non configuré, test ignoré"
    fi
    
    # Test Playwright (si configuré)
    if [ -f "frontend/playwright.config.ts" ]; then
        run_test "Installation Playwright" "cd frontend && npx playwright install --with-deps"
    else
        echo "ℹ️ Playwright non configuré, test ignoré"
    fi
}

# Fonction pour générer le rapport
generate_report() {
    echo ""
    echo "📊 RAPPORT DU TEST LOCAL"
    echo "========================="
    echo "Total des tests: $TOTAL_TESTS"
    echo "Tests passés: $PASSED_TESTS"
    echo "Tests échoués: $FAILED_TESTS"
    echo ""
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo "🎉 TOUS LES TESTS SONT PASSÉS !"
        echo "✅ Votre environnement est prêt pour la CI/CD"
        echo "🚀 Vous pouvez pousser votre code en toute confiance"
        exit 0
    else
        echo "❌ $FAILED_TESTS TEST(S) ONT ÉCHOUÉ"
        echo "🔧 Corrigez les problèmes avant de pousser"
        exit 1
    fi
}

# Fonction principale
main() {
    echo "🚀 Démarrage du test local JobbingTrack"
    echo "======================================="
    
    # Vérifier les prérequis
    check_prerequisites
    
    # Tests des dépendances
    test_dependencies
    
    # Tests du build
    test_build
    
    # Tests des scripts
    test_scripts
    
    # Tests de la configuration
    test_configuration
    
    # Tests des tests
    test_tests
    
    # Génération du rapport
    generate_report
}

# Exécution du script
main "$@"
