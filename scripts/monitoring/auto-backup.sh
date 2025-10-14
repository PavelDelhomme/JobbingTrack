#!/bin/bash

# ============================================================================
# Script de Sauvegarde Automatique - JobbingTrack
# ============================================================================
# Sauvegarde automatique avec rotation et vérification d'intégrité

set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
BACKUP_DIR="${1:-./backups}"
RETENTION_DAYS=${2:-30}
LOG_FILE="$BACKUP_DIR/backup.log"

# Créer le répertoire de sauvegarde s'il n'existe pas
mkdir -p "$BACKUP_DIR"

# Fonction de logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Fonction d'erreur
error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1" | tee -a "$LOG_FILE"
    exit 1
}

# Fonction de succès
success() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1" | tee -a "$LOG_FILE"
}

# Vérifier les prérequis
check_prerequisites() {
    log "🔍 Vérification des prérequis..."

    # Vérifier Docker
    if ! command -v docker >/dev/null 2>&1; then
        error "Docker n'est pas installé"
    fi

    # Vérifier l'espace disque
    local free_space=$(df . | awk 'NR==2 {print $4}' | sed 's/G.*//')
    if [ "$free_space" -lt 5 ]; then
        error "Espace disque insuffisant (moins de 5GB libre)"
    fi

    success "Prérequis vérifiés"
}

# Sauvegarder la base de données
backup_database() {
    log "🗄️ Sauvegarde de la base de données..."

    local db_backup="$BACKUP_DIR/postgres_$(date +%Y%m%d_%H%M%S).sql"

    if docker exec jobbingtrack-postgres-prod pg_dump \
        -U jobbingtrack \
        -h localhost \
        jobbingtrack_prod > "$db_backup" 2>/dev/null; then

        # Compresser la sauvegarde
        gzip "$db_backup"
        success "Base de données sauvegardée: $(basename "$db_backup").gz"
        return 0
    else
        error "Échec de la sauvegarde PostgreSQL"
    fi
}

# Sauvegarder les volumes Docker
backup_volumes() {
    log "🐳 Sauvegarde des volumes Docker..."

    local volumes_backup="$BACKUP_DIR/volumes_$(date +%Y%m%d_%H%M%S).tar.gz"

    # Lister les volumes à sauvegarder
    local volumes=("postgres_data" "redis_data")
    local volume_mounts=""

    for volume in "${volumes[@]}"; do
        if docker volume ls -q | grep -q "^${volume}$"; then
            volume_mounts="$volume_mounts -v $volume:/data/$volume"
        fi
    done

    if [ -n "$volume_mounts" ]; then
        if docker run --rm $volume_mounts -v "$(pwd)/$BACKUP_DIR:/backup" alpine tar czf "/backup/$(basename "$volumes_backup")" /data 2>/dev/null; then
            success "Volumes sauvegardés: $(basename "$volumes_backup")"
            return 0
        fi
    fi

    log "⚠️ Aucun volume Docker trouvé à sauvegarder"
    return 0
}

# Sauvegarder le code source
backup_code() {
    log "📦 Sauvegarde du code source..."

    local code_backup="$BACKUP_DIR/code_$(date +%Y%m%d_%H%M%S).tar.gz"

    # Exclure les fichiers inutiles
    if tar -czf "$code_backup" \
        --exclude="node_modules" \
        --exclude="*.log" \
        --exclude="backup_*" \
        --exclude="*.tmp" \
        --exclude=".git" \
        . >/dev/null 2>&1; then

        success "Code source sauvegardé: $(basename "$code_backup")"
        return 0
    else
        error "Échec de la sauvegarde du code"
    fi
}

# Vérifier l'intégrité des sauvegardes
verify_backups() {
    log "🔍 Vérification de l'intégrité des sauvegardes..."

    local latest_db=$(ls -t "$BACKUP_DIR"/postgres_*.gz 2>/dev/null | head -1)
    local latest_volumes=$(ls -t "$BACKUP_DIR"/volumes_*.tar.gz 2>/dev/null | head -1)
    local latest_code=$(ls -t "$BACKUP_DIR"/code_*.tar.gz 2>/dev/null | head -1)

    # Vérifier la base de données
    if [ -n "$latest_db" ]; then
        if gunzip -t "$latest_db" 2>/dev/null; then
            success "Intégrité PostgreSQL OK"
        else
            error "Corruption détectée dans la sauvegarde PostgreSQL"
        fi
    fi

    # Vérifier les volumes
    if [ -n "$latest_volumes" ]; then
        if tar -tzf "$latest_volumes" >/dev/null 2>&1; then
            success "Intégrité volumes OK"
        else
            error "Corruption détectée dans la sauvegarde des volumes"
        fi
    fi

    # Vérifier le code
    if [ -n "$latest_code" ]; then
        if tar -tzf "$latest_code" >/dev/null 2>&1; then
            success "Intégrité code OK"
        else
            error "Corruption détectée dans la sauvegarde du code"
        fi
    fi
}

