#!/bin/bash

# Script pour afficher le rapport HTML des tests mobile
# Gère la copie depuis le conteneur Docker si nécessaire

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

FRONTEND_DIR="frontend"
DOCKER_CONTAINER="jobbingtrack-frontend"
REPORT_DIR="$FRONTEND_DIR/playwright-report-mobile"
PORT=5004

echo -e "${CYAN}📊 Ouverture du rapport HTML...${NC}"

# Vérifier si le rapport existe localement
if [ -d "$REPORT_DIR" ]; then
    echo -e "${GREEN}✅ Rapport trouvé localement${NC}"
    echo -e "${YELLOW}💡 Le rapport sera accessible sur http://localhost:${PORT}${NC}"
    cd "$FRONTEND_DIR" && npx playwright show-report playwright-report-mobile --port "$PORT" 2>/dev/null || \
        (echo -e "${YELLOW}⚠️  Impossible d'ouvrir le serveur Playwright, ouverture directe du fichier...${NC}" && \
         if command -v xdg-open > /dev/null; then xdg-open "$REPORT_DIR/index.html" 2>/dev/null; \
         elif command -v open > /dev/null; then open "$REPORT_DIR/index.html" 2>/dev/null; fi)
# Vérifier si le rapport existe dans le conteneur Docker
elif docker exec "$DOCKER_CONTAINER" test -d /app/playwright-report-mobile 2>/dev/null; then
    echo -e "${YELLOW}💡 Rapport trouvé dans le conteneur, copie locale...${NC}"
    docker cp "$DOCKER_CONTAINER:/app/playwright-report-mobile" "$REPORT_DIR" 2>/dev/null || \
        (echo -e "${RED}❌ Erreur lors de la copie du rapport${NC}" && exit 1)
    echo -e "${GREEN}✅ Rapport copié avec succès${NC}"
    echo -e "${YELLOW}💡 Le rapport sera accessible sur http://localhost:${PORT}${NC}"
    cd "$FRONTEND_DIR" && npx playwright show-report playwright-report-mobile --port "$PORT" 2>/dev/null || \
        (echo -e "${YELLOW}⚠️  Impossible d'ouvrir le serveur Playwright, ouverture directe du fichier...${NC}" && \
         if command -v xdg-open > /dev/null; then xdg-open "$REPORT_DIR/index.html" 2>/dev/null; \
         elif command -v open > /dev/null; then open "$REPORT_DIR/index.html" 2>/dev/null; fi)
else
    echo -e "${RED}❌ Aucun rapport trouvé${NC}"
    echo -e "${YELLOW}💡 Lancez d'abord les tests: make test-mobile${NC}"
    echo -e "${YELLOW}💡 Ou vérifiez que le conteneur est démarré: docker ps | grep frontend${NC}"
    exit 1
fi

