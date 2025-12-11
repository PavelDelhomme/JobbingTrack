#!/bin/bash

# ============================================================================
# Script d'optimisation mémoire Frontend - JobbingTrack
# ============================================================================
# Applique des optimisations pour réduire la consommation mémoire
# ============================================================================

set -e

FRONTEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================================================"
echo "⚡ OPTIMISATION MÉMOIRE FRONTEND"
echo "========================================================${NC}"
echo ""

cd "${FRONTEND_DIR}"

# 1. Nettoyer le cache
echo -e "${YELLOW}1. Nettoyage du cache...${NC}"
npm run clean
echo -e "${GREEN}✅ Cache nettoyé${NC}"
echo ""

# 2. Vérifier les dépendances lourdes
echo -e "${YELLOW}2. Analyse des dépendances lourdes...${NC}"
if [ -d "node_modules" ]; then
    echo "Top 10 des plus gros packages:"
    du -sh node_modules/* 2>/dev/null | sort -rh | head -10 || true
fi
echo ""

# 3. Vérifier la configuration Next.js
echo -e "${YELLOW}3. Vérification de la configuration Next.js...${NC}"
if grep -q "reactStrictMode: false" next.config.js; then
    echo -e "${GREEN}✅ reactStrictMode désactivé (économie mémoire)${NC}"
else
    echo -e "${YELLOW}⚠️  reactStrictMode activé (peut augmenter la mémoire)${NC}"
fi

if grep -q "compress: true" next.config.js; then
    echo -e "${GREEN}✅ Compression activée${NC}"
else
    echo -e "${YELLOW}⚠️  Compression non activée${NC}"
fi
echo ""

# 4. Recommandations
echo -e "${BLUE}================================================================"
echo "💡 RECOMMANDATIONS D'OPTIMISATION"
echo "========================================================${NC}"
echo ""
echo "Pour réduire la mémoire de moitié (~500MB), appliquez:"
echo ""
echo "1. Code Splitting:"
echo "   • Utiliser React.lazy() pour les pages lourdes"
echo "   • Implémenter le lazy loading des composants"
echo ""
echo "2. Optimisation des imports:"
echo "   • Importer uniquement les icônes nécessaires:"
echo "     import { Play } from 'lucide-react'  ✅"
echo "     import * as Icons from 'lucide-react' ❌"
echo ""
echo "3. Virtualisation:"
echo "   • Utiliser react-window pour les longues listes"
echo "   • Implémenter la pagination infinie"
echo ""
echo "4. Mémoire:"
echo "   • Nettoyer les event listeners dans useEffect cleanup"
echo "   • Utiliser useMemo/useCallback pour éviter les re-renders"
echo "   • Éviter de stocker de grandes quantités de données en state"
echo ""
echo "5. Build:"
echo "   • Activer la compression Brotli"
echo "   • Optimiser les images (WebP, AVIF)"
echo "   • Minifier le CSS et JS"
echo ""

echo -e "${GREEN}✅ Analyse terminée${NC}"

