#!/bin/bash

# ============================================================================
# Script de Configuration Automatique des Couleurs - JobbingTrack
# ============================================================================
# Configure automatiquement les couleurs pour les Makefiles dans le terminal

set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Fonction de succès
success() {
    echo -e "${GREEN}✅${NC} $1"
}

# Fonction d'avertissement
warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

# Fonction d'erreur
error() {
    echo -e "${RED}❌${NC} $1"
    exit 1
}

# Détecter le type de shell
detect_shell() {
    if [[ "$SHELL" == */zsh ]]; then
        echo "zsh"
    elif [[ "$SHELL" == */bash ]]; then
        echo "bash"
    else
        echo "unknown"
    fi
}

# Tester le support des couleurs
test_color_support() {
    # Test simple avec echo
    if echo -e "\033[0;32mtest\033[0m" | grep -q "test"; then
        return 0
    else
        return 1
    fi
}

# Configurer les couleurs pour zsh
setup_zsh_colors() {
    local zshrc="$HOME/.zshrc"

    # Vérifier si la configuration existe déjà
    if grep -q "make_colors" "$zshrc" 2>/dev/null; then
        warning "Configuration des couleurs déjà présente dans .zshrc"
        return 0
    fi

    # Ajouter la configuration
    cat >> "$zshrc" << 'EOF'

# ============================================================================
# Configuration des couleurs pour JobbingTrack Makefiles
# ============================================================================
# Couleurs ANSI pour les messages du Makefile
export MAKE_GREEN='\033[0;32m'
export MAKE_RED='\033[0;31m'
export MAKE_YELLOW='\033[1;33m'
export MAKE_BLUE='\033[0;34m'
export MAKE_PURPLE='\033[0;35m'
export MAKE_CYAN='\033[0;36m'
export MAKE_BOLD='\033[1m'
export MAKE_NC='\033[0m'

# Fonction pour tester les couleurs
make_colors_test() {
    echo -e "${MAKE_GREEN}✅ Vert (succès)${MAKE_NC}"
    echo -e "${MAKE_RED}❌ Rouge (erreur)${MAKE_NC}"
    echo -e "${MAKE_YELLOW}⚠️ Jaune (attention)${MAKE_NC}"
    echo -e "${MAKE_BLUE}🔵 Bleu (information)${MAKE_NC}"
    echo -e "${MAKE_PURPLE}🟣 Violet (spécial)${MAKE_NC}"
    echo -e "${MAKE_CYAN}🔵 Cyan (étapes)${MAKE_NC}"
    echo ""
    echo "Usage dans Makefile:"
    echo '  @echo "$(MAKE_GREEN)✅ Opération réussie$(MAKE_NC)"'
}

# ============================================================================
EOF

    success "Configuration des couleurs ajoutée à .zshrc"
}

# Configurer les couleurs pour bash
setup_bash_colors() {
    local bashrc="$HOME/.bashrc"

    # Vérifier si la configuration existe déjà
    if grep -q "make_colors" "$bashrc" 2>/dev/null; then
        warning "Configuration des couleurs déjà présente dans .bashrc"
        return 0
    fi

    # Ajouter la configuration
    cat >> "$bashrc" << 'EOF'

# ============================================================================
# Configuration des couleurs pour JobbingTrack Makefiles
# ============================================================================
# Couleurs ANSI pour les messages du Makefile
export MAKE_GREEN='\033[0;32m'
export MAKE_RED='\033[0;31m'
export MAKE_YELLOW='\033[1;33m'
export MAKE_BLUE='\033[0;34m'
export MAKE_PURPLE='\033[0;35m'
export MAKE_CYAN='\033[0;36m'
export MAKE_BOLD='\033[1m'
export MAKE_NC='\033[0m'

# Fonction pour tester les couleurs
make_colors_test() {
    echo -e "${MAKE_GREEN}✅ Vert (succès)${MAKE_NC}"
    echo -e "${MAKE_RED}❌ Rouge (erreur)${MAKE_NC}"
    echo -e "${MAKE_YELLOW}⚠️ Jaune (attention)${MAKE_NC}"
    echo -e "${MAKE_BLUE}🔵 Bleu (information)${MAKE_NC}"
    echo -e "${MAKE_PURPLE}🟣 Violet (spécial)${MAKE_NC}"
    echo -e "${MAKE_CYAN}🔵 Cyan (étapes)${MAKE_NC}"
    echo ""
    echo "Usage dans Makefile:"
    echo '  @echo "$(MAKE_GREEN)✅ Opération réussie$(MAKE_NC)"'
}

# ============================================================================
EOF

    success "Configuration des couleurs ajoutée à .bashrc"
}

