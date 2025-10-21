#!/usr/bin/env bash

# ============================================================================
# Script de correction des liens GitHub - JobbingTrack
# ============================================================================
# Remplace tous les liens GitHub absolus par des liens relatifs dans les fichiers de documentation
#
# Usage: ./scripts/docs/fix-github-links.sh [OPTIONS]
#
# Options:
#   --dry-run         Afficher les changements sans les appliquer
#   --verbose         Mode verbeux avec détails des modifications
#   --target-branch   Branche cible (défaut: main)
#   --help           Afficher cette aide
#
# Exemples:
#   ./scripts/docs/fix-github-links.sh
#   ./scripts/docs/fix-github-links.sh --dry-run --verbose
# ============================================================================

set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DRY_RUN=false
VERBOSE=false
TARGET_BRANCH="main"

# Fonction d'aide
show_help() {
    echo -e "${BLUE}🔗 Correction des liens GitHub - JobbingTrack${NC}"
    echo "============================================"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --dry-run         Afficher les changements sans les appliquer"
    echo "  --verbose         Mode verbeux avec détails des modifications"
    echo "  --target-branch   Branche cible (défaut: main)"
    echo "  --help           Afficher cette aide"
    echo ""
    echo "Exemples:"
    echo "  $0                           # Correction complète"
    echo "  $0 --dry-run --verbose       # Aperçu détaillé des changements"
    echo ""
    echo "Liens modifiés:"
    echo "  • GitHub blob links → Liens relatifs (docs/file.md)"
    echo "  • GitHub raw links → Liens vers PDFs (docs/pdfs/file.pdf)"
    echo "  • Liens racine → Liens absolus (/README.md)"
}

# Gestion des arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --target-branch)
            TARGET_BRANCH="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Option inconnue: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Fonction de logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Fonction pour corriger les liens dans un fichier
fix_file_links() {
    local file="$1"
    local changes_made=0

    if [[ ! -f "$file" ]]; then
        log_error "Fichier introuvable: $file"
        return 1
    fi

    log_info "📄 Traitement de: $file"

    # Créer une sauvegarde temporaire
    local temp_file=$(mktemp)

    while IFS= read -r line; do
        local original_line="$line"
        local updated_line="$line"

        # Remplacer les liens GitHub blob vers des fichiers dans docs/
        updated_line=$(echo "$updated_line" | sed -E 's|https://github\.com/[^/]+/[^/]+/blob/[^/]+/docs/([^)]+\.md)|docs/\1|g')

        # Remplacer les liens GitHub blob vers des fichiers à la racine
        updated_line=$(echo "$updated_line" | sed -E 's|https://github\.com/[^/]+/[^/]+/blob/[^/]+/([^)]+\.md)|/\1|g')

        # Remplacer les liens GitHub raw vers des PDFs
        updated_line=$(echo "$updated_line" | sed -E 's|https://github\.com/[^/]+/[^/]+/raw/[^/]+/docs/pdfs/([^)]+\.pdf)|docs/pdfs/\1|g')

        # Remplacer les liens GitHub raw vers des fichiers à la racine
        updated_line=$(echo "$updated_line" | sed -E 's|https://github\.com/[^/]+/[^/]+/raw/[^/]+/([^)]+\.md)|/\1|g')

        # Remplacer les liens GitHub blob vers des fichiers dans le dossier racine (cas spécifique)
        updated_line=$(echo "$updated_line" | sed -E 's|https://github\.com/[^/]+/[^/]+/blob/[^/]+/GUIDE-DEMARRAGE-RAPIDE\.md|GUIDE-DEMARRAGE-RAPIDE.md|g')
        updated_line=$(echo "$updated_line" | sed -E 's|https://github\.com/[^/]+/[^/]+/blob/[^/]+/VERSION\.md|VERSION.md|g')

        # Remplacer les liens GitHub blob vers des fichiers dans technical/
        updated_line=$(echo "$updated_line" | sed -E 's|https://github\.com/[^/]+/[^/]+/blob/[^/]+/docs/technical/([^)]+\.md)|docs/\1|g')

        # Remplacer les liens GitHub blob vers des fichiers dans guides/
        updated_line=$(echo "$updated_line" | sed -E 's|https://github\.com/[^/]+/[^/]+/blob/[^/]+/docs/guides/([^)]+\.md)|docs/\1|g')

        # Remplacer les liens GitHub blob vers des fichiers dans api/v1/
        updated_line=$(echo "$updated_line" | sed -E 's|https://github\.com/[^/]+/[^/]+/blob/[^/]+/docs/api/v1/([^)]+\.md)|docs/\1|g')

        # Remplacer les liens GitHub blob vers des fichiers dans deployment/
        updated_line=$(echo "$updated_line" | sed -E 's|https://github\.com/[^/]+/[^/]+/blob/[^/]+/docs/deployment/([^)]+\.md)|docs/\1|g')

        if [[ "$updated_line" != "$original_line" ]]; then
            ((changes_made++))
            if [[ "$VERBOSE" == "true" ]]; then
                log_info "  🔄 Lien corrigé dans $file"
            fi
        fi

        echo "$updated_line" >> "$temp_file"
    done < "$file"

    if [[ $changes_made -gt 0 ]]; then
        if [[ "$DRY_RUN" == "true" ]]; then
            log_warning "🔍 Mode dry-run: $changes_made changement(s) détecté(s) dans $file"
            # Afficher quelques exemples de changements
            diff "$file" "$temp_file" | head -5
        else
            mv "$temp_file" "$file"
            log_success "✅ $changes_made lien(s) corrigé(s) dans $file"
        fi
    else
        log_info "✅ Aucun lien à corriger dans $file"
    fi

    # Nettoyer le fichier temporaire
    rm -f "$temp_file"
}

