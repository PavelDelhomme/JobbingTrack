#!/bin/bash

# ============================================================================
# Script principal pour exécuter tous les tests JobbingTrack
# ============================================================================

set -e

echo "🚀 DÉMARRAGE DE TOUS LES TESTS JOBBINGTRACK"
echo "=========================================="

# Variables
SCRIPTS_DIR="scripts"
TEST_RESULTS_DIR="test-results"
TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_SUITES=0

# Créer le dossier des résultats
mkdir -p "$TEST_RESULTS_DIR"

# Fonction pour exécuter un script de test
run_test_suite() {
    local suite_name="$1"
    local script_path="$2"
    
    echo ""
    echo "🧪 Exécution de la suite de tests: $suite_name"
    echo "=============================================="
    
    if [ -f "$script_path" ] && [ -x "$script_path" ]; then
        if bash "$script_path" 2>&1 | tee "$TEST_RESULTS_DIR/${suite_name}.log"; then
            echo "✅ $suite_name: TOUS LES TESTS SONT PASSÉS"
            ((PASSED_SUITES++))
        else
            echo "❌ $suite_name: CERTAINS TESTS ONT ÉCHOUÉ"
            ((FAILED_SUITES++))
        fi
    else
        echo "⚠️ $suite_name: Script non trouvé ou non exécutable ($script_path)"
        ((FAILED_SUITES++))
    fi
    
    ((TOTAL_SUITES++))
}

# Fonction pour vérifier les prérequis
check_prerequisites() {
    echo "🔍 Vérification des prérequis..."
    
    local missing_deps=()
    
    # Vérifier Docker
    if ! command -v docker >/dev/null 2>&1; then
        missing_deps+=("docker")
    fi
    
    # Vérifier Docker Compose
    if ! command -v docker-compose >/dev/null 2>&1 && ! command -v docker >/dev/null 2>&1; then
        missing_deps+=("docker-compose")
    fi
    
    # Vérifier Node.js
    if ! command -v node >/dev/null 2>&1; then
        missing_deps+=("node")
    fi
    
    # Vérifier npm
    if ! command -v npm >/dev/null 2>&1; then
        missing_deps+=("npm")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        echo "❌ Dépendances manquantes: ${missing_deps[*]}"
        echo "💡 Installez les dépendances manquantes avant de continuer"
        exit 1
    fi
    
    echo "✅ Toutes les dépendances sont installées"
}

# Fonction pour nettoyer l'environnement
cleanup_environment() {
    echo "🧹 Nettoyage de l'environnement..."
    
    # Arrêter tous les conteneurs JobbingTrack
    docker ps -q --filter "name=jobbingtrack" | xargs -r docker stop 2>/dev/null || true
    docker ps -aq --filter "name=jobbingtrack" | xargs -r docker rm 2>/dev/null || true
    
    # Nettoyer les réseaux
    docker network ls -q --filter "name=jobbingtrack" | xargs -r docker network rm 2>/dev/null || true
    
    echo "✅ Environnement nettoyé"
}

# Fonction pour générer le rapport final
generate_final_report() {
    echo ""
    echo "📊 RAPPORT FINAL DE TOUS LES TESTS"
    echo "=================================="
    echo "Total des suites de tests: $TOTAL_SUITES"
    echo "Suites passées: $PASSED_SUITES"
    echo "Suites échouées: $FAILED_SUITES"
    echo ""
    
    if [ $FAILED_SUITES -eq 0 ]; then
        echo "🎉 FÉLICITATIONS ! TOUS LES TESTS SONT PASSÉS !"
        echo "✅ Le projet JobbingTrack est prêt pour la production"
        echo "🚀 Vous pouvez procéder au déploiement en toute confiance"
        exit 0
    else
        echo "❌ $FAILED_SUITES SUITE(S) DE TESTS ONT ÉCHOUÉ"
        echo "🔧 Vérifiez les logs dans $TEST_RESULTS_DIR/ pour plus de détails"
        echo "💡 Corrigez les problèmes avant de continuer"
        exit 1
    fi
}

# Fonction pour afficher l'aide
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --backend-only     Exécuter seulement les tests backend"
    echo "  --frontend-only    Exécuter seulement les tests frontend"
    echo "  --integration-only Exécuter seulement les tests d'intégration"
    echo "  --skip-cleanup     Ne pas nettoyer l'environnement après les tests"
    echo "  --help            Afficher cette aide"
    echo ""
    echo "Exemples:"
    echo "  $0                           # Exécuter tous les tests"
    echo "  $0 --backend-only            # Tests backend seulement"
    echo "  $0 --frontend-only           # Tests frontend seulement"
    echo "  $0 --integration-only        # Tests d'intégration seulement"
}

# Fonction principale
main() {
    local backend_only=false
    local frontend_only=false
    local integration_only=false
    local skip_cleanup=false
    
    # Analyser les arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --backend-only)
                backend_only=true
                shift
                ;;
            --frontend-only)
                frontend_only=true
                shift
                ;;
            --integration-only)
                integration_only=true
                shift
                ;;
            --skip-cleanup)
                skip_cleanup=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                echo "❌ Option inconnue: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Vérifier les prérequis
    check_prerequisites
    
    # Nettoyer l'environnement
    if [ "$skip_cleanup" = false ]; then
        cleanup_environment
    fi
    
    # Exécuter les tests selon les options
    if [ "$backend_only" = true ]; then
        run_test_suite "Backend" "$SCRIPTS_DIR/test-backend.sh"
    elif [ "$frontend_only" = true ]; then
        run_test_suite "Frontend" "$SCRIPTS_DIR/test-frontend.sh"
    elif [ "$integration_only" = true ]; then
        run_test_suite "Integration" "$SCRIPTS_DIR/test-integration.sh"
    else
        # Exécuter tous les tests
        run_test_suite "Backend" "$SCRIPTS_DIR/test-backend.sh"
        run_test_suite "Frontend" "$SCRIPTS_DIR/test-frontend.sh"
        run_test_suite "Integration" "$SCRIPTS_DIR/test-integration.sh"
    fi
    
    # Nettoyer l'environnement
    if [ "$skip_cleanup" = false ]; then
        cleanup_environment
    fi
    
    # Générer le rapport final
    generate_final_report
}

# Gestion des signaux pour le nettoyage
trap 'if [ "$skip_cleanup" = false ]; then cleanup_environment; fi' EXIT INT TERM

# Exécution du script
main "$@"
