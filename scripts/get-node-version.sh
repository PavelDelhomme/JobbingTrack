#!/bin/bash

# ============================================================================
# Script pour lire la version Node.js depuis la configuration
# ============================================================================

# Lire la version depuis config.json
if [ -f "config.json" ]; then
    NODE_VERSION=$(jq -r '.node.version' config.json)
    echo "$NODE_VERSION"
elif [ -f ".node-version" ]; then
    NODE_VERSION=$(cat .node-version)
    echo "$NODE_VERSION"
elif [ -f ".nvmrc" ]; then
    NODE_VERSION=$(cat .nvmrc)
    echo "$NODE_VERSION"
else
    echo "20.19.5"  # Version par défaut
fi
