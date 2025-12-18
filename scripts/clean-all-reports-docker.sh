#!/bin/bash
# Script pour supprimer TOUS les rapports dans Docker (à utiliser si clean-all-reports.sh ne fonctionne pas)

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

CONTAINER_NAME="jobbingtrack-frontend"

echo -e "${RED}⚠️  Suppression de TOUS les rapports dans Docker${NC}"
echo ""

if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}❌ Le conteneur ${CONTAINER_NAME} n'est pas en cours d'exécution${NC}"
    exit 1
fi

echo -e "${BLUE}🗑️  Suppression des rapports dans Docker...${NC}"

# Supprimer tous les répertoires de tests results
echo -e "${YELLOW}  Suppression: tests/results/*${NC}"
# Essayer d'abord avec l'utilisateur normal
docker exec ${CONTAINER_NAME} sh -c "cd /app/tests/results && ls -d 20* 2>/dev/null | while read dir; do chmod -R 777 \"\$dir\" 2>/dev/null; rm -rf \"\$dir\" 2>/dev/null; done" || true
# Si ça ne fonctionne pas, utiliser root
docker exec -u root ${CONTAINER_NAME} sh -c "cd /app/tests/results && rm -rf 20* 2>/dev/null || true" || true

# Supprimer tous les fichiers de performance backend
echo -e "${YELLOW}  Suppression: backend-performance-reports/*${NC}"
docker exec ${CONTAINER_NAME} sh -c "cd /app/backend-performance-reports && chmod 777 *.json *.html 2>/dev/null && rm -f *.json *.html 2>/dev/null || true" || true

# Supprimer tous les fichiers de performance frontend
echo -e "${YELLOW}  Suppression: frontend/performance-reports/*${NC}"
docker exec ${CONTAINER_NAME} sh -c "cd /app/frontend/performance-reports && chmod 777 *.json *.html 2>/dev/null && rm -f *.json *.html 2>/dev/null || true" || true

# Vérifier
remaining=$(docker exec ${CONTAINER_NAME} find /app/tests/results -type d -name "20*" 2>/dev/null | wc -l || echo "0")
if [ "$remaining" -eq 0 ]; then
    echo -e "${GREEN}✅ Tous les rapports supprimés dans Docker${NC}"
else
    echo -e "${YELLOW}⚠️  Il reste $remaining répertoire(s) dans Docker${NC}"
fi