# Créer un script de test des couleurs
create_color_test_script() {
    cat > /tmp/test_colors.sh << 'EOF'
#!/bin/bash
# Test des couleurs ANSI

echo "🧪 Test des couleurs ANSI:"
echo ""

echo -e "\033[0;32m✅ Vert (succès)\033[0m"
echo -e "\033[0;31m❌ Rouge (erreur)\033[0m"
echo -e "\033[1;33m⚠️ Jaune (attention)\033[0m"
echo -e "\033[0;34m🔵 Bleu (information)\033[0m"
echo -e "\033[0;35m🟣 Violet (spécial)\033[0m"
echo -e "\033[0;36m🔵 Cyan (étapes)\033[0m"
echo -e "\033[1mGras (titre)\033[0m"

echo ""
echo "Si vous voyez les codes \033[...] au lieu des couleurs,"
echo "votre terminal ne supporte pas les couleurs ANSI."
echo ""
echo "Solutions:"
echo "1. Utiliser un terminal moderne (Kitty, Alacritty, etc.)"
echo "2. Configurer votre terminal pour supporter les couleurs"
echo "3. Les couleurs sont désactivées dans votre environnement"
EOF

    chmod +x /tmp/test_colors.sh
    success "Script de test créé: /tmp/test_colors.sh"
}

# Fonction principale
main() {
    echo -e "${BLUE}🎨 Configuration Automatique des Couleurs - JobbingTrack${NC}"
    echo "======================================================"

    # Tester le support des couleurs
    if test_color_support; then
        success "Couleurs ANSI supportées par le terminal"
    else
        warning "Couleurs ANSI non supportées"
        create_color_test_script
        echo ""
        echo "💡 Exécutez le test: /tmp/test_colors.sh"
        echo ""
        echo "🔧 Terminaux recommandés avec support des couleurs:"
        echo "   • Kitty"
        echo "   • Alacritty"
        echo "   • GNOME Terminal"
        echo "   • Konsole"
        echo ""
        echo "⚙️ Configuration alternative:"
        echo "   export TERM=xterm-256color"
        exit 1
    fi

    # Détecter le shell
    local shell=$(detect_shell)

    case "$shell" in
        "zsh")
            setup_zsh_colors
            ;;
        "bash")
            setup_bash_colors
            ;;
        "unknown")
            error "Shell non reconnu: $SHELL"
            ;;
    esac

    echo ""
    echo -e "${BLUE}📋 Prochaines étapes:${NC}"
    echo "1. Rechargez votre shell:"
    echo "   source ~/.zshrc    # Pour zsh"
    echo "   source ~/.bashrc   # Pour bash"
    echo ""
    echo "2. Testez les couleurs:"
    echo "   make_colors_test"
    echo ""
    echo "3. Utilisez les Makefiles:"
    echo "   make help"
    echo ""
    success "Configuration des couleurs terminée !"
}

# Fonction d'aide
show_help() {
    echo -e "${BLUE}🎨 Configuration des Couleurs - JobbingTrack${NC}"
    echo "=========================================="
    echo ""
    echo "Usage: $0"
    echo ""
    echo "Ce script configure automatiquement les couleurs ANSI"
    echo "pour les Makefiles de JobbingTrack dans votre shell."
    echo ""
    echo "Fonctionnalités:"
    echo "  • Détection automatique du shell (zsh/bash)"
    echo "  • Test du support des couleurs ANSI"
    echo "  • Configuration automatique des variables de couleur"
    echo "  • Création d'un script de test"
    echo ""
    echo "Variables de couleur définies:"
    echo "  MAKE_GREEN, MAKE_RED, MAKE_YELLOW, MAKE_BLUE"
    echo "  MAKE_PURPLE, MAKE_CYAN, MAKE_BOLD, MAKE_NC"
    echo ""
    echo "Exemple d'utilisation dans les Makefiles:"
    echo '  @echo "$(MAKE_GREEN)✅ Opération réussie$(MAKE_NC)"'
}

# Gestion des arguments
case "${1:-}" in
    "--help"|"-h")
        show_help
        exit 0
        ;;
    "--test")
        /tmp/test_colors.sh 2>/dev/null || create_color_test_script
        /tmp/test_colors.sh
        exit 0
        ;;
    "")
        main
        ;;
esac
