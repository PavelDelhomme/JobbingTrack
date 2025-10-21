#!/usr/bin/env bash

# ============================================================================
# Script de sauvegarde de la base de données - JobbingTrack
# ============================================================================
# Crée une sauvegarde complète de la base de données PostgreSQL
#
# Usage: ./scripts/db/backup.sh [OPTIONS] [BACKUP_NAME]
#
# Options:
#   --compress        Compresser la sauvegarde (gzip)
#   --destination     Répertoire de destination (défaut: ./backups)
#   --help           Afficher cette aide
#
# Arguments:
#   BACKUP_NAME      Nom de la sauvegarde (défaut: auto-generated)
#
# Exemples:
#   ./scripts/db/backup.sh
#   ./scripts/db/backup.sh --compress my-backup
#   ./scripts/db/backup.sh --destination /mnt/backups daily-backup
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
COMPRESS=false
DESTINATION="./backups"
BACKUP_NAME=""

# Fonction d'aide
show_help() {
    echo -e "${BLUE}💾 Sauvegarde base de données - JobbingTrack${NC}"
    echo "=========================================="
    echo ""
    echo "Usage: $0 [OPTIONS] [BACKUP_NAME]"
    echo ""
    echo "Options:"
    echo "  --compress       Compresser la sauvegarde (gzip)"
    echo "  --destination    Répertoire de destination (défaut: ./backups)"
    echo "  --help           Afficher cette aide"
    echo ""
    echo "Arguments:"
    echo "  BACKUP_NAME      Nom de la sauvegarde (défaut: auto-generated)"
    echo ""
    echo "Exemples:"
    echo "  $0                           # Sauvegarde avec nom auto-généré"
    echo "  $0 --compress                # Sauvegarde compressée"
    echo "  $0 --destination /mnt/backups daily-backup"
    echo ""
    echo "Noms de sauvegarde auto-générés:"
    echo "  backup_YYYYMMDD_HHMMSS.sql"
    echo "  backup_YYYYMMDD_HHMMSS.sql.gz (si compressé)"
}

# Gestion des arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --compress)
            COMPRESS=true
            shift
            ;;
        --destination)
            DESTINATION="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        -*)
            echo -e "${RED}❌ Option inconnue: $1${NC}"
            show_help
            exit 1
            ;;
        *)
            BACKUP_NAME="$1"
            shift
            ;;
    esac
done

# Fonction pour vérifier si PostgreSQL est accessible
check_postgres() {
    echo -e "${YELLOW}🔍 Vérification de PostgreSQL...${NC}"

    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker n'est pas installé${NC}"
        return 1
    fi

    if ! docker-compose ps postgres | grep -q "Up"; then
        echo -e "${RED}❌ PostgreSQL n'est pas en cours d'exécution${NC}"
        echo -e "${YELLOW}💡 Démarrez les services avec : make up${NC}"
        return 1
    fi

    echo -e "${GREEN}✅ PostgreSQL est accessible${NC}"
    return 0
}

# Fonction pour créer le répertoire de destination
create_backup_directory() {
    if [ ! -d "$DESTINATION" ]; then
        echo -e "${YELLOW}📁 Création du répertoire $DESTINATION...${NC}"
        mkdir -p "$DESTINATION"
    fi

    # Vérifier les permissions d'écriture
    if [ ! -w "$DESTINATION" ]; then
        echo -e "${RED}❌ Pas de permission d'écriture dans $DESTINATION${NC}"
        return 1
    fi

    echo -e "${GREEN}✅ Répertoire de sauvegarde prêt${NC}"
}

# Fonction pour générer le nom de fichier
generate_filename() {
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local extension="sql"

    if [ "$COMPRESS" = true ]; then
        extension="sql.gz"
    fi

    if [ -n "$BACKUP_NAME" ]; then
        echo "${BACKUP_NAME}.${extension}"
    else
        echo "backup_${timestamp}.${extension}"
    fi
}

# Fonction pour créer la sauvegarde
create_backup() {
    local filename="$1"
    local filepath="$DESTINATION/$filename"

    echo -e "${BLUE}💾 Création de la sauvegarde...${NC}"
    echo "📁 Fichier: $filepath"

    # Créer la sauvegarde
    if [ "$COMPRESS" = true ]; then
        docker-compose exec -T postgres pg_dump -U jobbingtrack jobbingtrack | gzip > "$filepath"
    else
        docker-compose exec -T postgres pg_dump -U jobbingtrack jobbingtrack > "$filepath"
    fi

    # Vérifier que la sauvegarde a été créée
    if [ -f "$filepath" ]; then
        local size=$(du -h "$filepath" | cut -f1)
        echo -e "${GREEN}✅ Sauvegarde créée avec succès${NC}"
        echo "📊 Taille: $size"
        echo "📍 Emplacement: $filepath"

        # Afficher les informations de la sauvegarde
        echo -e "\n${BLUE}📋 Informations de la sauvegarde:${NC}"
        echo "   Nom: $filename"
        echo "   Date: $(date)"
        echo "   Compression: $([ "$COMPRESS" = true ] && echo "Oui" || echo "Non")"
        echo "   Taille: $size"

        return 0
    else
        echo -e "${RED}❌ Échec de la création de la sauvegarde${NC}"
        return 1
    fi
}

# Fonction principale
main() {
    echo -e "${BLUE}💾 Sauvegarde de la base de données JobbingTrack${NC}"
    echo "=============================================="

    # Vérifier PostgreSQL
    if ! check_postgres; then
        exit 1
    fi

    # Créer le répertoire de destination
    if ! create_backup_directory; then
        exit 1
    fi

    # Générer le nom de fichier
    local filename=$(generate_filename)

    # Créer la sauvegarde
    if ! create_backup "$filename"; then
        exit 1
    fi

    # Conseils de sécurité
    echo -e "\n${YELLOW}💡 Conseils de sécurité:${NC}"
    echo "   • Stockez les sauvegardes dans un endroit sécurisé"
    echo "   • Chiffrez les sauvegardes sensibles"
    echo "   • Testez régulièrement la restauration"
    echo "   • Automatisez les sauvegardes avec cron"

    # Commandes de restauration suggérées
    echo -e "\n${BLUE}🔄 Pour restaurer cette sauvegarde:${NC}"
    if [ "$COMPRESS" = true ]; then
        echo "   gunzip < $DESTINATION/$filename | docker-compose exec -T postgres psql -U jobbingtrack -d jobbingtrack"
    else
        echo "   docker-compose exec -T postgres psql -U jobbingtrack -d jobbingtrack < $DESTINATION/$filename"
    fi
    echo "   # Ou utilisez: make db-restore file=$DESTINATION/$filename"

    return 0
}

# Exécution
main "$@"
