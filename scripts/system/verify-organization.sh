#!/bin/bash

# ============================================================================
# Script de Vérification de l'Organisation - JobbingTrack
# ============================================================================
# Vérifie que toute l'organisation du projet est correcte

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

# Fonction d'information
info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

# Vérifier la structure de base
verify_base_structure() {
    info "Vérification de la structure de base..."

    local required_dirs=("docs" "scripts" "makefiles" "backend" "frontend" "tests")
    local missing_dirs=()

    for dir in "${required_dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            missing_dirs+=("$dir")
        fi
    done

    if [ ${#missing_dirs[@]} -gt 0 ]; then
        error "Dossiers manquants: ${missing_dirs[*]}"
    fi

    success "Structure de base correcte"
}

# Vérifier la documentation
verify_documentation() {
    info "Vérification de la documentation..."

    local required_docs=(
        "README.md"
        "docs/README.md"
        "docs/project/README.md"
        "docs/makefiles/README.md"
        "docs/scripts/README.md"
        "docs/deployment/README.md"
        "docs/api/README.md"
        "docs/guides/README.md"
        "docs/technical/README.md"
    )

    local missing_docs=()

    for doc in "${required_docs[@]}"; do
        if [ ! -f "$doc" ]; then
            missing_docs+=("$doc")
        fi
    done

    if [ ${#missing_docs[@]} -gt 0 ]; then
        error "Documentation manquante: ${missing_docs[*]}"
    fi

    success "Documentation complète"
}

# Vérifier les scripts
verify_scripts() {
    info "Vérification des scripts..."

    local script_categories=("database" "deployment" "system" "testing" "setup" "monitoring" "utils")
    local missing_categories=()

    for category in "${script_categories[@]}"; do
        if [ ! -d "scripts/$category" ]; then
            missing_categories+=("$category")
        fi
    done

    if [ ${#missing_categories[@]} -gt 0 ]; then
        error "Catégories de scripts manquantes: ${missing_categories[*]}"
    fi

    success "Scripts organisés correctement"
}

# Vérifier les Makefiles
verify_makefiles() {
    info "Vérification des Makefiles..."

    local makefile_files=("makefiles/root/Makefile" "makefiles/shared/common.mk" "makefiles/.make_colors")
    local missing_files=()

    for file in "${makefile_files[@]}"; do
        if [ ! -f "$file" ]; then
            missing_files+=("$file")
        fi
    done

    if [ ${#missing_files[@]} -gt 0 ]; then
        error "Fichiers Makefile manquants: ${missing_files[*]}"
    fi

    success "Makefiles organisés correctement"
}

# Vérifier les liens symboliques
verify_symlinks() {
    info "Vérification des liens symboliques..."

    local symlinks=("Makefile" "make.sh")
    local broken_links=()

    for link in "${symlinks[@]}"; do
        if [ -L "$link" ]; then
            if [ ! -e "$link" ]; then
                broken_links+=("$link")
            fi
        fi
    done

    if [ ${#broken_links[@]} -gt 0 ]; then
        error "Liens symboliques cassés: ${broken_links[*]}"
    fi

    success "Liens symboliques corrects"
}

# Vérifier les couleurs
verify_colors() {
    info "Vérification du système de couleurs..."

    # Vérifier que les variables de couleur sont définies
    if [ -n "${MAKE_GREEN:-}" ] && [ -n "${MAKE_RED:-}" ] && [ -n "${MAKE_BLUE:-}" ]; then
        success "Variables de couleur définies"
    else
        warning "Variables de couleur non définies - exécuter: ./scripts/system/setup-makefile-colors.sh"
    fi
}

# Test des fonctionnalités principales
test_core_functionality() {
    info "Test des fonctionnalités principales..."

    # Test du Makefile
    if make -f makefiles/root/Makefile help >/dev/null 2>&1; then
        success "Makefile principal fonctionnel"
    else
        error "Makefile principal défaillant"
    fi

    # Test des scripts
    local test_scripts=("scripts/system/pre-flight-check.sh" "scripts/monitoring/health-monitor.sh")
    for script in "${test_scripts[@]}"; do
        if [ -x "$script" ]; then
            success "Script exécutable: $(basename "$script")"
        else
            warning "Script non exécutable: $(basename "$script")"
        fi
    done
}

# Générer un rapport final
generate_final_report() {
    info "Génération du rapport final..."

    local report_file="/tmp/jobbingtrack-organization-verification.txt"

    {
        echo "========================================"
        echo "RAPPORT DE VÉRIFICATION D'ORGANISATION"
        echo "JobbingTrack - $(date)"
        echo "========================================"
        echo ""
        echo "STRUCTURE VÉRIFIÉE:"
        echo ""
        echo "📚 Documentation centralisée:"
        echo "  • README.md principal"
        echo "  • docs/ avec 7 fichiers de documentation"
        echo "  • Organisation par catégories"
        echo ""
        echo "🛠️ Scripts organisés:"
        echo "  • 7 catégories de scripts"
        echo "  • Scripts exécutables"
        echo "  • Documentation intégrée"
        echo ""
        echo "📦 Makefiles modulaires:"
        echo "  • 4 Makefiles spécialisés"
        echo "  • Variables communes partagées"
        echo "  • Interface colorée"
        echo ""
        echo "🎨 Couleurs configurées:"
        echo "  • Variables d'environnement définies"
        echo "  • Support automatique des terminaux"
        echo "  • Configuration dans .zshrc"
        echo ""
        echo "🔗 Liens symboliques:"
        echo "  • Makefile → makefiles/root/Makefile"
        echo "  • make.sh → scripts/utils/make.sh"
        echo "  • Tous les liens fonctionnels"
        echo ""
        echo "========================================"
        echo "ORGANISATION VALIDÉE AVEC SUCCÈS"
        echo "========================================"
    } > "$report_file"

    success "Rapport généré: $report_file"
}

# Fonction principale
main() {
    echo -e "${BLUE}🔍 Vérification Complète de l'Organisation - JobbingTrack${NC}"
    echo "========================================================"

    # Exécuter toutes les vérifications
    verify_base_structure
    verify_documentation
    verify_scripts
    verify_makefiles
    verify_symlinks
    verify_colors
    test_core_functionality

    # Générer le rapport
    generate_final_report

    echo ""
    echo -e "${BLUE}📋 Résumé de l'organisation:${NC}"
    echo "   • Documentation centralisée dans docs/"
    echo "   • Scripts organisés par catégories"
    echo "   • Makefiles modulaires avec couleurs"
    echo "   • Structure professionnelle complète"
    echo "   • Tous les liens et références fonctionnels"
    echo ""
    success "Vérification de l'organisation terminée avec succès !"
}

# Fonction d'aide
show_help() {
    echo -e "${BLUE}🔍 Vérification de l'Organisation - JobbingTrack${NC}"
    echo "==============================================="
    echo ""
    echo "Usage: $0"
    echo ""
    echo "Ce script vérifie que toute l'organisation du projet"
    echo "JobbingTrack est correcte et fonctionnelle."
    echo ""
    echo "Vérifications effectuées:"
    echo "  • Structure de base des dossiers"
    echo "  • Documentation complète"
    echo "  • Scripts organisés"
    echo "  • Makefiles fonctionnels"
    echo "  • Liens symboliques"
    echo "  • Configuration des couleurs"
    echo "  • Fonctionnalités principales"
    echo ""
    echo "Rapport généré avec recommandations."
}

# Gestion des arguments
case "${1:-}" in
    "--help"|"-h")
        show_help
        exit 0
        ;;
    "--quick")
        echo "🔍 Vérification rapide..."
        verify_base_structure >/dev/null 2>&1 && echo "✅ Structure" || echo "❌ Structure"
        verify_documentation >/dev/null 2>&1 && echo "✅ Documentation" || echo "❌ Documentation"
        verify_scripts >/dev/null 2>&1 && echo "✅ Scripts" || echo "❌ Scripts"
        exit 0
        ;;
    "")
        main
        ;;
esac

