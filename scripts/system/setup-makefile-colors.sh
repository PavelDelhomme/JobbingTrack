#!/bin/bash

# Script pour configurer les couleurs du Makefile dans zshrc
# Usage: ./scripts/setup-makefile-colors.sh

set -e

echo "🎨 Configuration des couleurs du Makefile pour zsh..."

# Chemin vers le fichier de couleurs
COLORS_FILE="$(pwd)/makefiles/.make_colors"
ZSHRC_FILE="$HOME/.zshrc"

# Vérifier si le fichier de couleurs existe
if [ ! -f "$COLORS_FILE" ]; then
    echo "❌ Fichier de couleurs non trouvé: $COLORS_FILE"
    exit 1
fi

# Vérifier si le fichier zshrc existe
if [ ! -f "$ZSHRC_FILE" ]; then
    echo "⚠️ Fichier zshrc non trouvé, création de $ZSHRC_FILE"
    touch "$ZSHRC_FILE"
fi

# Vérifier si la ligne est déjà présente dans zshrc
if grep -q "source.*\.make_colors" "$ZSHRC_FILE"; then
    echo "✅ Les couleurs du Makefile sont déjà configurées dans zshrc"
    echo ""
    echo "🔍 Vérification de la configuration actuelle:"
    grep "source.*\.make_colors" "$ZSHRC_FILE"
else
    # Ajouter la ligne de configuration
    echo "" >> "$ZSHRC_FILE"
    echo "# Couleurs pour les Makefiles JobbingTrack" >> "$ZSHRC_FILE"
    echo "source \"$COLORS_FILE\"" >> "$ZSHRC_FILE"
    echo "" >> "$ZSHRC_FILE"

    echo "✅ Couleurs du Makefile ajoutées à votre zshrc"
    echo ""
    echo "📋 Ligne ajoutée:"
    echo "   source \"$COLORS_FILE\""
fi

echo ""
echo "💡 Test des couleurs:"
echo "   Rechargez votre shell: source ~/.zshrc"
echo "   Ou redémarrez votre terminal"
echo ""
echo "🔧 Utilisation:"
echo "   make help    # Pour voir les couleurs en action"
echo ""

# Tester si les variables sont disponibles
if [ -n "$MAKE_GREEN" ]; then
    echo -e "${MAKE_GREEN}✅ Les couleurs fonctionnent déjà !${MAKE_NC}"
else
    echo "⚠️ Rechargez votre shell pour voir les couleurs"
fi
