#!/usr/bin/env bash

# ============================================================================
# Script de vérification des liens - JobbingTrack (Version simplifiée)
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

# Aller à la racine du projet
PROJECT_ROOT="$(dirname "$0")/../.."
cd "$PROJECT_ROOT"

log_info "🔍 Vérification des liens dans la documentation JobbingTrack"
log_info "📁 Répertoire de travail: $(pwd)"

ERRORS=0

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
        return 0
    elif [[ "$clean_link" =~ ^/ ]]; then
        # Lien absolu vers la racine
        local target_path="$clean_link"
        if [[ -f "$target_path" ]]; then
            log_success "  ✅ Lien valide: $clean_link"
            return 0
        else
            log_error "  ❌ Fichier introuvable: $target_path (ligne $line_num dans $file)"
            ((ERRORS++))
            return 1
        fi
    else
        # Lien relatif
        local file_dir=$(dirname "$file")
        local target_path="$file_dir/$clean_link"
        if [[ -f "$target_path" ]]; then
            log_success "  ✅ Lien valide: $clean_link"
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
        
        # Chercher les liens markdown avec une approche plus simple
        if echo "$line" | grep -q "\[.*\](.*)"; then
            # Extraire les liens avec sed
            echo "$line" | sed -n 's/.*\[[^\]]*\](\([^)]*\)).*/\1/p' | while read -r link; do
                if [[ -n "$link" ]]; then
                    check_link "$file" "$link" "$line_num"
                fi
            done
        fi
    done < "$file"
}

# Vérifier les fichiers principaux
log_info "📋 Vérification des fichiers principaux..."

# README principal
check_file "README.md"

# Documentation
if [[ -d "docs" ]]; then
    for file in docs/*.md; do
        if [[ -f "$file" ]]; then
            check_file "$file"
        fi
    done
fi

# Scripts
if [[ -d "scripts" ]]; then
    find scripts -name "README.md" -type f | while read -r file; do
        check_file "$file"
    done
fi

# Résumé
echo ""
log_info "📊 Résumé de la vérification:"

if [[ $ERRORS -eq 0 ]]; then
    log_success "✅ Aucune erreur trouvée!"
    exit 0
else
    log_error "❌ $ERRORS erreur(s) trouvée(s)"
    exit 1
fi
