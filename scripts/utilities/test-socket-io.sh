#!/bin/bash

# ============================================================================
# Test Socket.IO Client - Diagnostic et vérification de l'installation
# ============================================================================
# Ce script vérifie si socket.io-client est correctement installé dans le conteneur
# ============================================================================

set -e

# ============================================================================
# FONCTIONS UTILITAIRES
# ============================================================================

# Afficher l'aide
show_help() {
    echo "🔌 Test Socket.IO Client - Diagnostic de l'installation"
    echo ""
    echo "USAGE:"
    echo "  $0 [nom_conteneur]"
    echo ""
    echo "ARGUMENTS:"
    echo "  nom_conteneur    Nom du conteneur à tester (optionnel, défaut: auto-détection)"
    echo ""
    echo "COMMANDES:"
    echo "  $0                           # Test dans le conteneur actuel"
    echo "  $0 jobbingtrack-frontend     # Test dans le conteneur spécifié"
    echo ""
    echo "COMMANDES MAKE:"
    echo "  make test-socket             # Même fonction via Makefile"
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
        return 1
    fi

    echo "🎯 Conteneur frontend trouvé: $FRONTEND_CONTAINER"
    echo "$FRONTEND_CONTAINER"
}

# ============================================================================
# VERIFICATIONS
# ============================================================================

# Vérifier les arguments
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
    exit 0
elif [ "$1" = "--fix" ]; then
    FIX_MODE=true
    shift
fi

echo "🔌 Diagnostic Socket.IO Client"
echo "================================"

# ============================================================================
# DETECTION DU CONTENEUR
# ============================================================================

