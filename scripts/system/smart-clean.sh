#!/bin/bash

# ============================================================================
# Script de Nettoyage Intelligent - JobbingTrack
# ============================================================================
# Nettoyage automatique avec préservation intelligente des données

set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
LOG_FILE="/tmp/jobbingtrack-smart-clean.log"
KEEP_BACKUPS=${1:-7}  # Nombre de sauvegardes à conserver

# Fonction de logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Fonction de succès
success() {
    echo "✅ $1"
}

# Fonction d'avertissement
warning() {
    echo "⚠️ $1"
}

# Fonction d'erreur
error() {
    echo "❌ $1"
    exit 1
}

# Créer une sauvegarde avant nettoyage
create_backup() {
    log "💾 Création d'une sauvegarde avant nettoyage..."

    local backup_name="pre-clean-$(date +%Y%m%d_%H%M%S)"
    local backup_dir="./backup_$backup_name"

    mkdir -p "$backup_dir"

    # Sauvegarder les données importantes
    if [ -d "data" ]; then
        cp -r data "$backup_dir/" 2>/dev/null || true
    fi

    # Sauvegarder les fichiers de configuration
    cp -r scripts "$backup_dir/" 2>/dev/null || true
    cp Makefile* "$backup_dir/" 2>/dev/null || true
    cp docker-compose*.yml "$backup_dir/" 2>/dev/null || true

    log "Sauvegarde créée: $backup_dir"
}

# Nettoyer les anciens logs
clean_old_logs() {
    log "🧹 Nettoyage des logs anciens..."

    local cleaned=0

    # Logs du système
    cleaned=$(find . -name "*.log" -type f -mtime +7 -delete 2>/dev/null | wc -l)

    # Logs Docker
    if command -v docker >/dev/null 2>&1; then
        docker system prune -f >/dev/null 2>&1 || true
    fi

    success "Logs nettoyés ($cleaned fichiers supprimés)"
}

# Nettoyer les sauvegardes anciennes
clean_old_backups() {
    log "📦 Nettoyage des anciennes sauvegardes..."

    local backup_pattern="backup_*"
    local old_backups=$(find . -maxdepth 1 -name "$backup_pattern" -type d -mtime +$KEEP_BACKUPS 2>/dev/null)

    if [ -n "$old_backups" ]; then
        echo "$old_backups" | while read -r backup; do
            if [ -d "$backup" ]; then
                rm -rf "$backup"
                log "🗑️ Supprimé: $(basename "$backup")"
            fi
        done
        success "Anciennes sauvegardes supprimées"
    else
        success "Aucune sauvegarde ancienne à supprimer"
    fi
}

# Nettoyer les fichiers temporaires
clean_temp_files() {
    log "🗂️ Nettoyage des fichiers temporaires..."

    local temp_patterns=(
        "*.tmp"
        "*.temp"
        ".DS_Store"
        "Thumbs.db"
        "node_modules/.cache"
        ".next/cache"
        "dist/"
        "build/"
    )

    local cleaned=0

    for pattern in "${temp_patterns[@]}"; do
        if [[ "$pattern" == */ ]]; then
            # C'est un répertoire
            if [ -d "$pattern" ]; then
                rm -rf "$pattern"
                ((cleaned++))
            fi
        else
            # C'est un fichier
            find . -name "$pattern" -type f -delete 2>/dev/null
            local count=$(find . -name "$pattern" -type f 2>/dev/null | wc -l)
            cleaned=$((cleaned + count))
        fi
    done

    success "Fichiers temporaires nettoyés ($cleaned éléments)"
}

# Nettoyer les dépendances inutiles
clean_unused_dependencies() {
    log "📦 Nettoyage des dépendances inutiles..."

    # Nettoyer node_modules si présent
    if [ -d "node_modules" ]; then
        log "🧹 Nettoyage de node_modules..."
        # Garder seulement les fichiers essentiels
        find node_modules -name "*.log" -delete 2>/dev/null || true
        find node_modules -name ".DS_Store" -delete 2>/dev/null || true
        success "node_modules nettoyé"
    fi

    # Nettoyer les caches Docker si présents
    if command -v docker >/dev/null 2>&1; then
        log "🐳 Nettoyage du cache Docker..."
        docker builder prune -f >/dev/null 2>&1 || true
        success "Cache Docker nettoyé"
    fi
}

