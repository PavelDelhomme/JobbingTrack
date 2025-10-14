#!/bin/bash

# ============================================================================
# Script de Diagnostic des Couleurs - JobbingTrack
# ============================================================================
# Diagnostique et résout les problèmes de couleurs dans les Makefiles

set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
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
}

# Fonction d'information
info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

# Test du support des couleurs ANSI
test_ansi_colors() {
    info "Test du support des couleurs ANSI..."

    # Test basique
    if echo -e "\033[0;32mtest\033[0m" | grep -q "test"; then
        success "Couleurs ANSI de base supportées"
        return 0
    else
        warning "Couleurs ANSI de base non supportées"
        return 1
    fi
}

# Détecter le type de terminal
detect_terminal() {
    info "Détection du type de terminal..."

    echo "Terminal actuel: $TERM"
    echo "Shell actuel: $SHELL"

    case "$TERM" in
        "xterm"|"xterm-256color"|"screen"|"screen-256color"|"tmux"|"tmux-256color")
            success "Terminal compatible avec les couleurs"
            ;;
        "linux"|"dumb")
            warning "Terminal basique sans support des couleurs"
            ;;
        *)
            info "Terminal inconnu: $TERM"
            ;;
    esac
}

# Vérifier les variables d'environnement de couleur
check_color_variables() {
    info "Vérification des variables de couleur..."

    local color_vars=("MAKE_GREEN" "MAKE_RED" "MAKE_YELLOW" "MAKE_BLUE" "MAKE_CYAN" "MAKE_NC")

    for var in "${color_vars[@]}"; do
        if [ -n "${!var:-}" ]; then
            success "Variable $var définie"
        else
            warning "Variable $var non définie"
        fi
    done
}

# Tester les couleurs avec les variables du projet
test_project_colors() {
    info "Test des couleurs du projet JobbingTrack..."

    # Définir temporairement les couleurs
    local GREEN='\033[0;32m'
    local RED='\033[0;31m'
    local YELLOW='\033[1;33m'
    local BLUE='\033[0;34m'
    local PURPLE='\033[0;35m'
    local CYAN='\033[0;36m'
    local BOLD='\033[1m'
    local NC='\033[0m'

    echo ""
    echo "🎨 Test des couleurs du projet:"
    echo ""

    echo -e "${GREEN}✅ Succès - Opération terminée${NC}"
    echo -e "${RED}❌ Erreur - Échec de l'opération${NC}"
    echo -e "${YELLOW}⚠️ Attention - Avertissement${NC}"
    echo -e "${BLUE}🔵 Information - Message informatif${NC}"
    echo -e "${PURPLE}🟣 Spécial - Message spécial${NC}"
    echo -e "${CYAN}🔵 Étape - Étape en cours${NC}"
    echo -e "${BOLD}Titre - Texte en gras${NC}"

    echo ""
    echo "📋 Exemple d'utilisation dans les Makefiles:"
    echo '  @echo "$(GREEN)✅ Build réussi$(NC)"'
    echo '  @echo "$(RED)❌ Build échoué$(NC)"'
    echo '  @echo "$(YELLOW)⚠️ Avertissement$(NC)"'
}

# Diagnostiquer les problèmes potentiels
diagnose_issues() {
    info "Diagnostic des problèmes potentiels..."

    local issues=()

    # Vérifier le terminal
    if [[ "$TERM" == "dumb" || "$TERM" == "linux" ]]; then
        issues+=("Terminal basique sans support des couleurs")
    fi

    # Vérifier les variables d'environnement
    if [ -z "${MAKE_GREEN:-}" ]; then
        issues+=("Variables de couleur non définies dans l'environnement")
    fi

    # Vérifier la configuration du shell
    if [[ "$SHELL" != */zsh && "$SHELL" != */bash ]]; then
        issues+=("Shell non standard détecté: $SHELL")
    fi

    if [ ${#issues[@]} -gt 0 ]; then
        echo ""
        echo "🚨 PROBLÈMES DÉTECTÉS:"
        for issue in "${issues[@]}"; do
            echo "   ❌ $issue"
        done

        echo ""
        echo "💡 SOLUTIONS RECOMMANDÉES:"
        echo "   1. Utiliser un terminal moderne (Kitty, Alacritty, etc.)"
        echo "   2. Configurer les couleurs: ./scripts/system/setup-colors.sh"
        echo "   3. Définir TERM=xterm-256color"
        echo "   4. Vérifier la configuration de votre shell"
    else
        success "Aucun problème détecté"
    fi
}

# Générer des recommandations
generate_recommendations() {
    info "Génération des recommandations..."

    echo ""
    echo "🔧 RECOMMANDATIONS POUR LES COULEURS:"
    echo ""

    echo "1️⃣ Configuration automatique:"
    echo "   ./scripts/system/setup-colors.sh"

    echo ""
    echo "2️⃣ Configuration manuelle:"
    echo "   Ajoutez ces lignes à votre ~/.zshrc ou ~/.bashrc:"

    cat << 'EOF'
# Couleurs pour JobbingTrack Makefiles
export MAKE_GREEN='\033[0;32m'
export MAKE_RED='\033[0;31m'
export MAKE_YELLOW='\033[1;33m'
export MAKE_BLUE='\033[0;34m'
export MAKE_PURPLE='\033[0;35m'
export MAKE_CYAN='\033[0;36m'
export MAKE_BOLD='\033[1m'
export MAKE_NC='\033[0m'
EOF

    echo ""
    echo "3️⃣ Test des couleurs:"
    echo "   make_colors_test  # Si configuré"

    echo ""
    echo "4️⃣ Terminaux recommandés:"
    echo "   • Kitty (Linux/Windows/macOS)"
    echo "   • Alacritty (multiplateforme)"
    echo "   • GNOME Terminal (Linux)"
    echo "   • Windows Terminal (Windows)"
    echo "   • iTerm2 (macOS)"

    echo ""
    echo "5️⃣ Commande de secours:"
    echo "   export TERM=xterm-256color"
}

# Fonction principale
main() {
    echo -e "${BLUE}🔍 Diagnostic des Couleurs - JobbingTrack${NC}"
    echo "========================================"

    # Tests de base
    test_ansi_colors
    detect_terminal
    check_color_variables
    test_project_colors

    # Diagnostic
    diagnose_issues

    # Recommandations
    generate_recommendations

    echo ""
    echo -e "${BLUE}📞 Besoin d'aide ?${NC}"
    echo "   Consultez: ./scripts/system/setup-colors.sh --help"
}

# Fonction d'aide
show_help() {
    echo -e "${BLUE}🔍 Diagnostic des Couleurs - JobbingTrack${NC}"
    echo "========================================"
    echo ""
    echo "Usage: $0"
    echo ""
    echo "Ce script diagnostique les problèmes de couleurs dans les"
    echo "Makefiles de JobbingTrack et propose des solutions."
    echo ""
    echo "Tests effectués:"
    echo "  • Support des couleurs ANSI"
    echo "  • Détection du type de terminal"
    echo "  • Vérification des variables de couleur"
    echo "  • Test des couleurs du projet"
    echo "  • Diagnostic des problèmes"
    echo ""
    echo "Solutions proposées:"
    echo "  • Configuration automatique"
    echo "  • Configuration manuelle"
    echo "  • Terminaux recommandés"
    echo "  • Commandes de secours"
}

# Gestion des arguments
case "${1:-}" in
    "--help"|"-h")
        show_help
        exit 0
        ;;
    "--fix")
        echo "🔧 Tentative de correction automatique..."
        ./scripts/system/setup-colors.sh
        exit $?
        ;;
    "")
        main
        ;;
esac
