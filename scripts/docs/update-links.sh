#!/usr/bin/env bash

# ============================================================================
# Script de mise à jour des liens de documentation - JobbingTrack
# ============================================================================
# Met à jour automatiquement tous les liens dans les fichiers de documentation
# pour qu'ils pointent vers la branche principale (main) au lieu de feat/frontend-dashboard
#
# Usage: ./scripts/docs/update-links.sh [OPTIONS]
#
# Options:
#   --dry-run         Afficher les changements sans les appliquer
#   --target-branch   Branche cible (défaut: main)
#   --source-branch   Branche source à remplacer (défaut: feat/frontend-dashboard)
#   --help           Afficher cette aide
#
# Exemples:
#   ./scripts/docs/update-links.sh
#   ./scripts/docs/update-links.sh --dry-run
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
TARGET_BRANCH="main"
SOURCE_BRANCH="feat/frontend-dashboard"

# Fonction d'aide
show_help() {
    echo -e "${BLUE}🔗 Mise à jour des liens - JobbingTrack${NC}"
    echo "===================================="
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --dry-run         Afficher les changements sans les appliquer"
    echo "  --target-branch   Branche cible (défaut: main)"
    echo "  --source-branch   Branche source à remplacer (défaut: feat/frontend-dashboard)"
    echo "  --help           Afficher cette aide"
    echo ""
    echo "Exemples:"
    echo "  $0                           # Mise à jour complète"
    echo "  $0 --dry-run                 # Aperçu des changements"
    echo "  $0 --target-branch develop    # Vers branche develop"
    echo ""
    echo "Liens modifiés:"
    echo "  • GitHub blob links (raw content)"
    echo "  • GitHub raw links (PDF downloads)"
    echo "  • Références croisées entre documents"
}

# Gestion des arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --target-branch)
            TARGET_BRANCH="$2"
            shift 2
            ;;
        --source-branch)
            SOURCE_BRANCH="$2"
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

# Fonction pour mettre à jour les liens dans un fichier
update_file_links() {
    local file="$1"
    local changes_made=0

    echo -e "\n${YELLOW}📄 Traitement de: $file${NC}"

    # Créer une sauvegarde temporaire
    local temp_file=$(mktemp)

    # Mettre à jour les liens GitHub
    sed -E \
        -e "s|github\.com/[^/]+/[^/]+/blob/${SOURCE_BRANCH}/|github.com/PavelDelhomme/JobbingTrack/blob/${TARGET_BRANCH}/|g" \
        -e "s|github\.com/[^/]+/[^/]+/raw/${SOURCE_BRANCH}/|github.com/PavelDelhomme/JobbingTrack/raw/${TARGET_BRANCH}/|g" \
        "$file" > "$temp_file"

    # Vérifier si des changements ont été apportés
    if ! diff -q "$file" "$temp_file" >/dev/null 2>&1; then
        changes_made=1

        if [ "$DRY_RUN" = true ]; then
            echo -e "${YELLOW}🔍 Changements détectés (mode dry-run):${NC}"
            diff "$file" "$temp_file" | head -10
        else
            echo -e "${GREEN}✅ Liens mis à jour${NC}"
            mv "$temp_file" "$file"
        fi
    else
        echo -e "${GREEN}✅ Aucun changement nécessaire${NC}"
    fi

    # Nettoyer le fichier temporaire
    rm -f "$temp_file"

    return $changes_made
}

# Fonction pour traiter tous les fichiers de documentation
update_all_docs() {
    local docs_dir="$PROJECT_ROOT/docs"
    local files_updated=0

    echo -e "${BLUE}🔗 Mise à jour des liens de documentation${NC}"
    echo "========================================="
    echo "Branche source: $SOURCE_BRANCH"
    echo "Branche cible: $TARGET_BRANCH"
    echo ""

    # Traitement des fichiers dans docs/
    if [ -d "$docs_dir" ]; then
        echo -e "${YELLOW}📁 Traitement du dossier docs/${NC}"

        while IFS= read -r -d '' file; do
            if [[ "$file" =~ \.md$ ]]; then
                if update_file_links "$file"; then
                    ((files_updated++))
                fi
            fi
        done < <(find "$docs_dir" -name "*.md" -print0)
    fi

    # Traitement du README principal
    if [ -f "$PROJECT_ROOT/README.md" ]; then
        echo -e "\n${YELLOW}📄 Traitement du README principal${NC}"
        if update_file_links "$PROJECT_ROOT/README.md"; then
            ((files_updated++))
        fi
    fi

    # Résumé
    echo -e "\n${BLUE}📊 Résumé de la mise à jour${NC}"
    echo "=========================="

    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}🔍 Mode dry-run: $files_updated fichier(s) contiendraient des modifications${NC}"
    else
        echo -e "${GREEN}✅ $files_updated fichier(s) mis à jour${NC}"
    fi

    echo ""
    echo -e "${BLUE}🔄 Liens remplacés:${NC}"
    echo "   $SOURCE_BRANCH → $TARGET_BRANCH"

    # Retourner 0 pour indiquer le succès, même si aucun fichier n'a été modifié
    return 0
}

# Fonction principale
main() {
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}🔍 MODE DRY-RUN - Aucun fichier ne sera modifié${NC}"
    fi

    if ! update_all_docs; then
        echo -e "${RED}❌ Échec de la mise à jour des liens${NC}"
        exit 1
    fi

    if [ "$DRY_RUN" = true ]; then
        echo -e "\n${YELLOW}💡 Utilisez sans --dry-run pour appliquer les changements${NC}"
    else
        echo -e "\n${GREEN}✅ Mise à jour des liens terminée avec succès !${NC}"
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