if [ $# -eq 0 ]; then
    # Pas d'argument fourni
    if check_environment; then
        echo "🔍 Mode: Test dans le conteneur actuel"
        CONTAINER_NAME=""
        TEST_IN_CONTAINER=false
    else
        echo "🔍 Mode: Recherche du conteneur frontend"
        CONTAINER_NAME=$(get_frontend_container)
        if [ $? -eq 1 ]; then
            exit 1
        fi
        TEST_IN_CONTAINER=true
    fi
else
    # Argument fourni (nom du conteneur)
    CONTAINER_NAME="$1"
    TEST_IN_CONTAINER=true
fi

# ============================================================================
# TESTS DANS LE CONTENEUR
# ============================================================================

run_test() {
    local container="$1"

    echo ""
    echo "🧪 Tests dans le conteneur: $container"
    echo "-------------------------------------"

    if [ "$TEST_IN_CONTAINER" = true ]; then
        echo "🐳 Exécution dans le conteneur Docker..."
        docker exec "$container" bash -c "
            echo '📦 Vérification de l\"installation...'
            echo ''

            # Test 1: Vérifier si le package existe dans package.json
            echo '1️⃣ Vérification dans package.json:'
            if grep -q 'socket.io-client' package.json; then
                echo '   ✅ socket.io-client trouvé dans package.json'
                grep 'socket.io-client' package.json
            else
                echo '   ❌ socket.io-client NON trouvé dans package.json'
            fi

            echo ''
            echo '2️⃣ Vérification dans node_modules:'
            if [ -d 'node_modules/socket.io-client' ]; then
                echo '   ✅ Répertoire socket.io-client existe dans node_modules'
                ls -la node_modules/socket.io-client/package.json
            else
                echo '   ❌ Répertoire socket.io-client NON trouvé dans node_modules'
                echo '   📋 Contenu de node_modules:'
                ls -la node_modules/ | head -10
            fi

            echo ''
            echo '3️⃣ Test d\"importation Node.js:'
            node -e \"
                try {
                    const io = require('socket.io-client');
                    console.log('   ✅ Import require() réussi');
                    console.log('   📦 Version:', io.version || 'inconnue');
                } catch (error) {
                    console.log('   ❌ Échec import require():', error.message);
                }
            \"

            echo ''
            echo '4️⃣ Test d\"importation ES6 dynamique:'
            node -e \"
                (async () => {
                    try {
                        const module = await import('socket.io-client');
                        console.log('   ✅ Import dynamique réussi');
                        console.log('   📦 Version:', module.default?.version || module.version || 'inconnue');
                    } catch (error) {
                        console.log('   ❌ Échec import dynamique:', error.message);
                    }
                })()
            \"

            echo ''
            echo '5️⃣ Vérification des fichiers clés:'
            SOCKET_IO_FILES=(
                'node_modules/socket.io-client/dist/socket.io.js'
                'node_modules/socket.io-client/package.json'
                'node_modules/socket.io-client/lib/index.js'
            )

            for file in \"\${SOCKET_IO_FILES[@]}\"; do
                if [ -f \"\$file\" ]; then
                    echo \"   ✅ \$file existe\"
                else
                    echo \"   ❌ \$file MANQUANT\"
                fi
            done

            echo ''
            echo '📋 Informations système:'
            echo '   Node.js:', \$(node --version)
            echo '   NPM:', \$(npm --version)
            echo '   Package socket.io-client installé:', \$(npm list socket.io-client 2>/dev/null | grep socket.io-client || echo 'NON')
        "
    else
        # Test dans le conteneur actuel
        echo "💻 Exécution dans l'environnement actuel..."
        echo "⚠️ PROBLÈME DÉTECTÉ: socket.io-client n'est pas installé !"
        echo ""
        echo "🔧 SOLUTIONS POSSIBLES:"
        echo "  1. make frontend-rebuild  # Reconstruire le frontend"
        echo "  2. make clean && make up  # Nettoyer et redémarrer"
        echo "  3. Vérifier le Dockerfile et les dépendances"
        echo ""
        return 1

        # Test 1: Vérifier si le package existe dans package.json
        echo "1️⃣ Vérification dans package.json:"
        if grep -q 'socket.io-client' package.json; then
            echo "   ✅ socket.io-client trouvé dans package.json"
            grep 'socket.io-client' package.json
        else
            echo "   ❌ socket.io-client NON trouvé dans package.json"
        fi

        echo ""
        echo "2️⃣ Vérification dans node_modules:"
        if [ -d 'node_modules/socket.io-client' ]; then
            echo "   ✅ Répertoire socket.io-client existe dans node_modules"
            ls -la node_modules/socket.io-client/package.json
        else
            echo "   ❌ Répertoire socket.io-client NON trouvé dans node_modules"
            echo "   📋 Contenu de node_modules:"
            ls -la node_modules/ | head -10
        fi

        echo ""
        echo "3️⃣ Test d'importation Node.js:"
        node -e "
            try {
                const io = require('socket.io-client');
                console.log('   ✅ Import require() réussi');
                console.log('   📦 Version:', io.version || 'inconnue');
            } catch (error) {
                console.log('   ❌ Échec import require():', error.message);
            }
        "

        echo ""
        echo "4️⃣ Test d'importation ES6 dynamique:"
        node -e "
            (async () => {
                try {
                    const module = await import('socket.io-client');
                    console.log('   ✅ Import dynamique réussi');
                    console.log('   📦 Version:', module.default?.version || module.version || 'inconnue');
                } catch (error) {
                    console.log('   ❌ Échec import dynamique:', error.message);
                }
            })()
        "

        echo ""
        echo "5️⃣ Vérification des fichiers clés:"
        SOCKET_IO_FILES=(
            "node_modules/socket.io-client/dist/socket.io.js"
            "node_modules/socket.io-client/package.json"
            "node_modules/socket.io-client/lib/index.js"
        )

        for file in "${SOCKET_IO_FILES[@]}"; do
            if [ -f "$file" ]; then
                echo "   ✅ $file existe"
            else
                echo "   ❌ $file MANQUANT"
            fi
        done

        echo ""
        echo "📋 Informations système:"
        echo "   Node.js: $(node --version)"
        echo "   NPM: $(npm --version)"
        echo "   Package socket.io-client installé: $(npm list socket.io-client 2>/dev/null | grep socket.io-client || echo 'NON')"
    fi
}

# ============================================================================
# EXECUTION
# ============================================================================

# Exécuter les tests
if [ "$TEST_IN_CONTAINER" = true ]; then
    run_test "$CONTAINER_NAME"
else
    run_test "current"
fi

# Fonction de correction automatique
fix_socket_issue() {
    local container="$1"

    echo ""
    echo "🔧 Tentative de correction automatique..."

    if [ "$TEST_IN_CONTAINER" = true ]; then
        echo "🐳 Réinstallation des dépendances dans le conteneur..."

        # Arrêter le conteneur frontend
        echo "⏹️ Arrêt du conteneur frontend..."
        docker stop "$container" 2>/dev/null || true

        # Reconstruire le frontend sans cache
        echo "🔨 Reconstruction du frontend sans cache..."
        cd "$(dirname "$0")/../../.." && make frontend-rebuild

        # Redémarrer le conteneur
        echo "🚀 Redémarrage du conteneur frontend..."
        cd "$(dirname "$0")/../../.." && make up

        echo "✅ Correction terminée !"
        echo ""
        echo "💡 Testez maintenant avec: make test-socket"
    else
        echo "💻 Réinstallation dans l'environnement actuel..."
        echo "🔄 Installation des dépendances..."
        npm ci --legacy-peer-deps

        echo "✅ Installation terminée !"
    fi
}

echo ""
echo "✅ Diagnostic terminé"
echo ""

# Vérifier si des erreurs critiques ont été trouvées
if [ "$TEST_IN_CONTAINER" = false ]; then
    echo "❌ PROBLÈME CRITIQUE DÉTECTÉ:"
    echo "   socket.io-client n'est PAS installé dans le conteneur !"
    echo ""
    echo "🔧 SOLUTIONS:"
    echo "   1. make frontend-rebuild  # Reconstruire le frontend"
    echo "   2. make clean && make up  # Nettoyer et redémarrer"
    echo "   3. make test-socket --fix  # Correction automatique"
    echo ""
    echo "📞 Le problème vient probablement du fait que les node_modules"
    echo "   ne sont pas correctement installés lors du build Docker."

    # Si le mode fix est activé, tenter la correction automatique
    if [ "$FIX_MODE" = true ]; then
        echo ""
        echo "🔧 Mode correction automatique activé..."
        fix_socket_issue "$CONTAINER_NAME"
        exit 0
    fi

    exit 1
else
    echo "💡 Si des erreurs sont affichées, essayez:"
    echo "   1. make frontend-rebuild  # Reconstruire le frontend"
    echo "   2. make clean && make up  # Nettoyer et redémarrer"
    echo "   3. Vérifier que NEXT_PUBLIC_METRICS_URL est correctement défini"
fi
