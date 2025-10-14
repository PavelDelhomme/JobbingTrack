#!/bin/bash

# Script pour exécuter facilement les tests d'export/import
# Usage: ./scripts/run-export-import-tests.sh [options]

set -e

echo "🧪 Tests Playwright - Export/Import et Gestion des Données"
echo "========================================================"

# Fonction pour afficher l'aide
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Afficher cette aide"
    echo "  -d, --debug         Mode debug avec interface graphique"
    echo "  -v, --headed        Mode headed (voir le navigateur)"
    echo "  -t, --test NAME     Exécuter un test spécifique"
    echo "  --basic             Exécuter seulement les tests de base"
    echo "  --advanced          Exécuter seulement les tests avancés"
    echo "  --all              Exécuter tous les tests (par défaut)"
    echo ""
    echo "Exemples:"
    echo "  $0 --debug --headed"
    echo "  $0 --test \"devrait permettre l'export avancé\""
    echo "  $0 --basic"
}

# Variables par défaut
DEBUG=false
HEADED=false
SPECIFIC_TEST=""
TEST_TYPE="all"

# Parser les arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -d|--debug)
            DEBUG=true
            shift
            ;;
        -v|--headed)
            HEADED=true
            shift
            ;;
        -t|--test)
            SPECIFIC_TEST="$2"
            shift 2
            ;;
        --basic)
            TEST_TYPE="basic"
            shift
            ;;
        --advanced)
            TEST_TYPE="advanced"
            shift
            ;;
        --all)
            TEST_TYPE="all"
            shift
            ;;
        *)
            echo "❌ Option inconnue: $1"
            show_help
            exit 1
            ;;
    esac
done

# Construire la commande Playwright
CMD="npx playwright test"

# Ajouter les options
if [ "$DEBUG" = true ]; then
    CMD="$CMD --debug"
fi

if [ "$HEADED" = true ]; then
    CMD="$CMD --headed"
fi

# Ajouter les fichiers de test selon le type
case $TEST_TYPE in
    "basic")
        CMD="$CMD data-management.spec.ts"
        echo "📋 Exécution des tests de base de gestion des données..."
        ;;
    "advanced")
        CMD="$CMD export-import-advanced.spec.ts"
        echo "🔬 Exécution des tests avancés d'export/import..."
        ;;
    "all")
        CMD="$CMD data-management.spec.ts export-import-advanced.spec.ts"
        echo "🚀 Exécution de tous les tests d'export/import..."
        ;;
esac

# Ajouter le test spécifique si demandé
if [ -n "$SPECIFIC_TEST" ]; then
    CMD="$CMD -g \"$SPECIFIC_TEST\""
    echo "🎯 Test spécifique: $SPECIFIC_TEST"
fi

echo ""
echo "🔧 Commande exécutée: $CMD"
echo ""

# Exécuter les tests
eval $CMD

echo ""
echo "✅ Tests terminés !"
echo ""
echo "💡 Pour voir le rapport détaillé :"
echo "   npx playwright show-report"
echo ""
echo "🔍 Pour déboguer un test spécifique :"
echo "   npx playwright test --debug --headed"
