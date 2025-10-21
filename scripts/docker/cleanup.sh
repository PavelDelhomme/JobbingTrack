#!/usr/bin/env bash

# ============================================================================
# Script de nettoyage Docker - JobbingTrack
# ============================================================================
# Nettoie les images inutilisées, conteneurs arrêtés et volumes orphelins
#
# Usage: ./scripts/docker/cleanup.sh [OPTIONS]
#
# Options:
#   --dry-run         Afficher ce qui serait supprimé sans rien supprimer
#   --force          Forcer le nettoyage sans confirmation
#   --images-only    Ne nettoyer que les images inutilisées
#   --containers-only Ne nettoyer que les conteneurs arrêtés
#   --volumes-only   Ne nettoyer que les volumes orphelins
#   --help           Afficher cette aide
#
# Exemples:
#   ./scripts/docker/cleanup.sh              # Nettoyage avec confirmation
#   ./scripts/docker/cleanup.sh --dry-run    # Aperçu du nettoyage
#   ./scripts/docker/cleanup.sh --force      # Nettoyage automatique
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
DRY_RUN=false
FORCE=false
IMAGES_ONLY=false
CONTAINERS_ONLY=false
VOLUMES_ONLY=false

# Fonction d'aide
show_help() {
    echo -e "${BLUE}🧹 Nettoyage Docker - JobbingTrack${NC}"
    echo "================================="
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --dry-run         Afficher ce qui serait supprimé sans rien supprimer"
    echo "  --force          Forcer le nettoyage sans confirmation"
    echo "  --images-only    Ne nettoyer que les images inutilisées"
    echo "  --containers-only Ne nettoyer que les conteneurs arrêtés"
    echo "  --volumes-only   Ne nettoyer que les volumes orphelins"
    echo "  --help           Afficher cette aide"
    echo ""
    echo "Exemples:"
    echo "  $0                           # Nettoyage avec confirmation"
    echo "  $0 --dry-run                 # Aperçu du nettoyage"
    echo "  $0 --force                   # Nettoyage automatique"
    echo "  $0 --images-only             # Images uniquement"
    echo ""
    echo "Actions effectuées:"
    echo "  • Suppression des conteneurs arrêtés"
    echo "  • Suppression des images inutilisées"
    echo "  • Suppression des volumes orphelins"
    echo "  • Suppression des réseaux inutilisés"
    echo "  • Nettoyage du cache de build"
}

# Gestion des arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --images-only)
            IMAGES_ONLY=true
            shift
            ;;
        --containers-only)
            CONTAINERS_ONLY=true
            shift
            ;;
        --volumes-only)
            VOLUMES_ONLY=true
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

# Fonction pour afficher l'utilisation de l'espace disque
show_disk_usage() {
    echo -e "\n${BLUE}💾 Utilisation de l'espace disque Docker:${NC}"
    echo "----------------------------------------"

    if command -v docker &> /dev/null; then
        echo "📊 Images Docker:"
        docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | head -10

        echo -e "\n🗂️ Volumes Docker:"
        docker volume ls --format "table {{.Name}}\t{{.Driver}}"

        echo -e "\n📦 Espace utilisé par Docker:"
        if command -v du &> /dev/null; then
            du -sh /var/lib/docker/ 2>/dev/null || echo "Impossible de calculer l'espace utilisé"
        fi
    else
        echo -e "${RED}❌ Docker n'est pas installé${NC}"
    fi
}

# Fonction pour nettoyer les conteneurs arrêtés
cleanup_containers() {
    echo -e "\n${YELLOW}🗑️ Nettoyage des conteneurs arrêtés...${NC}"

    local stopped_containers=$(docker ps -aq -f status=exited -f status=created)

    if [ -z "$stopped_containers" ]; then
        echo -e "${GREEN}✅ Aucun conteneur arrêté à supprimer${NC}"
        return 0
    fi

    echo "Conteneurs à supprimer:"
    docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" -f status=exited -f status=created

    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}🔍 Mode dry-run: $(( $(echo "$stopped_containers" | wc -l) )) conteneurs seraient supprimés${NC}"
        return 0
    fi

    if [ "$FORCE" = false ]; then
        echo -e "${YELLOW}⚠️ Cette action supprimera $(echo "$stopped_containers" | wc -l) conteneurs arrêtés${NC}"
        read -p "Êtes-vous sûr ? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}❌ Opération annulée${NC}"
            return 0
        fi
    fi

    echo "Suppression des conteneurs..."
    docker container prune -f

    echo -e "${GREEN}✅ Conteneurs arrêtés supprimés${NC}"
}

