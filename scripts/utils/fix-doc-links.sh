#!/usr/bin/env bash

# Script de correction automatique des liens

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔧 Correction automatique des liens..."
echo ""

REPO_BASE="https://github.com/PavelDelhomme/JobbingTrack/blob/feat/frontend-dashboard/"

# Fonction pour corriger un fichier
fix_file() {
    local file=$1
    
    if grep -q "$REPO_BASE" "$file" 2>/dev/null; then
        echo "🔧 Correction de $file..."
        
        # Sauvegarde
        cp "$file" "${file}.backup"
        
        # Correction
        sed -i "s|${REPO_BASE}||g" "$file"
        
        echo -e "${GREEN}✅ $file corrigé${NC}"
    fi
}

# Corriger README.md
fix_file "README.md"

# Corriger tous les fichiers dans docs/
for file in docs/*.md; do
    if [ -f "$file" ]; then
        fix_file "$file"
    fi
done

# Corriger scripts/README.md
if [ -f "scripts/README.md" ]; then
    fix_file "scripts/README.md"
fi

echo ""
echo -e "${GREEN}✅ Correction terminée !${NC}"
echo ""
echo "Vérifiez les changements avec :"
echo "  git diff README.md"
echo "  git diff docs/"
echo ""
echo "Pour annuler, restaurez les backups (.backup)"
