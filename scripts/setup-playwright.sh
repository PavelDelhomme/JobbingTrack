#!/bin/bash

# Script d'installation spécialisé pour Playwright et navigateurs
# Utilisé uniquement pour la configuration initiale de l'environnement de test

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_DIR="frontend"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${CYAN}╔════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  🎭 INSTALLATION PLAYWRIGHT - JobbingTrack                            ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Vérifier que nous sommes dans le bon répertoire
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}❌ Répertoire frontend non trouvé${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Étape 1/3: Installation du package Playwright...${NC}"
cd "$FRONTEND_DIR"
npm install @playwright/test --save-dev --legacy-peer-deps || {
    echo -e "${RED}❌ Erreur lors de l'installation de Playwright${NC}"
    exit 1
}
echo -e "${GREEN}✅ Playwright installé${NC}"
echo ""

echo -e "${YELLOW}🌐 Étape 2/3: Installation des navigateurs (chromium, firefox, webkit)...${NC}"
echo -e "${CYAN}   Cela peut prendre plusieurs minutes...${NC}"
npx playwright install --with-deps chromium firefox webkit || {
    echo -e "${YELLOW}⚠️  Tentative sans --with-deps...${NC}"
    npx playwright install chromium firefox webkit || {
        echo -e "${RED}❌ Erreur lors de l'installation des navigateurs${NC}"
        exit 1
    }
}
echo -e "${GREEN}✅ Navigateurs installés${NC}"
echo ""

echo -e "${YELLOW}🔍 Étape 3/3: Vérification de l'installation...${NC}"
if npx playwright --version >/dev/null 2>&1; then
    PLAYWRIGHT_VERSION=$(npx playwright --version 2>/dev/null | head -1)
    echo -e "${GREEN}✅ Playwright: ${PLAYWRIGHT_VERSION}${NC}"
else
    echo -e "${RED}❌ Playwright non trouvé${NC}"
    exit 1
fi

# Vérifier les navigateurs
BROWSERS_OK=true
for browser in chromium firefox webkit; do
    if npx playwright install --dry-run "$browser" 2>&1 | grep -q "already installed\|will be installed"; then
        echo -e "${GREEN}✅ ${browser} disponible${NC}"
    else
        echo -e "${YELLOW}⚠️  ${browser} non vérifié${NC}"
        BROWSERS_OK=false
    fi
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ "$BROWSERS_OK" = true ]; then
    echo -e "${GREEN}✅ Installation Playwright terminée avec succès !${NC}"
    echo ""
    echo -e "${CYAN}💡 Vous pouvez maintenant lancer les tests mobile:${NC}"
    echo -e "${CYAN}   make menu → Option 10 → Option 1 (test-mobile)${NC}"
else
    echo -e "${YELLOW}⚠️  Installation terminée avec des avertissements${NC}"
    echo -e "${YELLOW}   Vérifiez manuellement les navigateurs si nécessaire${NC}"
fi
echo ""