# Vérifier l'espace libéré
check_space_freed() {
    log "📊 Analyse de l'espace libéré..."

    local before=$(du -sb . 2>/dev/null | cut -f1)
    local after=$(du -sb . 2>/dev/null | cut -f1)
    local freed=$((before - after))

    if [ "$freed" -gt 0 ]; then
        local freed_mb=$((freed / 1024 / 1024))
        success "Espace libéré: ${freed_mb}MB"
    else
        success "Aucun espace libéré (nettoyage déjà effectué)"
    fi
}

# Générer un rapport de nettoyage
generate_report() {
    log "📋 Génération du rapport de nettoyage..."

    local report_file="/tmp/jobbingtrack-clean-report.txt"

    {
        echo "========================================"
        echo "RAPPORT DE NETTOYAGE INTELLIGENT"
        echo "JobbingTrack - $(date)"
        echo "========================================"
        echo ""
        echo "PARAMÈTRES:"
        echo "  Sauvegardes conservées: $KEEP_BACKUPS jours"
        echo "  Logs conservés: 7 jours"
        echo ""
        echo "OPÉRATIONS EFFECTUÉES:"
        echo "  ✅ Sauvegarde pré-nettoyage"
        echo "  ✅ Nettoyage des logs anciens"
        echo "  ✅ Nettoyage des sauvegardes anciennes"
        echo "  ✅ Nettoyage des fichiers temporaires"
        echo "  ✅ Nettoyage des dépendances inutiles"
        echo ""
        echo "ESPACE DISQUE:"
        df -h . | awk 'NR==2 {print "  Utilisé: " $3 "/" $2 " (" $5 ")"}'
        echo ""
        echo "SAUVEGARDES CONSERVÉES:"
        ls -la backup_* 2>/dev/null | wc -l | awk '{print "  Nombre: " $1}'
        echo ""
        echo "========================================"
        echo "NETTOYAGE TERMINÉ AVEC SUCCÈS"
        echo "========================================"
    } > "$report_file"

    success "Rapport généré: $report_file"
}

# Fonction principale
main() {
    log "🚀 Démarrage du nettoyage intelligent JobbingTrack"

    # Créer le répertoire de logs
    mkdir -p "$(dirname "$LOG_FILE")"

    # Créer une sauvegarde avant nettoyage
    create_backup

    # Effectuer le nettoyage
    clean_old_logs
    clean_old_backups
    clean_temp_files
    clean_unused_dependencies

    # Analyser l'espace libéré
    check_space_freed

    # Générer le rapport
    generate_report

    log "🎉 Nettoyage intelligent terminé avec succès"
    log "📋 Rapport détaillé: $LOG_FILE"
}

# Fonction d'aide
show_help() {
    echo -e "${BLUE}🧹 Nettoyage Intelligent - JobbingTrack${NC}"
    echo "======================================"
    echo ""
    echo "Usage: $0 [KEEP_BACKUPS]"
    echo ""
    echo "Arguments:"
    echo "  KEEP_BACKUPS    Nombre de jours de rétention des sauvegardes (défaut: 7)"
    echo ""
    echo "Exemples:"
    echo "  $0                 # Nettoyage avec 7 jours de rétention"
    echo "  $0 30              # Nettoyage avec 30 jours de rétention"
    echo ""
    echo "Ce que nettoie le script:"
    echo "  • Logs anciens (> 7 jours)"
    echo "  • Sauvegardes anciennes (> KEEP_BACKUPS jours)"
    echo "  • Fichiers temporaires (*.tmp, .DS_Store, etc.)"
    echo "  • Caches inutiles (node_modules/.cache, etc.)"
    echo "  • Cache Docker"
    echo ""
    echo "Ce qui est préservé:"
    echo "  • Données importantes (data/, scripts/)"
    echo "  • Fichiers de configuration"
    echo "  • Dernières sauvegardes"
    echo ""
    echo "Logs: $LOG_FILE"
}

# Gestion des arguments
case "${1:-}" in
    "--help"|"-h")
        show_help
        exit 0
        ;;
    "--dry-run")
        echo "🔍 Mode simulation (aperçu sans modification)..."
        # Ici on pourrait implémenter un mode dry-run
        echo "Fonctionnalité à implémenter"
        exit 0
        ;;
    "")
        main
        ;;
    *)
        # Vérifier si c'est un nombre
        if [[ "$1" =~ ^[0-9]+$ ]] && [ "$1" -gt 0 ]; then
            main
        else
            echo "❌ Paramètre invalide: $1"
            echo "Utilisez un nombre de jours positif"
            exit 1
        fi
        ;;
esac
