#!/usr/bin/env bash

# Script pour corriger les liens absolus dans README.md

README_FILE="README.md"
REPO_URL="https://github.com/PavelDelhomme/JobbingTrack/blob/feat/frontend-dashboard/"

echo "🔍 Recherche des liens absolus dans $README_FILE..."

# Compte le nombre de liens absolus
COUNT=$(grep -c "$REPO_URL" "$README_FILE" 2>/dev/null || echo "0")

if [ "$COUNT" -eq 0 ]; then
    echo "✅ Aucun lien absolu trouvé !"
    exit 0
fi

echo "⚠️  Trouvé $COUNT lien(s) absolu(s)"
echo "🔧 Correction en cours..."

# Sauvegarde
cp "$README_FILE" "${README_FILE}.backup"

# Remplace les liens absolus par des liens relatifs
sed -i.bak "s|${REPO_URL}||g" "$README_FILE"

echo "✅ Correction terminée !"
echo "📝 Sauvegarde créée : ${README_FILE}.backup"
echo ""
echo "Vérifiez les changements avec :"
echo "git diff $README_FILE"
