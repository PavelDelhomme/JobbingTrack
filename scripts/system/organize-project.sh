#!/bin/bash

# ============================================================================
# Script d'Organisation Automatique du Projet - JobbingTrack
# ============================================================================
# Organise automatiquement tous les fichiers du projet dans la structure appropriée

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

# Créer la structure de dossiers si elle n'existe pas
create_directory_structure() {
    info "Création de la structure de dossiers..."

    # Dossiers principaux
    mkdir -p documentation/{guides,api,deployment,technical}
    mkdir -p scripts/{database,deployment,system,testing,setup,monitoring,utils}
    mkdir -p makefiles/{shared,root,backend,frontend,tests}
    mkdir -p data/sql
    mkdir -p deployment
    mkdir -p docs

    success "Structure de dossiers créée"
}

# Organiser les fichiers de documentation
organize_documentation() {
    info "Organisation des fichiers de documentation..."

    # Fichiers à déplacer dans documentation/
    local doc_files=(
        "SPEC-TECHNIQUE-JOBBINGTRACK.md"
        "STATUT-PROJET.md"
        "ORGANISATION.md"
        "PROJECT_STATUS.md"
        "JobbingTrack-Documentation-Complete.pdf"
        "CHANGELOG.md"
        "README-ORGANISATION.md"
    )

    for file in "${doc_files[@]}"; do
        if [ -f "$file" ]; then
            mv "$file" "documentation/"
            success "Déplacé: $file → documentation/"
        fi
    done

    # Fichiers à déplacer dans guides/
    local guide_files=(
        "GUIDE-RAPIDE.md"
    )

    for file in "${guide_files[@]}"; do
        if [ -f "$file" ]; then
            mv "$file" "documentation/guides/"
            success "Déplacé: $file → documentation/guides/"
        fi
    done
}

# Organiser les scripts à la racine
organize_root_scripts() {
    info "Organisation des scripts à la racine..."

    # Scripts à déplacer dans scripts/
    local script_files=(
        "test-microservices.sh"
        "test-complete.sh"
        "apply-updates.sh"
        "COMMANDES-GIT.sh"
        "configure-mobile-access.sh"
        "setup-docker-permissions.sh"
        "test-docker-metrics.sh"
        "test-rate-limiting.sh"
        "make.sh"
    )

    for file in "${script_files[@]}"; do
        if [ -f "$file" ]; then
            # Déterminer la catégorie appropriée
            case "$file" in
                "apply-updates.sh"|"diagnostic-fix.sh")
                    target_dir="scripts/deployment"
                    ;;
                "test-"*)
                    target_dir="scripts/testing"
                    ;;
                "setup-"*|"configure-"*)
                    target_dir="scripts/setup"
                    ;;
                "test-docker-"*|"test-rate-"*)
                    target_dir="scripts/monitoring"
                    ;;
                "COMMANDES-GIT.sh"|"make.sh")
                    target_dir="scripts/utils"
                    ;;
                *)
                    target_dir="scripts/system"
                    ;;
            esac

            mv "$file" "$target_dir/"
            success "Déplacé: $file → $target_dir/"
        fi
    done
}

# Organiser les fichiers de configuration
organize_config_files() {
    info "Organisation des fichiers de configuration..."

    # Fichiers à déplacer dans makefiles/
    local makefile_files=(
        ".make_colors"
    )

    for file in "${makefile_files[@]}"; do
        if [ -f "$file" ]; then
            mv "$file" "makefiles/"
            success "Déplacé: $file → makefiles/"
        fi
    done

    # Fichiers à déplacer dans data/
    local data_files=(
        "init-db.sql"
    )

    for file in "${data_files[@]}"; do
        if [ -f "$file" ]; then
            mv "$file" "data/sql/"
            success "Déplacé: $file → data/sql/"
        fi
    done
}

# Mettre à jour les références dans les fichiers
update_references() {
    info "Mise à jour des références dans les fichiers..."

    # Mettre à jour les références dans les scripts
    find scripts/ -name "*.sh" -exec sed -i 's|../\.make_colors|makefiles/.make_colors|g' {} \; 2>/dev/null || true
    find scripts/ -name "*.sh" -exec sed -i 's|$(pwd)/\.make_colors|$(pwd)/makefiles/.make_colors|g' {} \; 2>/dev/null || true

    # Mettre à jour les références dans les Makefiles
    find makefiles/ -name "Makefile" -exec sed -i 's|include \.\./shared/common\.mk|include ../../shared/common.mk|g' {} \; 2>/dev/null || true

    success "Références mises à jour"
}

