#!/usr/bin/env bash

# ============================================================================
# Script simple de correction des liens GitHub - JobbingTrack
# ============================================================================
# Remplace tous les liens GitHub absolus par des liens relatifs dans les fichiers de documentation
#
# Usage: ./scripts/docs/simple-fix-links.sh [OPTIONS]
#
# Options:
#   --dry-run         Afficher les changements sans les appliquer
#   --help           Afficher cette aide
#
# Exemples:
#   ./scripts/docs/simple-fix-links.sh
#   ./scripts/docs/simple-fix-links.sh --dry-run
# ============================================================================

set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DRY_RUN=false

# Fonction d'aide
show_help() {
    echo -e "${BLUE}🔗 Correction simple des liens GitHub - JobbingTrack${NC}"
    echo "=================================================="
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --dry-run         Afficher les changements sans les appliquer"
    echo "  --help           Afficher cette aide"
    echo ""
    echo "Exemples:"
    echo "  $0                           # Correction complète"
    echo "  $0 --dry-run                 # Aperçu des changements"
    echo ""
    echo "Liens modifiés:"
    echo "  • https://github.com/OWNER/JobbingTrack/blob/main/docs/file.md → docs/file.md"
    echo "  • https://github.com/OWNER/JobbingTrack/blob/main/README.md → /README.md"
    echo "  • https://github.com/OWNER/JobbingTrack/raw/main/docs/pdfs/file.pdf → docs/pdfs/file.pdf"
}

# Gestion des arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
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

# Fonction pour corriger les liens dans un fichier
fix_file_links() {
    local file="$1"
    local changes_made=0

    if [[ ! -f "$file" ]]; then
        return 1
    fi

    echo -e "📄 Traitement de: $file"

    # Créer une sauvegarde temporaire
    local temp_file=$(mktemp)

    while IFS= read -r line; do
        local original_line="$line"
        local updated_line="$line"

        # Remplacer tous les liens GitHub blob par des liens relatifs
        updated_line=$(echo "$updated_line" | sed 's|https://github\.com/OWNER/JobbingTrack/blob/main/|/|g')
        updated_line=$(echo "$updated_line" | sed 's|https://github\.com/OWNER/JobbingTrack/blob/main/docs/|docs/|g')
        updated_line=$(echo "$updated_line" | sed 's|https://github\.com/OWNER/JobbingTrack/blob/main/docs/pdfs/|docs/pdfs/|g')
        updated_line=$(echo "$updated_line" | sed 's|https://github\.com/OWNER/JobbingTrack/blob/main/docs/guides/|docs/|g')
        updated_line=$(echo "$updated_line" | sed 's|https://github\.com/OWNER/JobbingTrack/blob/main/docs/technical/|docs/|g')
        updated_line=$(echo "$updated_line" | sed 's|https://github\.com/OWNER/JobbingTrack/blob/main/docs/api/|docs/|g')
        updated_line=$(echo "$updated_line" | sed 's|https://github\.com/OWNER/JobbingTrack/blob/main/docs/deployment/|docs/|g')
        updated_line=$(echo "$updated_line" | sed 's|https://github\.com/OWNER/JobbingTrack/blob/main/docs/scripts/|scripts/|g')

        # Remplacer les liens GitHub raw par des liens vers les PDFs
        updated_line=$(echo "$updated_line" | sed 's|https://github\.com/OWNER/JobbingTrack/raw/main/docs/pdfs/|docs/pdfs/|g')

        if [[ "$updated_line" != "$original_line" ]]; then
            ((changes_made++))
        fi

        echo "$updated_line" >> "$temp_file"
    done < "$file"

    if [[ $changes_made -gt 0 ]]; then
        if [[ "$DRY_RUN" == "true" ]]; then
            echo -e "${YELLOW}🔍 Mode dry-run: $changes_made changement(s) détecté(s) dans $file${NC}"
            # Afficher quelques exemples de changements
            diff "$file" "$temp_file" | head -5
        else
            mv "$temp_file" "$file"
            echo -e "${GREEN}✅ $changes_made lien(s) corrigé(s) dans $file${NC}"
        fi
    else
        echo -e "${GREEN}✅ Aucun lien à corriger dans $file${NC}"
    fi

    # Nettoyer le fichier temporaire
    rm -f "$temp_file"
}

# Fonction principale
main() {
    echo -e "${BLUE}🔗 Correction simple des liens GitHub dans la documentation${NC}"
    echo "=========================================================="

    if [[ "$DRY_RUN" == "true" ]]; then
        echo -e "${YELLOW}🔍 MODE DRY-RUN - Aucun fichier ne sera modifié${NC}"
    fi

    local files_updated=0
    local total_changes=0

    # Traitement du README principal
    if [[ -f "$PROJECT_ROOT/README.md" ]]; then
        echo -e "\n${YELLOW}📄 Traitement du README principal${NC}"
        fix_file_links "$PROJECT_ROOT/README.md"
        total_changes=$((total_changes + $?))
        ((files_updated++))
    fi

    # Traitement des fichiers dans docs/
    if [[ -d "$PROJECT_ROOT/docs" ]]; then
        echo -e "\n${YELLOW}📁 Traitement du dossier docs/${NC}"

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
        echo -e "\n${YELLOW}📁 Traitement du dossier docs/pdfs/${NC}"

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
        echo -e "${YELLOW}🔍 Mode dry-run: $files_updated fichier(s) contiendraient $total_changes modification(s)${NC}"
    else
        echo -e "${GREEN}✅ $files_updated fichier(s) traité(s)${NC}"
        echo -e "${GREEN}✅ $total_changes lien(s) corrigé(s) au total${NC}"
    fi

    echo ""
    echo -e "${BLUE}🔄 Types de corrections appliquées:${NC}"
    echo "   • Liens GitHub blob → Liens relatifs (/file.md, docs/file.md)"
    echo "   • Liens GitHub raw → Liens PDFs (docs/pdfs/file.pdf)"

    if [[ "$DRY_RUN" == "true" ]]; then
        echo -e "\n${YELLOW}💡 Utilisez sans --dry-run pour appliquer les corrections${NC}"
    else
        echo -e "\n${GREEN}✅ Correction des liens terminée avec succès !${NC}"
    fi

    return 0
}

# Exécution
main "$@"
