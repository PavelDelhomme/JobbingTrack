#!/bin/bash

# ============================================================================
# Script de test pour vérifier la version Node.js spécifique
# ============================================================================

set -e

echo "🧪 TEST VERSION NODE.JS SPÉCIFIQUE"
echo "=================================="

# Variables
REQUIRED_NODE_VERSION="20.19.5"
REQUIRED_NPM_VERSION="10.9.0"
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

# Fonction pour vérifier la version Node.js
check_node_version() {
    echo ""
    echo "🔍 Vérification de la version Node.js..."
    
    local current_version=$(node --version | sed 's/v//')
    echo "Version actuelle: $current_version"
    echo "Version requise: $REQUIRED_NODE_VERSION"
    
    if [ "$current_version" = "$REQUIRED_NODE_VERSION" ]; then
        echo "✅ Version Node.js correcte: $current_version"
        ((PASSED_TESTS++))
    else
        echo "❌ Version Node.js incorrecte: $current_version (requise: $REQUIRED_NODE_VERSION)"
        echo "💡 Installez Node.js $REQUIRED_NODE_VERSION avec nvm ou directement"
        ((FAILED_TESTS++))
    fi
    
    ((TOTAL_TESTS++))
}

# Fonction pour vérifier la version npm
check_npm_version() {
    echo ""
    echo "🔍 Vérification de la version npm..."
    
    local current_version=$(npm --version)
    echo "Version npm actuelle: $current_version"
    
    if [ "$current_version" = "$REQUIRED_NPM_VERSION" ]; then
        echo "✅ Version npm correcte: $current_version"
        ((PASSED_TESTS++))
    else
        echo "⚠️ Version npm différente: $current_version (recommandée: $REQUIRED_NPM_VERSION)"
        echo "ℹ️ La version npm peut varier, ce n'est pas critique"
        ((PASSED_TESTS++))  # On considère comme acceptable
    fi
    
    ((TOTAL_TESTS++))
}

# Fonction pour tester l'installation des dépendances
test_dependencies() {
    echo ""
    echo "📦 Test des dépendances avec Node.js $REQUIRED_NODE_VERSION..."
    
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
    echo "🏗️ Test du build avec Node.js $REQUIRED_NODE_VERSION..."
    
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
    echo "📜 Test des scripts avec Node.js $REQUIRED_NODE_VERSION..."
    
    # Test des scripts de test
    run_test "Script test-backend" "[ -x scripts/test-backend.sh ]"
    run_test "Script test-frontend" "[ -x scripts/test-frontend.sh ]"
    run_test "Script test-integration" "[ -x scripts/test-integration.sh ]"
    run_test "Script run-all-tests" "[ -x scripts/run-all-tests.sh ]"
}

# Fonction pour tester la configuration
test_configuration() {
    echo ""
    echo "⚙️ Test de la configuration avec Node.js $REQUIRED_NODE_VERSION..."
    
    # Test des fichiers de configuration
    run_test "Workflow CI/CD" "[ -f .github/workflows/ci-cd.yml ]"
    run_test "Test version Node.js" "[ -f .github/workflows/test-node-version.yml ]"
    run_test "Docker Compose backend" "[ -f backend/docker-compose.yml ]"
    run_test "Docker Compose frontend" "[ -f frontend/docker-compose.frontend.yml ]"
    run_test "Configuration Jest" "[ -f frontend/jest.config.js ]"
    run_test "Configuration Playwright" "[ -f frontend/playwright.config.ts ]"
}

# Fonction pour tester les tests
test_tests() {
    echo ""
    echo "🧪 Test des tests avec Node.js $REQUIRED_NODE_VERSION..."
    
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
    echo "📊 RAPPORT DU TEST VERSION NODE.JS"
    echo "==================================="
    echo "Version Node.js requise: $REQUIRED_NODE_VERSION"
    echo "Version Node.js actuelle: $(node --version)"
    echo "Version npm actuelle: $(npm --version)"
    echo ""
    echo "Total des tests: $TOTAL_TESTS"
    echo "Tests passés: $PASSED_TESTS"
    echo "Tests échoués: $FAILED_TESTS"
    echo ""
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo "🎉 TOUS LES TESTS SONT PASSÉS !"
        echo "✅ Node.js $REQUIRED_NODE_VERSION fonctionne parfaitement"
        echo "✅ Votre environnement est prêt pour la CI/CD"
        echo "🚀 Vous pouvez pousser votre code en toute confiance"
        exit 0
    else
        echo "❌ $FAILED_TESTS TEST(S) ONT ÉCHOUÉ"
        echo "🔧 Corrigez les problèmes avant de pousser"
        echo ""
        echo "💡 Solutions recommandées:"
        echo "  • Installez Node.js $REQUIRED_NODE_VERSION avec nvm"
        echo "  • Vérifiez que npm est à jour"
        echo "  • Relancez le script après correction"
        exit 1
    fi
}

# Fonction principale
main() {
    echo "🚀 Démarrage du test version Node.js JobbingTrack"
    echo "================================================"
    
    # Vérifier la version Node.js
    check_node_version
    
    # Vérifier la version npm
    check_npm_version
    
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
