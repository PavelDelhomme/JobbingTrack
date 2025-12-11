#!/bin/bash
# Helper script pour extraire les ports d'un conteneur Docker

CONTAINER_NAME=$1

if [ -z "$CONTAINER_NAME" ]; then
    echo ""
    exit 0
fi

PORTS=$(docker ps --filter "name=^${CONTAINER_NAME}$" --format "{{.Ports}}" 2>/dev/null)

if [ -z "$PORTS" ]; then
    echo "no-container"
    exit 0
fi

# Extraire le port externe (premier port exposé)
PORT_EXT=$(echo "$PORTS" | grep -oE '0\.0\.0\.0:[0-9]+' | head -1 | sed 's/0\.0\.0\.0://')

# Extraire le port interne correspondant
PORT_INT=$(echo "$PORTS" | grep -oE "${PORT_EXT}->[0-9]+" | head -1 | sed "s/${PORT_EXT}->//")

if [ -n "$PORT_EXT" ] && [ -n "$PORT_INT" ]; then
    echo "${PORT_EXT}→${PORT_INT}"
elif [ -n "$PORT_EXT" ]; then
    echo "${PORT_EXT}"
else
    echo "no-port"
fi

