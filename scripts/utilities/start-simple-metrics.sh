#!/bin/bash

# ============================================================================
# Start Simple Metrics Service - Démarrage du service de métriques simple
# ============================================================================
# Ce script démarre le service de métriques simple pour JobbingTrack
# ============================================================================

set -e

# ============================================================================
# FONCTIONS UTILITAIRES
# ============================================================================

# Afficher l'aide
show_help() {
    echo "🚀 Start Simple Metrics Service - Démarrage du service de métriques simple"
    echo ""
    echo "USAGE:"
    echo "  $0 [options]"
    echo ""
    echo "OPTIONS:"
    echo "  --rebuild       Reconstruire l'image avant de démarrer"
    echo "  --no-cache     Construire sans cache"
    echo ""
    echo "COMMANDES:"
    echo "  $0              # Démarrer le service"
    echo "  $0 --rebuild    # Reconstruire et démarrer"
    echo "  $0 --no-cache   # Construire sans cache et démarrer"
    echo ""
    echo "COMMANDES MAKE:"
    echo "  make start-simple-metrics   # Même fonction via Makefile"
    echo ""
}

# ============================================================================
# VERIFICATIONS
# ============================================================================

# Vérifier les arguments
REBUILD_MODE=false
NO_CACHE_MODE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            show_help
            exit 0
            ;;
        --rebuild)
            REBUILD_MODE=true
            shift
            ;;
        --no-cache)
            NO_CACHE_MODE=true
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

echo "🚀 Démarrage du service de métriques simple"
echo "=========================================="

# ============================================================================
# PREPARATION
# ============================================================================

# Aller dans le répertoire du service
cd "$(dirname "$0")/../../backend/simple-metrics-service"

echo "📁 Répertoire de travail: $(pwd)"

# ============================================================================
# INSTALLATION DES DEPENDANCES
# ============================================================================

echo "📦 Installation des dépendances..."
if [ ! -d "node_modules" ]; then
    echo "   Installation des dépendances npm..."
    npm ci
else
    echo "   ✅ Dépendances déjà installées"
fi

# ============================================================================
# CONSTRUCTION DE L'IMAGE
# ============================================================================

BUILD_ARGS=""

if [ "$REBUILD_MODE" = true ] || [ "$NO_CACHE_MODE" = true ]; then
    echo "🔨 Construction de l'image Docker..."

    if [ "$NO_CACHE_MODE" = true ]; then
        BUILD_ARGS="--no-cache"
        echo "   Construction sans cache activée"
    fi

    if command -v docker-compose &> /dev/null; then
        docker-compose build $BUILD_ARGS
    else
        docker compose build $BUILD_ARGS
    fi

    echo "✅ Image construite avec succès"
fi

# ============================================================================
# DEMARRAGE DU SERVICE
# ============================================================================

echo "🚀 Démarrage du service de métriques simple..."

# Arrêter le service existant s'il tourne
echo "⏹️ Arrêt du service existant..."
if command -v docker-compose &> /dev/null; then
    docker-compose down 2>/dev/null || true
else
    docker compose down 2>/dev/null || true
fi

# Démarrer le service
echo "▶️ Démarrage du service..."
if command -v docker-compose &> /dev/null; then
    docker-compose up -d
else
    docker compose up -d
fi

# Attendre que le service démarre
echo "⏳ Attente du démarrage du service..."
sleep 10

# Vérifier que le service répond
echo "🔍 Vérification du service..."
if curl -s http://localhost:3014/api/v1/health >/dev/null; then
    echo "✅ Service de métriques démarré avec succès !"
    echo ""
    echo "🌐 Interface disponible:"
    echo "  Service de métriques: http://localhost:3014"
    echo "  Health check:         http://localhost:3014/api/v1/health"
    echo "  Métriques:           http://localhost:3014/api/v1/metrics"
    echo ""
    echo "💡 Le service envoie des métriques via WebSocket"
    echo "💡 Le frontend peut maintenant recevoir les métriques"
else
    echo "⚠️ Le service pourrait avoir des problèmes"
    echo "💡 Vérifiez les logs avec: docker logs simple-metrics-service"
fi

echo ""
echo "✅ Démarrage terminé"
