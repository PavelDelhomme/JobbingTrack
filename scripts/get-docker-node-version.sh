#!/usr/bin/env bash

# ============================================================================
# Script de détection de version Node.js depuis les Dockerfiles
# ============================================================================
# Détecte automatiquement la version Node.js utilisée dans les Dockerfiles
# du projet JobbingTrack
# ============================================================================

set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Fonction pour afficher l'aide
show_help() {
    echo -e "${BLUE}🐳 Détection de version Node.js - JobbingTrack${NC}"
    echo "=============================================="
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --frontend        Chercher dans les Dockerfiles frontend"
    echo "  --backend         Chercher dans les Dockerfiles backend"
    echo "  --all            Chercher dans tous les Dockerfiles (par défaut)"
    echo "  --help           Afficher cette aide"
    echo ""
    echo "Exemples:"
    echo "  $0 --all          # Chercher dans tous les Dockerfiles"
    echo "  $0 --frontend     # Frontend uniquement"
    echo "  $0 --backend      # Backend uniquement"
    echo ""
}

# Configuration par défaut
SEARCH_FRONTEND=true
SEARCH_BACKEND=true

# Gestion des arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --frontend)
            SEARCH_BACKEND=false
            shift
            ;;
        --backend)
            SEARCH_FRONTEND=false
            shift
            ;;
        --all)
            SEARCH_FRONTEND=true
            SEARCH_BACKEND=true
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

# Fonction pour extraire la version Node.js d'un Dockerfile
extract_node_version() {
    local dockerfile="$1"

    if [[ ! -f "$dockerfile" ]]; then
        return 1
    fi

    # Chercher les patterns de version Node.js
    local version

    # Pattern 1: FROM node:X.Y.Z ou FROM node:X.Y
    version=$(grep -E "^\s*FROM\s+node:" "$dockerfile" | head -1 | sed -E 's/.*node:([0-9]+\.[0-9]+(\.[0-9]+)?).*/\1/')

    # Pattern 2: ARG NODE_VERSION=X.Y.Z
    if [[ -z "$version" ]]; then
        version=$(grep -E "^\s*ARG\s+NODE_VERSION=" "$dockerfile" | head -1 | sed -E 's/.*NODE_VERSION=([0-9]+\.[0-9]+(\.[0-9]+)?).*/\1/')
    fi

    # Pattern 3: ENV NODE_VERSION=X.Y.Z
    if [[ -z "$version" ]]; then
        version=$(grep -E "^\s*ENV\s+NODE_VERSION=" "$dockerfile" | head -1 | sed -E 's/.*NODE_VERSION=([0-9]+\.[0-9]+(\.[0-9]+)?).*/\1/')
    fi

    echo "$version"
}

# Fonction pour trouver tous les Dockerfiles
find_dockerfiles() {
    local search_path="$1"
    local pattern="$2"

    find "$search_path" -name "$pattern" -type f 2>/dev/null | sort
}

# Recherche des versions Node.js
echo -e "${BLUE}🔍 Recherche des versions Node.js dans les Dockerfiles...${NC}"

declare -A versions_found
versions_list=()

# Recherche dans les Dockerfiles frontend
if [[ "$SEARCH_FRONTEND" == true ]]; then
    echo -e "\n${YELLOW}📁 Recherche dans les Dockerfiles frontend...${NC}"

    while IFS= read -r dockerfile; do
        if [[ -n "$dockerfile" ]]; then
            echo "  📄 $dockerfile"
            version=$(extract_node_version "$dockerfile")
            if [[ -n "$version" && "$version" != "latest" ]]; then
                echo "    📦 Version trouvée: $version"
                versions_found["$version"]=1
                versions_list+=("$version")
            else
                echo "    ⚠️ Aucune version spécifique trouvée"
            fi
        fi
    done < <(find_dockerfiles "frontend" "Dockerfile*")
fi

# Recherche dans les Dockerfiles backend
if [[ "$SEARCH_BACKEND" == true ]]; then
    echo -e "\n${YELLOW}🔧 Recherche dans les Dockerfiles backend...${NC}"

    while IFS= read -r dockerfile; do
        if [[ -n "$dockerfile" ]]; then
            echo "  📄 $dockerfile"
            version=$(extract_node_version "$dockerfile")
            if [[ -n "$version" && "$version" != "latest" ]]; then
                echo "    📦 Version trouvée: $version"
                versions_found["$version"]=1
                versions_list+=("$version")
            else
                echo "    ⚠️ Aucune version spécifique trouvée"
            fi
        fi
    done < <(find_dockerfiles "backend" "Dockerfile*")
fi

# Version par défaut si aucune n'est trouvée
DEFAULT_VERSION="20.10.0"

# Analyse des résultats
if [[ ${#versions_found[@]} -eq 0 ]]; then
    echo -e "\n${YELLOW}⚠️ Aucune version Node.js spécifique trouvée dans les Dockerfiles${NC}"
    echo -e "${YELLOW}📦 Utilisation de la version par défaut: ${DEFAULT_VERSION}${NC}"
    echo "$DEFAULT_VERSION"
    exit 0
fi

# Trouver la version la plus récente
latest_version="$DEFAULT_VERSION"
for version in "${versions_list[@]}"; do
    if [[ -n "$version" ]]; then
        # Comparaison simple des versions (format X.Y.Z)
        if [[ "$(printf '%s\n' "$latest_version" "$version" | sort -V | tail -n1)" == "$version" ]]; then
            latest_version="$version"
        fi
    fi
done

echo -e "\n${GREEN}✅ Version Node.js déterminée: ${latest_version}${NC}"

# Vérifier si la version est supportée par GitHub Actions
echo -e "\n${BLUE}🔍 Vérification de la compatibilité...${NC}"

# Liste des versions supportées par GitHub Actions (approximative)
supported_versions=("18.0.0" "18.17.0" "18.18.0" "18.19.0" "18.20.0" "19.0.0" "19.9.0" "20.0.0" "20.10.0" "20.11.0" "20.12.0" "21.0.0" "21.6.0" "22.0.0")

is_supported=false
for supported in "${supported_versions[@]}"; do
    if [[ "$latest_version" == "$supported" ]]; then
        is_supported=true
        break
    fi
done

if [[ "$is_supported" == true ]]; then
    echo -e "${GREEN}✅ Version ${latest_version} supportée par GitHub Actions${NC}"
else
    echo -e "${YELLOW}⚠️ Version ${latest_version} peut ne pas être supportée${NC}"
    echo -e "${YELLOW}💡 Considérez utiliser une version LTS: 18.20.0, 20.12.0, ou 22.0.0${NC}"
fi

echo "$latest_version"
