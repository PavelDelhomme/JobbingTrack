#!/bin/bash

# ============================================================================
# Script de test pour vérifier la lecture de la version depuis la configuration
# ============================================================================

set -e

echo "🧪 TEST LECTURE VERSION DEPUIS CONFIGURATION"
echo "==========================================="

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

# Fonction pour tester la lecture de la version
test_version_reading() {
    echo ""
    echo "📋 Test de lecture de la version depuis la configuration..."
    
    # Test config.json
    if [ -f "config.json" ]; then
        echo "🔍 Test config.json..."
        VERSION_FROM_CONFIG=$(jq -r '.node.version' config.json)
        echo "Version depuis config.json: $VERSION_FROM_CONFIG"
        
        if [ "$VERSION_FROM_CONFIG" != "null" ] && [ -n "$VERSION_FROM_CONFIG" ]; then
            echo "✅ config.json contient une version valide: $VERSION_FROM_CONFIG"
            ((PASSED_TESTS++))
        else
            echo "❌ config.json ne contient pas de version valide"
            ((FAILED_TESTS++))
        fi
        ((TOTAL_TESTS++))
    else
        echo "⚠️ config.json non trouvé"
    fi
    
    # Test .node-version
    if [ -f ".node-version" ]; then
        echo "🔍 Test .node-version..."
        VERSION_FROM_NODE_VERSION=$(cat .node-version)
        echo "Version depuis .node-version: $VERSION_FROM_NODE_VERSION"
        
        if [ -n "$VERSION_FROM_NODE_VERSION" ]; then
            echo "✅ .node-version contient une version valide: $VERSION_FROM_NODE_VERSION"
            ((PASSED_TESTS++))
        else
            echo "❌ .node-version est vide"
            ((FAILED_TESTS++))
        fi
        ((TOTAL_TESTS++))
    else
        echo "⚠️ .node-version non trouvé"
    fi
    
    # Test .nvmrc
    if [ -f ".nvmrc" ]; then
        echo "🔍 Test .nvmrc..."
        VERSION_FROM_NVMRC=$(cat .nvmrc)
        echo "Version depuis .nvmrc: $VERSION_FROM_NVMRC"
        
        if [ -n "$VERSION_FROM_NVMRC" ]; then
            echo "✅ .nvmrc contient une version valide: $VERSION_FROM_NVMRC"
            ((PASSED_TESTS++))
        else
            echo "❌ .nvmrc est vide"
            ((FAILED_TESTS++))
        fi
        ((TOTAL_TESTS++))
    else
        echo "⚠️ .nvmrc non trouvé"
    fi
}

# Fonction pour tester le script get-node-version.sh
test_script() {
    echo ""
    echo "📜 Test du script get-node-version.sh..."
    
    # Test existence du script
    run_test "Script get-node-version.sh existe" "[ -f scripts/get-node-version.sh ]"
    
    # Test exécution du script
    if [ -f "scripts/get-node-version.sh" ]; then
        run_test "Script get-node-version.sh exécutable" "[ -x scripts/get-node-version.sh ]"
        
        # Test exécution
        echo "🔍 Exécution du script get-node-version.sh..."
        VERSION_FROM_SCRIPT=$(./scripts/get-node-version.sh)
        echo "Version retournée par le script: $VERSION_FROM_SCRIPT"
        
        if [ -n "$VERSION_FROM_SCRIPT" ]; then
            echo "✅ Script retourne une version valide: $VERSION_FROM_SCRIPT"
            ((PASSED_TESTS++))
        else
            echo "❌ Script ne retourne pas de version"
            ((FAILED_TESTS++))
        fi
        ((TOTAL_TESTS++))
    fi
}

# Fonction pour tester la cohérence des versions
test_consistency() {
    echo ""
    echo "🔄 Test de cohérence des versions..."
    
    local versions=()
    
    # Collecter toutes les versions
    if [ -f "config.json" ]; then
        VERSION_CONFIG=$(jq -r '.node.version' config.json 2>/dev/null || echo "")
        if [ "$VERSION_CONFIG" != "null" ] && [ -n "$VERSION_CONFIG" ]; then
            versions+=("$VERSION_CONFIG")
        fi
    fi
    
    if [ -f ".node-version" ]; then
        VERSION_NODE_VERSION=$(cat .node-version 2>/dev/null || echo "")
        if [ -n "$VERSION_NODE_VERSION" ]; then
            versions+=("$VERSION_NODE_VERSION")
        fi
    fi
    
    if [ -f ".nvmrc" ]; then
        VERSION_NVMRC=$(cat .nvmrc 2>/dev/null || echo "")
        if [ -n "$VERSION_NVMRC" ]; then
            versions+=("$VERSION_NVMRC")
        fi
    fi
    
    # Vérifier la cohérence
    if [ ${#versions[@]} -gt 1 ]; then
        local first_version="${versions[0]}"
        local all_same=true
        
        for version in "${versions[@]}"; do
            if [ "$version" != "$first_version" ]; then
                all_same=false
                break
            fi
        done
        
        if [ "$all_same" = true ]; then
            echo "✅ Toutes les versions sont cohérentes: $first_version"
            ((PASSED_TESTS++))
        else
            echo "❌ Versions incohérentes trouvées:"
            for version in "${versions[@]}"; do
                echo "   - $version"
            done
            ((FAILED_TESTS++))
        fi
    else
        echo "ℹ️ Une seule version trouvée, cohérence non applicable"
        ((PASSED_TESTS++))
    fi
    
    ((TOTAL_TESTS++))
}

# Fonction pour générer le rapport
generate_report() {
    echo ""
    echo "📊 RAPPORT DU TEST CONFIGURATION VERSION"
    echo "========================================="
    echo "Total des tests: $TOTAL_TESTS"
    echo "Tests passés: $PASSED_TESTS"
    echo "Tests échoués: $FAILED_TESTS"
    echo ""
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo "🎉 TOUS LES TESTS SONT PASSÉS !"
        echo "✅ La lecture de la version depuis la configuration fonctionne"
        echo "✅ Votre configuration est cohérente et prête"
        echo "🚀 Vous pouvez utiliser la CI/CD avec votre version configurée"
        exit 0
    else
        echo "❌ $FAILED_TESTS TEST(S) ONT ÉCHOUÉ"
        echo "🔧 Corrigez les problèmes de configuration avant de continuer"
        echo ""
        echo "💡 Solutions recommandées:"
        echo "  • Vérifiez que config.json contient .node.version"
        echo "  • Vérifiez que .node-version contient une version"
        echo "  • Vérifiez que .nvmrc contient une version"
        echo "  • Assurez-vous que toutes les versions sont identiques"
        exit 1
    fi
}

# Fonction principale
main() {
    echo "🚀 Démarrage du test configuration version JobbingTrack"
    echo "====================================================="
    
    # Test de lecture de la version
    test_version_reading
    
    # Test du script
    test_script
    
    # Test de cohérence
    test_consistency
    
    # Génération du rapport
    generate_report
}

# Exécution du script
main "$@"
