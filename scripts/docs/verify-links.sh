#!/usr/bin/env bash

# ============================================================================
# Script de vérification des liens - JobbingTrack
# ============================================================================
# Vérifie que tous les liens relatifs dans la documentation fonctionnent
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

Vérifie que tous les liens relatifs dans la documentation fonctionnent.

OPTIONS:
    --help          Afficher cette aide
    --verbose       Mode verbeux
    --fix           Tenter de corriger les liens cassés
    --check-all     Vérifier tous les fichiers
    --check-file    Vérifier un fichier spécifique

EXEMPLES:
    $0                    # Vérification standard
    $0 --verbose          # Mode verbeux
    $0 --check-file README.md
    $0 --fix              # Tenter de corriger

EOF
}

# Variables par défaut
VERBOSE=false
FIX_LINKS=false
CHECK_ALL=false
SPECIFIC_FILE=""
PROJECT_ROOT="$(dirname "$0")/../.."
ERRORS=0
WARNINGS=0

# Traitement des arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --help)
            show_help
            exit 0
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --fix)
            FIX_LINKS=true
            shift
            ;;
        --check-all)
            CHECK_ALL=true
            shift
            ;;
        --check-file)
            SPECIFIC_FILE="$2"
            shift 2
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

log_info "🔍 Vérification des liens dans la documentation JobbingTrack"
log_info "📁 Répertoire de travail: $(pwd)"

# Fonction pour vérifier un lien
check_link() {
    local file="$1"
    local link="$2"
    local line_num="$3"
    
    # Nettoyer le lien (enlever les ancres)
    local clean_link=$(echo "$link" | sed 's/#.*$//')
    
    # Vérifier les différents types de liens
    if [[ "$clean_link" =~ ^https?:// ]]; then
        # Lien externe - on ne vérifie pas
        if [[ "$VERBOSE" == "true" ]]; then
            log_info "  🌐 Lien externe: $clean_link"
        fi
        return 0
    elif [[ "$clean_link" =~ ^/ ]]; then
        # Lien absolu vers la racine
        local target_path="$clean_link"
        if [[ -f "$target_path" ]]; then
            if [[ "$VERBOSE" == "true" ]]; then
                log_success "  ✅ Lien valide: $clean_link"
            fi
            return 0
        else
            log_error "  ❌ Fichier introuvable: $target_path (ligne $line_num dans $file)"
            ((ERRORS++))
            return 1
        fi
    elif [[ "$clean_link" =~ ^\.\./ ]]; then
        # Lien relatif vers le parent
        local file_dir=$(dirname "$file")
        local target_path="$file_dir/$clean_link"
        if [[ -f "$target_path" ]]; then
            if [[ "$VERBOSE" == "true" ]]; then
                log_success "  ✅ Lien valide: $clean_link"
            fi
            return 0
        else
            log_error "  ❌ Fichier introuvable: $target_path (ligne $line_num dans $file)"
            ((ERRORS++))
            return 1
        fi
    else
        # Lien relatif dans le même dossier
        local file_dir=$(dirname "$file")
        local target_path="$file_dir/$clean_link"
        if [[ -f "$target_path" ]]; then
            if [[ "$VERBOSE" == "true" ]]; then
                log_success "  ✅ Lien valide: $clean_link"
            fi
            return 0
        else
            log_error "  ❌ Fichier introuvable: $target_path (ligne $line_num dans $file)"
            ((ERRORS++))
            return 1
        fi
    fi
}

# Fonction pour vérifier un fichier
check_file() {
    local file="$1"
    
    if [[ ! -f "$file" ]]; then
        log_error "Fichier introuvable: $file"
        return 1
    fi
    
    log_info "📄 Vérification de: $file"
    
    local line_num=0
    while IFS= read -r line; do
        ((line_num++))
        
        # Chercher les liens markdown
        if [[ "$line" =~ \[([^\]]+)\]\(([^)]+)\) ]]; then
            local link_text="${BASH_REMATCH[1]}"
            local link_url="${BASH_REMATCH[2]}"
            
            if [[ "$VERBOSE" == "true" ]]; then
                log_info "  🔗 Lien trouvé: [$link_text]($link_url)"
            fi
            
            check_link "$file" "$link_url" "$line_num"
        fi
    done < "$file"
}

# Fonction pour lister tous les fichiers à vérifier
get_files_to_check() {
    local files=()
    
    if [[ -n "$SPECIFIC_FILE" ]]; then
        files=("$SPECIFIC_FILE")
    else
        # Fichiers principaux
        files+=("README.md")
        
        # Documentation
        if [[ -d "docs" ]]; then
            while IFS= read -r -d '' file; do
                files+=("$file")
            done < <(find docs -name "*.md" -print0)
        fi
        
        # Scripts
        if [[ -d "scripts" ]]; then
            while IFS= read -r -d '' file; do
                files+=("$file")
            done < <(find scripts -name "README.md" -print0)
        fi
    fi
    
    printf '%s\n' "${files[@]}"
}

# Fonction principale
main() {
    local files_to_check
    mapfile -t files_to_check < <(get_files_to_check)
    
    log_info "📋 Fichiers à vérifier: ${#files_to_check[@]}"
    
    for file in "${files_to_check[@]}"; do
        if [[ -f "$file" ]]; then
            check_file "$file"
        else
            log_warning "Fichier ignoré (n'existe pas): $file"
            ((WARNINGS++))
        fi
    done
    
    # Résumé
    echo ""
    log_info "📊 Résumé de la vérification:"
    
    if [[ $ERRORS -eq 0 ]]; then
        log_success "✅ Aucune erreur trouvée!"
    else
        log_error "❌ $ERRORS erreur(s) trouvée(s)"
    fi
    
    if [[ $WARNINGS -gt 0 ]]; then
        log_warning "⚠️  $WARNINGS avertissement(s)"
    fi
    
    # Suggestions
    if [[ $ERRORS -gt 0 ]]; then
        echo ""
        log_info "💡 Suggestions pour corriger les erreurs:"
        echo "   1. Vérifiez que les fichiers cibles existent"
        echo "   2. Vérifiez les chemins relatifs"
        echo "   3. Utilisez des chemins absolus depuis la racine (/)"
        echo "   4. Utilisez --fix pour tenter une correction automatique"
    fi
    
    # Code de sortie
    if [[ $ERRORS -gt 0 ]]; then
        exit 1
    else
        exit 0
    fi
}

# Exécuter la fonction principale
main "$@"