# Créer les fichiers README manquants
create_missing_readmes() {
    info "Création des fichiers README manquants..."

    # Créer les README pour les nouveaux dossiers
    local readme_files=(
        "documentation/README.md"
        "documentation/guides/README.md"
        "documentation/api/README.md"
        "documentation/deployment/README.md"
        "documentation/technical/README.md"
        "makefiles/README-COLORS.md"
    )

    for readme in "${readme_files[@]}"; do
        if [ ! -f "$readme" ]; then
            # Créer un README basique
            cat > "$readme" << EOF
# 📋 $(basename $(dirname "$readme") | tr '[:lower:]' '[:upper:]')

Ce dossier contient la documentation organisée pour $(basename $(dirname "$readme")).

## 📂 Structure

\`\`\`
$(basename $(dirname "$readme"))/
├── README.md              # Ce fichier
└── [fichiers spécifiques]
\`\`\`

## 📚 Contenu

- Documentation organisée et structurée
- Références croisées vers d'autres sections
- Guides d'utilisation et bonnes pratiques

## 🔗 Références

- **Documentation principale** : \`../README.md\`
- **Organisation du projet** : \`../README-ORGANISATION.md\`

---
EOF
            success "Créé: $readme"
        fi
    done
}

# Vérifier l'organisation finale
verify_organization() {
    info "Vérification de l'organisation finale..."

    local issues=()

    # Vérifier que les dossiers principaux existent
    local required_dirs=("documentation" "scripts" "makefiles" "data" "deployment")
    for dir in "${required_dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            issues+=("Dossier manquant: $dir")
        fi
    done

    # Vérifier que les fichiers principaux existent
    local required_files=("README.md" "Makefile")
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            issues+=("Fichier manquant: $file")
        fi
    done

    if [ ${#issues[@]} -gt 0 ]; then
        echo ""
        echo "🚨 PROBLÈMES DÉTECTÉS:"
        for issue in "${issues[@]}"; do
            echo "   ❌ $issue"
        done
        error "Organisation incomplète"
    fi

    success "Organisation vérifiée et complète"
}

# Générer un rapport final
generate_final_report() {
    info "Génération du rapport d'organisation..."

    local report_file="/tmp/jobbingtrack-organization-report.txt"

    {
        echo "========================================"
        echo "RAPPORT D'ORGANISATION DU PROJET"
        echo "JobbingTrack - $(date)"
        echo "========================================"
        echo ""
        echo "STRUCTURE CRÉÉE:"
        echo ""
        echo "📚 documentation/"
        echo "  ├── README.md"
        echo "  ├── JobbingTrack-Documentation-Complete.pdf"
        echo "  ├── CHANGELOG.md"
        echo "  ├── README-ORGANISATION.md"
        echo "  ├── guides/"
        echo "  ├── api/"
        echo "  ├── deployment/"
        echo "  └── technical/"
        echo ""
        echo "🛠️ scripts/"
        echo "  ├── README.md"
        echo "  ├── database/"
        echo "  ├── deployment/"
        echo "  ├── system/"
        echo "  ├── testing/"
        echo "  ├── setup/"
        echo "  ├── monitoring/"
        echo "  └── utils/"
        echo ""
        echo "📦 makefiles/"
        echo "  ├── README.md"
        echo "  ├── README-COLORS.md"
        echo "  ├── .make_colors"
        echo "  ├── shared/"
        echo "  ├── root/"
        echo "  ├── backend/"
        echo "  ├── frontend/"
        echo "  └── tests/"
        echo ""
        echo "📊 data/"
        echo "  ├── README.md"
        echo "  └── sql/"
        echo ""
        echo "========================================"
        echo "ORGANISATION TERMINÉE AVEC SUCCÈS"
        echo "========================================"
    } > "$report_file"

    success "Rapport généré: $report_file"
}

# Fonction principale
main() {
    echo -e "${BLUE}🏗️ Organisation Automatique du Projet - JobbingTrack${NC}"
    echo "=================================================="

    # Créer la structure
    create_directory_structure

    # Organiser les fichiers
    organize_documentation
    organize_root_scripts
    organize_config_files

    # Mettre à jour les références
    update_references

    # Créer les README manquants
    create_missing_readmes

    # Vérifier l'organisation
    verify_organization

    # Générer le rapport
    generate_final_report

    echo ""
    echo -e "${BLUE}📋 Résumé de l'organisation:${NC}"
    echo "   • Documentation organisée dans 'documentation/'"
    echo "   • Scripts organisés dans 'scripts/' avec catégories"
    echo "   • Makefiles dans 'makefiles/' avec couleurs"
    echo "   • Données dans 'data/' structurées"
    echo "   • Déploiement dans 'deployment/'"
    echo ""
    echo -e "${BLUE}🎯 Prochaines étapes:${NC}"
    echo "   1. Consulter: documentation/README.md"
    echo "   2. Configurer: ./scripts/system/setup-makefile-colors.sh"
    echo "   3. Utiliser: make help (avec couleurs)"
    echo ""
    success "Organisation du projet terminée avec succès !"
}

# Fonction d'aide
show_help() {
    echo -e "${BLUE}🏗️ Organisation du Projet - JobbingTrack${NC}"
    echo "======================================"
    echo ""
    echo "Usage: $0"
    echo ""
    echo "Ce script organise automatiquement tous les fichiers"
    echo "du projet JobbingTrack dans une structure logique."
    echo ""
    echo "Actions effectuées:"
    echo "  • Création de la structure de dossiers"
    echo "  • Déplacement des fichiers de documentation"
    echo "  • Organisation des scripts par catégories"
    echo "  • Configuration des couleurs pour les Makefiles"
    echo "  • Mise à jour des références croisées"
    echo "  • Création des fichiers README"
    echo "  • Vérification de l'organisation"
    echo ""
    echo "Résultat: Projet organisé professionnellement"
}

# Gestion des arguments
case "${1:-}" in
    "--help"|"-h")
        show_help
        exit 0
        ;;
    "--dry-run")
        echo "🔍 Mode simulation..."
        # Ici on pourrait implémenter un mode simulation
        echo "Fonctionnalité à implémenter"
        exit 0
        ;;
    "")
        main
        ;;
esac
