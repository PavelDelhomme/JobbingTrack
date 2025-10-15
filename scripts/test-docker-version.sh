#!/bin/bash

# ============================================================================
# Script de test pour vérifier la lecture de la version depuis les Dockerfiles
# ============================================================================

set -e

echo "🧪 TEST LECTURE VERSION DEPUIS DOCKERFILES"
echo "========================================="

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

# Fonction pour tester la lecture de la version depuis les Dockerfiles
test_dockerfile_reading() {
    echo ""
    echo "📋 Test de lecture de la version depuis les Dockerfiles..."
    
    # Test backend Dockerfiles
    if [ -d "backend" ]; then
        echo "🔍 Test Dockerfiles backend..."
        BACKEND_DOCKERFILES=$(find backend -name "Dockerfile" 2>/dev/null | wc -l)
        echo "Dockerfiles backend trouvés: $BACKEND_DOCKERFILES"
        
        if [ "$BACKEND_DOCKERFILES" -gt 0 ]; then
            BACKEND_VERSION=$(grep -r "FROM node:" backend/*/Dockerfile 2>/dev/null | head -1 | sed 's/.*node:\([^-]*\).*/\1/' || echo "")
            echo "Version backend trouvée: $BACKEND_VERSION"
            
            if [ -n "$BACKEND_VERSION" ]; then
                echo "✅ Version backend trouvée: $BACKEND_VERSION"
                ((PASSED_TESTS++))
            else
                echo "❌ Aucune version backend trouvée"
                ((FAILED_TESTS++))
            fi
        else
            echo "⚠️ Aucun Dockerfile backend trouvé"
        fi
        ((TOTAL_TESTS++))
    else
        echo "⚠️ Dossier backend non trouvé"
    fi
    
    # Test frontend Dockerfile
    if [ -f "frontend/Dockerfile" ]; then
        echo "🔍 Test Dockerfile frontend..."
        FRONTEND_VERSION=$(grep "FROM node:" frontend/Dockerfile 2>/dev/null | sed 's/.*node:\([^-]*\).*/\1/' || echo "")
        echo "Version frontend trouvée: $FRONTEND_VERSION"
        
        if [ -n "$FRONTEND_VERSION" ]; then
            echo "✅ Version frontend trouvée: $FRONTEND_VERSION"
            ((PASSED_TESTS++))
        else
            echo "❌ Aucune version frontend trouvée"
            ((FAILED_TESTS++))
        fi
        ((TOTAL_TESTS++))
    else
        echo "⚠️ Dockerfile frontend non trouvé"
    fi
}

# Fonction pour tester le script get-docker-node-version.sh
test_script() {
    echo ""
    echo "📜 Test du script get-docker-node-version.sh..."
    
    # Test existence du script
    run_test "Script get-docker-node-version.sh existe" "[ -f scripts/get-docker-node-version.sh ]"
    
    # Test exécution du script
    if [ -f "scripts/get-docker-node-version.sh" ]; then
        run_test "Script get-docker-node-version.sh exécutable" "[ -x scripts/get-docker-node-version.sh ]"
        
        # Test exécution
        echo "🔍 Exécution du script get-docker-node-version.sh..."
        VERSION_FROM_SCRIPT=$(./scripts/get-docker-node-version.sh)
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
    echo "🔄 Test de cohérence des versions Dockerfiles..."
    
    local versions=()
    
    # Collecter toutes les versions des Dockerfiles
    if [ -d "backend" ]; then
        BACKEND_VERSION=$(grep -r "FROM node:" backend/*/Dockerfile 2>/dev/null | head -1 | sed 's/.*node:\([^-]*\).*/\1/' || echo "")
        if [ -n "$BACKEND_VERSION" ]; then
            versions+=("$BACKEND_VERSION")
        fi
    fi
    
    if [ -f "frontend/Dockerfile" ]; then
        FRONTEND_VERSION=$(grep "FROM node:" frontend/Dockerfile 2>/dev/null | sed 's/.*node:\([^-]*\).*/\1/' || echo "")
        if [ -n "$FRONTEND_VERSION" ]; then
            versions+=("$FRONTEND_VERSION")
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
            echo "✅ Toutes les versions Dockerfiles sont cohérentes: $first_version"
            ((PASSED_TESTS++))
        else
            echo "❌ Versions Dockerfiles incohérentes trouvées:"
            for version in "${versions[@]}"; do
                echo "   - $version"
            done
            ((FAILED_TESTS++))
        fi
    else
        echo "ℹ️ Une seule version Dockerfile trouvée, cohérence non applicable"
        ((PASSED_TESTS++))
    fi
    
    ((TOTAL_TESTS++))
}

# Fonction pour générer le rapport
generate_report() {
    echo ""
    echo "📊 RAPPORT DU TEST DOCKERFILES VERSION"
    echo "======================================"
    echo "Total des tests: $TOTAL_TESTS"
    echo "Tests passés: $PASSED_TESTS"
    echo "Tests échoués: $FAILED_TESTS"
    echo ""
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo "🎉 TOUS LES TESTS SONT PASSÉS !"
        echo "✅ La lecture de la version depuis les Dockerfiles fonctionne"
        echo "✅ Votre configuration Docker est cohérente et prête"
        echo "🚀 Vous pouvez utiliser la CI/CD avec la version de vos conteneurs"
        exit 0
    else
        echo "❌ $FAILED_TESTS TEST(S) ONT ÉCHOUÉ"
        echo "🔧 Corrigez les problèmes de configuration Docker avant de continuer"
        echo ""
        echo "💡 Solutions recommandées:"
        echo "  • Vérifiez que vos Dockerfiles contiennent 'FROM node:X'"
        echo "  • Assurez-vous que toutes les versions sont identiques"
        echo "  • Vérifiez que le script get-docker-node-version.sh est exécutable"
        exit 1
    fi
}

# Fonction principale
main() {
    echo "🚀 Démarrage du test Dockerfiles version JobbingTrack"
    echo "==================================================="
    
    # Test de lecture de la version
    test_dockerfile_reading
    
    # Test du script
    test_script
    
    # Test de cohérence
    test_consistency
    
    # Génération du rapport
    generate_report
}

# Exécution du script
main "$@"
