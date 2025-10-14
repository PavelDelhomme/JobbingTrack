#!/bin/bash

# ============================================================================
# Script wrapper pour les Makefiles JobbingTrack
# ============================================================================
# Permet d'utiliser make depuis n'importe quel répertoire du projet

set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Déterminer le répertoire du projet
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

# Vérifier si aucun argument n'est passé (aide par défaut)
if [ $# -eq 0 ]; then
    echo -e "${BLUE}🚀 JobbingTrack Makefiles${NC}"
    echo "=========================="
    echo ""
    echo -e "${GREEN}Usage:${NC} ./make.sh [commande]"
    echo ""
    echo -e "${YELLOW}Exemples:${NC}"
    echo "  ./make.sh                # Afficher l'aide complète"
    echo "  ./make.sh up             # Démarrer tout"
    echo "  ./make.sh help-backend   # Aide backend"
    echo "  ./make.sh test-all       # Tous les tests"
    echo ""
    echo -e "${BLUE}Note:${NC} Ce script exécute automatiquement le Makefile approprié"
    echo "       selon votre position dans l'arborescence du projet."
    echo ""
    make -f "$PROJECT_ROOT/makefiles/root/Makefile" help | head -20
    exit 0
fi

# Vérifier si on demande l'aide spécifiquement
if [ "$1" = "help" ] || [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    make -f "$PROJECT_ROOT/makefiles/root/Makefile" help
    exit 0
fi

# Vérifier si on est dans un sous-répertoire des Makefiles
if [[ "$PWD" == *"makefiles"* ]]; then
    # On est déjà dans le dossier makefiles, utiliser le Makefile local
    make "$@"
else
    # On est ailleurs dans le projet, utiliser le Makefile principal
    # Utiliser directement le Makefile dans makefiles/root/ pour éviter les problèmes de liens symboliques
    make -f "$PROJECT_ROOT/makefiles/root/Makefile" "$@"
fi

# ============================================================================
# ALIAS PRATIQUE POUR MAKE
# ============================================================================
# Pour utiliser make directement depuis n'importe quel répertoire du projet,
# ajoutez cette ligne à votre ~/.bashrc ou ~/.zshrc :
#
# alias make='/chemin/vers/votre/projet/make.sh'
#
# Ou créez un lien symbolique :
# ln -sf /chemin/vers/votre/projet/make.sh /usr/local/bin/jmake
# ============================================================================
