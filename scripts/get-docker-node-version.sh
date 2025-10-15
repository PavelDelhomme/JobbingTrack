#!/bin/bash

# ============================================================================
# Script pour lire la version Node.js depuis les Dockerfiles
# ============================================================================

# Extraire la version depuis les Dockerfiles
BACKEND_VERSION=$(grep -r "FROM node:" backend/*/Dockerfile 2>/dev/null | head -1 | sed 's/.*node:\([^-]*\).*/\1/')
FRONTEND_VERSION=$(grep "FROM node:" frontend/Dockerfile 2>/dev/null | sed 's/.*node:\([^-]*\).*/\1/')

# Utiliser la version du frontend par défaut, ou backend si frontend non trouvé
NODE_VERSION=${FRONTEND_VERSION:-$BACKEND_VERSION}

# Si aucune version trouvée, utiliser 20.19.5 (version LTS stable disponible)
NODE_VERSION=${NODE_VERSION:-20.19.5}

echo "$NODE_VERSION"
