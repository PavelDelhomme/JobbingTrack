#!/usr/bin/env bash

# ============================================================================
# Script de mise à jour des liens - JobbingTrack
# ============================================================================
# Met à jour tous les liens dans la documentation pour qu'ils soient relatifs
# ============================================================================

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonctions de logging
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

# Fonction d'aide
show_help() {
    cat << EOF
Usage: $0 [OPTIONS]

Met à jour tous les liens dans la documentation pour qu'ils soient relatifs.

OPTIONS:
    --help          Afficher cette aide
    --dry-run       Afficher les changements sans les appliquer
    --verbose       Mode verbeux
    --fix-all       Corriger tous les liens automatiquement

EXEMPLES:
    $0                    # Mise à jour standard
    $0 --dry-run          # Voir les changements sans les appliquer
    $0 --verbose          # Mode verbeux
    $0 --fix-all          # Corriger automatiquement

EOF
}

# Variables par défaut
DRY_RUN=false
VERBOSE=false
FIX_ALL=false
PROJECT_ROOT="$(dirname "$0")/../.."

# Traitement des arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --help)
            show_help
            exit 0
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --fix-all)
            FIX_ALL=true
            shift
            ;;
        *)
            log_error "Option inconnue: $1"
            show_help
            exit 1
            ;;
    esac
done

# Aller à la racine du projet
cd "$PROJECT_ROOT"

log_info "🔗 Mise à jour des liens dans la documentation JobbingTrack"
log_info "📁 Répertoire de travail: $(pwd)"

if [[ "$DRY_RUN" == "true" ]]; then
    log_warning "🔍 Mode DRY-RUN activé - Aucun changement ne sera appliqué"
fi

# Fonction pour mettre à jour les liens dans un fichier
update_links_in_file() {
    local file="$1"
    
    if [[ ! -f "$file" ]]; then
        log_error "Fichier introuvable: $file"
        return 1
    fi
    
    log_info "📄 Mise à jour de: $file"
    
    local temp_file=$(mktemp)
    local changes_made=false
    
    while IFS= read -r line; do
        local original_line="$line"
        local updated_line="$line"
        
        # Remplacer les liens GitHub absolus par des liens relatifs
        # Exemple: https://github.com/user/repo/blob/branch/docs/file.md -> docs/file.md
        if [[ "$line" =~ https://github\.com/[^/]+/[^/]+/blob/[^/]+/(.*) ]]; then
            local relative_path="${BASH_REMATCH[1]}"
            updated_line=$(echo "$line" | sed "s|https://github\.com/[^/]*/[^/]*/blob/[^/]*/$relative_path|$relative_path|g")
            if [[ "$updated_line" != "$original_line" ]]; then
                changes_made=true
                if [[ "$VERBOSE" == "true" ]]; then
                    log_info "  🔄 Lien mis à jour: $relative_path"
                fi
            fi
        fi
        
        # Remplacer les liens vers la racine du repo
        # Exemple: https://github.com/user/repo/blob/branch/README.md -> /README.md
        if [[ "$line" =~ https://github\.com/[^/]+/[^/]+/blob/[^/]+/([^/]+\.md) ]]; then
            local filename="${BASH_REMATCH[1]}"
            updated_line=$(echo "$line" | sed "s|https://github\.com/[^/]*/[^/]*/blob/[^/]*/$filename|/$filename|g")
            if [[ "$updated_line" != "$original_line" ]]; then
                changes_made=true
                if [[ "$VERBOSE" == "true" ]]; then
                    log_info "  🔄 Lien racine mis à jour: /$filename"
                fi
            fi
        fi
        
        echo "$updated_line" >> "$temp_file"
    done < "$file"
    
    if [[ "$changes_made" == "true" ]]; then
        if [[ "$DRY_RUN" == "true" ]]; then
            log_warning "  📝 Changements détectés (non appliqués)"
            if [[ "$VERBOSE" == "true" ]]; then
                echo "    Différences:"
                diff "$file" "$temp_file" || true
            fi
        else
            mv "$temp_file" "$file"
            log_success "  ✅ Fichier mis à jour"
        fi
    else
        rm "$temp_file"
        log_info "  ℹ️  Aucun changement nécessaire"
    fi
}

# Fonction pour ajouter la navigation standard
add_navigation() {
    local file="$1"
    local relative_path="$2"
    
    # Déterminer le niveau de navigation basé sur le chemin
    local nav_level=""
    if [[ "$relative_path" =~ ^docs/ ]]; then
        nav_level="../"
    elif [[ "$relative_path" =~ ^scripts/ ]]; then
        nav_level="../../"
    fi
    
    # Vérifier si la navigation existe déjà
    if grep -q "← Retour au README principal" "$file"; then
        return 0
    fi
    
    log_info "  📝 Ajout de la navigation standard"
    
    # Créer le contenu de navigation
    local nav_content="
---

[← Retour au README principal](${nav_level}README.md) | [Documentation complète](${nav_level}docs/README.md)
"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_warning "  📝 Navigation à ajouter (non appliquée)"
    else
        echo "$nav_content" >> "$file"
        log_success "  ✅ Navigation ajoutée"
    fi
}

# Fonction principale
main() {
    local files_updated=0
    local files_processed=0
    
    # Traiter le README principal
    log_info "📋 Mise à jour du README principal..."
    update_links_in_file "README.md"
    ((files_processed++))
    
    # Traiter la documentation
    if [[ -d "docs" ]]; then
        log_info "📋 Mise à jour de la documentation..."
        for file in docs/*.md; do
            if [[ -f "$file" ]]; then
                update_links_in_file "$file"
                add_navigation "$file" "$file"
                ((files_processed++))
            fi
        done
    fi
    
    # Traiter les scripts
    if [[ -d "scripts" ]]; then
        log_info "📋 Mise à jour des scripts..."
        find scripts -name "README.md" -type f | while read -r file; do
            update_links_in_file "$file"
            add_navigation "$file" "$file"
            ((files_processed++))
        done
    fi
    
    # Résumé
    echo ""
    log_info "📊 Résumé de la mise à jour:"
    log_info "📄 Fichiers traités: $files_processed"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_warning "🔍 Mode DRY-RUN - Aucun changement appliqué"
        log_info "💡 Utilisez sans --dry-run pour appliquer les changements"
    else
        log_success "✅ Mise à jour terminée!"
    fi
    
    # Suggestions
    echo ""
    log_info "💡 Suggestions:"
    echo "   1. Vérifiez que tous les liens fonctionnent"
    echo "   2. Testez la navigation entre les documents"
    echo "   3. Vérifiez sur différentes branches"
    echo "   4. Utilisez ./scripts/docs/verify-links.sh pour vérifier"
}

# Exécuter la fonction principale
main "$@"