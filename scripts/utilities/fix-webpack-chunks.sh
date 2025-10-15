#!/bin/bash

# ============================================================================
# Fix Webpack Chunks - Correction des erreurs de modules manquants
# ============================================================================
# Ce script diagnostique et corrige les problèmes de chunks webpack manquants
# ============================================================================

set -e

# ============================================================================
# FONCTIONS UTILITAIRES
# ============================================================================

# Afficher l'aide
show_help() {
    echo "🔧 Fix Webpack Chunks - Correction des erreurs de modules manquants"
    echo ""
    echo "USAGE:"
    echo "  $0 [nom_conteneur] [options]"
    echo ""
    echo "ARGUMENTS:"
    echo "  nom_conteneur    Nom du conteneur à corriger (optionnel, défaut: auto-détection)"
    echo ""
    echo "OPTIONS:"
    echo "  --force         Forcer la reconstruction complète"
    echo "  --clean         Nettoyer seulement le cache"
    echo "  --restart       Redémarrer après correction"
    echo ""
    echo "COMMANDES:"
    echo "  $0                           # Diagnostic et correction automatique"
    echo "  $0 jobbingtrack-frontend     # Corriger le conteneur spécifié"
    echo "  $0 --clean                   # Nettoyer seulement le cache"
    echo "  $0 --force                   # Reconstruction complète forcée"
    echo ""
    echo "COMMANDES MAKE:"
    echo "  make fix-webpack             # Même fonction via Makefile"
    echo ""
}

# Vérifier si on est dans un conteneur ou non
check_environment() {
    if [ -f /.dockerenv ]; then
        echo "🐳 Environnement: Dans un conteneur Docker"
        return 0
    elif [ -d /.docker ]; then
        echo "🐳 Environnement: Dans un conteneur Docker (méthode alternative)"
        return 0
    else
        echo "💻 Environnement: Hors conteneur"
        return 1
    fi
}

# Obtenir le nom du conteneur frontend actif
get_frontend_container() {
    # Chercher le conteneur frontend actif
    FRONTEND_CONTAINER=$(docker ps --filter name="frontend" --filter status=running --format "{{.Names}}" | head -1)

    if [ -z "$FRONTEND_CONTAINER" ]; then
        echo "❌ Aucun conteneur frontend trouvé"
        echo ""
        echo "📋 Liste des conteneurs disponibles:"
        docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
        exit 1
    fi

    echo "🎯 Conteneur frontend trouvé: $FRONTEND_CONTAINER"
    echo "$FRONTEND_CONTAINER"
}

# ============================================================================
# VERIFICATIONS
# ============================================================================

# Vérifier les arguments
FORCE_MODE=false
CLEAN_MODE=false
RESTART_MODE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            show_help
            exit 0
            ;;
        --force)
            FORCE_MODE=true
            shift
            ;;
        --clean)
            CLEAN_MODE=true
            shift
            ;;
        --restart)
            RESTART_MODE=true
            shift
            ;;
        -*)
            echo "❌ Option inconnue: $1"
            show_help
            exit 1
            ;;
        *)
            break
            ;;
    esac
done

echo "🔧 Fix Webpack Chunks - Diagnostic et correction"
echo "=============================================="

# ============================================================================
# DETECTION DU CONTENEUR
# ============================================================================

# Récupérer le premier argument s'il existe
CONTAINER_NAME="$1"

if [ -z "$CONTAINER_NAME" ]; then
    # Pas d'argument fourni - auto-détection
    if check_environment; then
        echo "🔍 Mode: Test dans le conteneur actuel"
        CONTAINER_NAME=""
        TEST_IN_CONTAINER=false
    else
        echo "🔍 Mode: Recherche du conteneur frontend"
        if ! CONTAINER_NAME=$(get_frontend_container); then
            echo "❌ Impossible de trouver un conteneur frontend actif"
            echo ""
            echo "💡 Solutions possibles:"
            echo "   1. Démarrer les services: make up"
            echo "   2. Spécifier manuellement: make fix-webpack jobbingtrack-frontend"
            exit 1
        fi
        TEST_IN_CONTAINER=true
    fi
else
    # Argument fourni (nom du conteneur)
    TEST_IN_CONTAINER=true
fi

# ============================================================================
# DIAGNOSTIC DES PROBLÈMES
# ============================================================================

echo ""
echo "🔍 Diagnostic des problèmes de chunks webpack..."
echo "-----------------------------------------------"

# ============================================================================
# DIAGNOSTIC PRINCIPAL
# ============================================================================

echo "🐳 Diagnostic dans le conteneur Docker: $CONTAINER_NAME"

# Vérifier la structure .next
echo "📁 Vérification de la structure .next..."
if docker exec "$CONTAINER_NAME" ls -la /app/.next/ 2>/dev/null; then
    echo "   ✅ Répertoire .next présent"
else
    echo "   ❌ Répertoire .next manquant ou inaccessible"
fi

# Vérifier les chunks serveur
echo "📦 Vérification des chunks serveur..."
SERVER_CHUNKS=$(docker exec "$CONTAINER_NAME" find /app/.next/server -name "*.js" 2>/dev/null | wc -l)
echo "   📊 Nombre de fichiers chunks serveur: $SERVER_CHUNKS"

if [ "$SERVER_CHUNKS" -lt 10 ]; then
    echo "   ⚠️ Nombre de chunks serveur très faible - problème probable"
else
    echo "   ✅ Nombre de chunks serveur correct"
fi

# Vérifier les pages
echo "📄 Vérification des pages générées..."
PAGES_COUNT=$(docker exec "$CONTAINER_NAME" find /app/.next/server/app -name "page.js" 2>/dev/null | wc -l)
echo "   📊 Nombre de pages générées: $PAGES_COUNT"

# ============================================================================
# CORRECTION SI NÉCESSAIRE
# ============================================================================

echo ""
echo "💡 Recommandations:"
if [ "$SERVER_CHUNKS" -lt 10 ]; then
    echo "   🔧 Problème détecté - Reconstruction nécessaire"
    echo "   💡 Utilisez: make frontend-rebuild"
else
    echo "   ✅ Aucun problème détecté"
fi

echo ""
echo "✅ Diagnostic terminé"