# Nettoyer les anciennes sauvegardes
cleanup_old_backups() {
    log "🧹 Nettoyage des sauvegardes anciennes (> $RETENTION_DAYS jours)..."

    # Trouver et supprimer les sauvegardes anciennes
    find "$BACKUP_DIR" -name "*.gz" -o -name "*.sql" -o -name "*.tar.gz" | while read -r file; do
        if [ "$(find "$file" -mtime +$RETENTION_DAYS 2>/dev/null)" ]; then
            rm -f "$file"
            log "🗑️ Supprimé: $(basename "$file")"
        fi
    done

    # Nettoyer les répertoires vides
    find "$BACKUP_DIR" -type d -empty -delete 2>/dev/null || true

    success "Nettoyage terminé"
}

# Générer un rapport de sauvegarde
generate_report() {
    log "📊 Génération du rapport de sauvegarde..."

    local report_file="$BACKUP_DIR/backup_report_$(date +%Y%m%d_%H%M%S).txt"

    {
        echo "========================================"
        echo "RAPPORT DE SAUVEGARDE JOBBINGTRACK"
        echo "========================================"
        echo "Date: $(date)"
        echo "Sauvegardes conservées: $RETENTION_DAYS jours"
        echo ""
        echo "SAUVEGARDES POSTGRESQL:"
        ls -la "$BACKUP_DIR"/postgres_*.gz 2>/dev/null | wc -l | awk '{print "  Nombre: " $1}'
        ls -lh "$BACKUP_DIR"/postgres_*.gz 2>/dev/null | tail -3 | awk '{print "  Dernière: " $9 " (" $5 ")"}'
        echo ""
        echo "SAUVEGARDES VOLUMES:"
        ls -la "$BACKUP_DIR"/volumes_*.tar.gz 2>/dev/null | wc -l | awk '{print "  Nombre: " $1}'
        ls -lh "$BACKUP_DIR"/volumes_*.tar.gz 2>/dev/null | tail -3 | awk '{print "  Dernière: " $9 " (" $5 ")"}'
        echo ""
        echo "SAUVEGARDES CODE:"
        ls -la "$BACKUP_DIR"/code_*.tar.gz 2>/dev/null | wc -l | awk '{print "  Nombre: " $1}'
        ls -lh "$BACKUP_DIR"/code_*.tar.gz 2>/dev/null | tail -3 | awk '{print "  Dernière: " $9 " (" $5 ")"}'
        echo ""
        echo "ESPACE DISQUE:"
        df -h . | awk 'NR==2 {print "  Utilisé: " $3 "/" $2 " (" $5 ")"}'
        echo ""
        echo "========================================"
    } > "$report_file"

    success "Rapport généré: $(basename "$report_file")"
}

# Fonction principale
main() {
    log "🚀 Démarrage de la sauvegarde automatique JobbingTrack"

    # Vérifier les prérequis
    check_prerequisites

    # Créer la sauvegarde
    backup_database
    backup_volumes
    backup_code

    # Vérifier l'intégrité
    verify_backups

    # Nettoyer les anciennes sauvegardes
    cleanup_old_backups

    # Générer le rapport
    generate_report

    success "🎉 Sauvegarde automatique terminée avec succès"
    log "📋 Sauvegardes disponibles dans: $BACKUP_DIR"
}

# Fonction d'aide
show_help() {
    echo -e "${BLUE}💾 Sauvegarde Automatique - JobbingTrack${NC}"
    echo "======================================"
    echo ""
    echo "Usage: $0 [BACKUP_DIR] [RETENTION_DAYS]"
    echo ""
    echo "Arguments:"
    echo "  BACKUP_DIR       Répertoire de sauvegarde (défaut: ./backups)"
    echo "  RETENTION_DAYS   Nombre de jours de rétention (défaut: 30)"
    echo ""
    echo "Exemples:"
    echo "  $0                           # Sauvegarde dans ./backups, 30 jours"
    echo "  $0 /mnt/backups              # Sauvegarde dans /mnt/backups"
    echo "  $0 ./backups 7               # Sauvegarde 7 jours de rétention"
    echo ""
    echo "Commandes spéciales:"
    echo "  $0 --help                    # Afficher cette aide"
    echo "  $0 --status                  # État des sauvegardes"
    echo ""
    echo "Ce que sauvegarde le script:"
    echo "  • Base de données PostgreSQL"
    echo "  • Volumes Docker (postgres_data, redis_data)"
    echo "  • Code source (avec exclusions)"
    echo "  • Vérification d'intégrité"
    echo "  • Nettoyage automatique"
}

# Gestion des arguments
case "${1:-}" in
    "--help"|"-h")
        show_help
        exit 0
        ;;
    "--status")
        echo "📊 État des sauvegardes:"
        ls -la "$BACKUP_DIR"/*.gz "$BACKUP_DIR"/*.sql 2>/dev/null | tail -5 || echo "Aucune sauvegarde trouvée"
        exit 0
        ;;
    "")
        main
        ;;
    *)
        main
        ;;
esac