# Fonction principale
main() {
    echo -e "${BLUE}🔗 Correction des liens GitHub dans la documentation${NC}"
    echo "=================================================="

    if [[ "$DRY_RUN" == "true" ]]; then
        log_warning "🔍 MODE DRY-RUN - Aucun fichier ne sera modifié"
    fi

    local files_updated=0
    local total_changes=0

    # Traitement du README principal
    if [[ -f "$PROJECT_ROOT/README.md" ]]; then
        log_info "📄 Traitement du README principal"
        fix_file_links "$PROJECT_ROOT/README.md"
        total_changes=$((total_changes + $?))
        ((files_updated++))
    fi

    # Traitement des fichiers dans docs/
    if [[ -d "$PROJECT_ROOT/docs" ]]; then
        log_info "📁 Traitement du dossier docs/"

        while IFS= read -r -d '' file; do
            if [[ "$file" =~ \.md$ ]]; then
                fix_file_links "$file"
                total_changes=$((total_changes + $?))
                ((files_updated++))
            fi
        done < <(find "$PROJECT_ROOT/docs" -name "*.md" -print0)
    fi

    # Traitement des fichiers dans docs/pdfs/
    if [[ -d "$PROJECT_ROOT/docs/pdfs" ]]; then
        log_info "📁 Traitement du dossier docs/pdfs/"

        while IFS= read -r -d '' file; do
            if [[ "$file" =~ \.md$ ]]; then
                fix_file_links "$file"
                total_changes=$((total_changes + $?))
                ((files_updated++))
            fi
        done < <(find "$PROJECT_ROOT/docs/pdfs" -name "*.md" -print0)
    fi

    # Résumé
    echo -e "\n${BLUE}📊 Résumé de la correction${NC}"
    echo "=========================="

    if [[ "$DRY_RUN" == "true" ]]; then
        log_warning "🔍 Mode dry-run: $files_updated fichier(s) contiendraient $total_changes modification(s)"
    else
        log_success "✅ $files_updated fichier(s) traité(s)"
        log_success "✅ $total_changes lien(s) corrigé(s) au total"
    fi

    echo ""
    echo -e "${BLUE}🔄 Types de corrections appliquées:${NC}"
    echo "   • Liens GitHub blob → Liens relatifs (docs/file.md)"
    echo "   • Liens GitHub raw → Liens PDFs (docs/pdfs/file.pdf)"
    echo "   • Liens racine → Liens absolus (/file.md)"

    if [[ "$DRY_RUN" == "true" ]]; then
        echo -e "\n${YELLOW}💡 Utilisez sans --dry-run pour appliquer les corrections${NC}"
    else
        echo -e "\n${GREEN}✅ Correction des liens terminée avec succès !${NC}"
        echo ""
        echo -e "${BLUE}🎯 Prochaines étapes:${NC}"
        echo "   1. Vérifiez les modifications avec 'git diff'"
        echo "   2. Testez les liens pour vous assurer qu'ils fonctionnent"
        echo "   3. Committez les changements si tout est correct"
    fi

    return 0
}

# Exécution
main "$@"
