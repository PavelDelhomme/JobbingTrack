#!/bin/bash

# Script pour extraire la version Node.js depuis les Dockerfiles
# Utilisé par le CI/CD pour configurer la version Node.js

# Rechercher dans tous les Dockerfiles du projet
DOCKERFILES=(
  "frontend/Dockerfile"
  "backend/auth-service/Dockerfile"
  "backend/api-gateway/Dockerfile"
  "backend/application-service/Dockerfile"
  "backend/company-service/Dockerfile"
  "backend/contact-service/Dockerfile"
  "backend/interview-service/Dockerfile"
  "backend/call-service/Dockerfile"
  "backend/followup-service/Dockerfile"
  "backend/event-service/Dockerfile"
  "backend/notification-service/Dockerfile"
  "backend/dashboard-service/Dockerfile"
  "backend/metrics-aggregator-service/Dockerfile"
  "backend/security-service/Dockerfile"
  "backend/profile-service/Dockerfile"
  "backend/workflow-service/Dockerfile"
  "backend/deployment-service/Dockerfile"
)

# Fonction pour extraire la version Node.js d'un Dockerfile
extract_node_version() {
  local dockerfile=$1
  
  if [ ! -f "$dockerfile" ]; then
    return 1
  fi
  
  # Chercher la ligne FROM node:VERSION
  # Formats supportés: node:20.18.0, node:20.18.0-alpine, node:20-alpine
  local version=$(grep -E "^FROM node:" "$dockerfile" | head -n 1 | sed -E 's/^FROM node:([0-9]+\.[0-9]+\.[0-9]+).*/\1/' | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$')
  
  if [ -n "$version" ]; then
    echo "$version"
    return 0
  fi
  
  # Si pas de version complète, chercher node:MAJOR.MINOR
  local major_minor=$(grep -E "^FROM node:" "$dockerfile" | head -n 1 | sed -E 's/^FROM node:([0-9]+\.[0-9]+).*/\1/' | grep -E '^[0-9]+\.[0-9]+$')
  
  if [ -n "$major_minor" ]; then
    # Retourner la version complète la plus récente pour cette version majeure
    echo "${major_minor}.0"
    return 0
  fi
  
  return 1
}

# Parcourir tous les Dockerfiles et trouver la version la plus récente
LATEST_VERSION=""
LATEST_MAJOR=0
LATEST_MINOR=0
LATEST_PATCH=0

for dockerfile in "${DOCKERFILES[@]}"; do
  version=$(extract_node_version "$dockerfile")
  
  if [ -n "$version" ]; then
    # Extraire major, minor, patch
    IFS='.' read -r major minor patch <<< "$version"
    
    # Comparer avec la version la plus récente trouvée
    if [ "$major" -gt "$LATEST_MAJOR" ] || \
       ([ "$major" -eq "$LATEST_MAJOR" ] && [ "$minor" -gt "$LATEST_MINOR" ]) || \
       ([ "$major" -eq "$LATEST_MAJOR" ] && [ "$minor" -eq "$LATEST_MINOR" ] && [ "$patch" -gt "$LATEST_PATCH" ]); then
      LATEST_VERSION="$version"
      LATEST_MAJOR=$major
      LATEST_MINOR=$minor
      LATEST_PATCH=$patch
    fi
  fi
done

# Si aucune version trouvée, utiliser une version par défaut
if [ -z "$LATEST_VERSION" ]; then
  echo "20.18.0"  # Version par défaut utilisée dans le projet
  exit 0
fi

# Afficher la version trouvée
echo "$LATEST_VERSION"

