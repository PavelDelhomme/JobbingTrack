#!/usr/bin/env bash

# Script de vérification des liens dans la documentation

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔍 Vérification des liens dans la documentation..."
echo ""

ERRORS=0
WARNINGS=0

# Fonction pour vérifier un fichier
check_file() {
    local file=$1
    echo "📄 Vérification de $file"
    
    # Cherche les liens GitHub absolus
    if grep -n "github.com/OWNER/JobbingTrack/blob/" "$file" > /dev/null 2>&1; then
        echo -e "${RED}❌ Liens absolus trouvés dans $file :${NC}"
        grep -n "github.com/OWNER/JobbingTrack/blob/" "$file"
        ((ERRORS++))
    fi
    
    # Cherche les liens vers docs/ et scripts/
    if grep -E "\[.*\]\(docs/.*\.md\)" "$file" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Liens relatifs vers docs/ : OK${NC}"
    fi
    
    if grep -E "\[.*\]\(scripts/.*\.md\)" "$file" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Liens relatifs vers scripts/ : OK${NC}"
    fi
    
    echo ""
}

# Vérifier README.md principal
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_file "README.md"

# Vérifier tous les fichiers dans docs/
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📚 Vérification des fichiers dans docs/"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
for file in docs/*.md; do
    if [ -f "$file" ]; then
        check_file "$file"
    fi
done

# Vérifier scripts/README.md
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f "scripts/README.md" ]; then
    check_file "scripts/README.md"
fi

# Résumé
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RÉSUMÉ"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ Tous les liens sont corrects !${NC}"
    exit 0
else
    echo -e "${RED}❌ $ERRORS erreur(s) trouvée(s)${NC}"
    echo -e "${YELLOW}💡 Utilisez: ./scripts/utils/fix-doc-links.sh pour corriger${NC}"
    exit 1
fi
