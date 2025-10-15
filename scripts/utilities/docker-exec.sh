#!/bin/bash

# ============================================================================
# Docker Exec Shell - Accès shell aux conteneurs Docker
# ============================================================================
# Ce script permet d'accéder en shell interactif à n'importe quel conteneur Docker
# ============================================================================

set -e

# ============================================================================
# FONCTIONS UTILITAIRES
# ============================================================================

# Afficher l'aide
show_help() {
    echo "🐳 Docker Exec Shell - Accès shell aux conteneurs Docker"
    echo ""
    echo "USAGE:"
    echo "  $0 <nom_conteneur> [commande]"
    echo ""
    echo "ARGUMENTS:"
    echo "  nom_conteneur    Nom du conteneur Docker (obligatoire)"
    echo "  commande         Commande à exécuter (optionnel, défaut: sh)"
    echo ""
    echo "EXEMPLES:"
    echo "  $0 frontend-jobbingtrack-frontend          # Accès shell au frontend"
    echo "  $0 postgres                               # Accès shell à PostgreSQL"
    echo "  $0 redis                                  # Accès shell à Redis"
    echo "  $0 api-gateway ls -la                     # Exécuter ls -la dans api-gateway"
    echo ""
    echo "COMMANDES MAKE:"
    echo "  make docker-exec <nom_conteneur>          # Même fonction via Makefile"
    echo ""
}

# Vérifier si le conteneur existe et tourne
check_container() {
    local container_name="$1"

    if ! docker ps -q -f name="$container_name" >/dev/null 2>&1; then
        echo "❌ Erreur: Conteneur '$container_name' non trouvé ou arrêté"
        echo ""
        echo "💡 Liste des conteneurs disponibles:"
        docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
        exit 1
    fi
}

# ============================================================================
# VERIFICATIONS
# ============================================================================

# Vérifier les arguments
if [ $# -eq 0 ]; then
    echo "❌ Erreur: Nom du conteneur requis"
    echo ""
    show_help
    exit 1
fi

# Vérifier que Docker est disponible
if ! command -v docker &> /dev/null; then
    echo "❌ Erreur: Docker n'est pas installé ou pas dans le PATH"
    exit 1
fi

# ============================================================================
# TRAITEMENT PRINCIPAL
# ============================================================================

CONTAINER_NAME="$1"
COMMAND="${2:-sh}"

# Vérifier que le conteneur existe et tourne
check_container "$CONTAINER_NAME"

echo "🐳 Accès shell au conteneur: $CONTAINER_NAME"
echo "💻 Commande: $COMMAND"
echo ""

# Exécuter la commande dans le conteneur
if [ "$COMMAND" = "sh" ]; then
    echo "💡 Tapez 'exit' pour quitter le shell"
    echo ""
fi

# Utiliser exec -it pour un shell interactif
exec docker exec -it "$CONTAINER_NAME" $COMMAND