# Fonction pour nettoyer les images inutilisées
cleanup_images() {
    echo -e "\n${YELLOW}🖼️ Nettoyage des images inutilisées...${NC}"

    local dangling_images=$(docker images -f "dangling=true" -q)

    if [ -z "$dangling_images" ]; then
        echo -e "${GREEN}✅ Aucune image dangling à supprimer${NC}"
        return 0
    fi

    echo "Images à supprimer:"
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.Size}}" -f "dangling=true"

    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}🔍 Mode dry-run: $(( $(echo "$dangling_images" | wc -l) )) images seraient supprimées${NC}"
        return 0
    fi

    if [ "$FORCE" = false ]; then
        echo -e "${YELLOW}⚠️ Cette action supprimera $(echo "$dangling_images" | wc -l) images inutilisées${NC}"
        read -p "Êtes-vous sûr ? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}❌ Opération annulée${NC}"
            return 0
        fi
    fi

    echo "Suppression des images..."
    docker image prune -f

    echo -e "${GREEN}✅ Images inutilisées supprimées${NC}"
}

# Fonction pour nettoyer les volumes orphelins
cleanup_volumes() {
    echo -e "\n${YELLOW}📁 Nettoyage des volumes orphelins...${NC}"

    local orphaned_volumes=$(docker volume ls -qf dangling=true)

    if [ -z "$orphaned_volumes" ]; then
        echo -e "${GREEN}✅ Aucun volume orphelin à supprimer${NC}"
        return 0
    fi

    echo "Volumes à supprimer:"
    docker volume ls --format "table {{.Name}}\t{{.Driver}}" -f dangling=true

    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}🔍 Mode dry-run: $(( $(echo "$orphaned_volumes" | wc -l) )) volumes seraient supprimés${NC}"
        return 0
    fi

    if [ "$FORCE" = false ]; then
        echo -e "${YELLOW}⚠️ Cette action supprimera $(echo "$orphaned_volumes" | wc -l) volumes orphelins${NC}"
        read -p "Êtes-vous sûr ? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}❌ Opération annulée${NC}"
            return 0
        fi
    fi

    echo "Suppression des volumes..."
    docker volume prune -f

    echo -e "${GREEN}✅ Volumes orphelins supprimés${NC}"
}

# Fonction pour nettoyer les réseaux inutilisés
cleanup_networks() {
    echo -e "\n${YELLOW}🌐 Nettoyage des réseaux inutilisés...${NC}"

    local unused_networks=$(docker network ls -qf dangling=true)

    if [ -z "$unused_networks" ]; then
        echo -e "${GREEN}✅ Aucun réseau inutilisé à supprimer${NC}"
        return 0
    fi

    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}🔍 Mode dry-run: $(( $(echo "$unused_networks" | wc -l) )) réseaux seraient supprimés${NC}"
        return 0
    fi

    echo "Suppression des réseaux..."
    docker network prune -f

    echo -e "${GREEN}✅ Réseaux inutilisés supprimés${NC}"
}

# Fonction pour nettoyer le cache de build
cleanup_build_cache() {
    echo -e "\n${YELLOW}🔨 Nettoyage du cache de build...${NC}"

    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}🔍 Mode dry-run: le cache de build serait supprimé${NC}"
        return 0
    fi

    if [ "$FORCE" = false ]; then
        echo -e "${YELLOW}⚠️ Cette action supprimera le cache de build Docker${NC}"
        read -p "Êtes-vous sûr ? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}❌ Opération annulée${NC}"
            return 0
        fi
    fi

    echo "Suppression du cache de build..."
    docker builder prune -f

    echo -e "${GREEN}✅ Cache de build supprimé${NC}"
}

# Fonction principale
main() {
    echo -e "${BLUE}🧹 Nettoyage Docker JobbingTrack${NC}"
    echo "==============================="

    # Afficher l'utilisation actuelle de l'espace
    show_disk_usage

    local actions_performed=0

    # Nettoyer selon les options spécifiées
    if [ "$CONTAINERS_ONLY" = false ]; then
        if cleanup_containers; then
            ((actions_performed++))
        fi
    fi

    if [ "$IMAGES_ONLY" = false ]; then
        if cleanup_images; then
            ((actions_performed++))
        fi
    fi

    if [ "$VOLUMES_ONLY" = false ]; then
        if cleanup_volumes; then
            ((actions_performed++))
        fi
        if cleanup_networks; then
            ((actions_performed++))
        fi
        if cleanup_build_cache; then
            ((actions_performed++))
        fi
    fi

    # Résumé final
    echo -e "\n${BLUE}📊 Résumé du nettoyage${NC}"
    echo "===================="

    if [ $actions_performed -eq 0 ]; then
        echo -e "${GREEN}✅ Aucun nettoyage nécessaire${NC}"
    else
        echo -e "${GREEN}✅ $actions_performed actions de nettoyage effectuées${NC}"
        echo ""
        echo -e "${BLUE}💡 Espace disque libéré:${NC}"
        show_disk_usage
    fi

    echo -e "\n${YELLOW}💡 Conseils:${NC}"
    echo "   • Utilisez --dry-run pour voir ce qui serait supprimé"
    echo "   • Utilisez --force pour automatiser le nettoyage"
    echo "   • Planifiez un nettoyage régulier avec cron"
    echo "   • Conservez les sauvegardes importantes avant le nettoyage"

    return 0
}

# Exécution
main "$@"
