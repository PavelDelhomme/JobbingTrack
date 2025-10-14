#!/bin/bash

# Script pour configurer l'alias make pour JobbingTrack
# Usage: ./scripts/system/setup-make-alias.sh

set -e

echo "🔧 Configuration de l'alias make pour JobbingTrack..."

# Chemins
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MAKE_SCRIPT="$PROJECT_ROOT/make.sh"
SHELL_RC="$HOME/.zshrc"

# Vérifier que le script make.sh existe
if [ ! -f "$MAKE_SCRIPT" ]; then
    echo "❌ Script make.sh non trouvé: $MAKE_SCRIPT"
    exit 1
fi

# Vérifier si l'alias existe déjà
if grep -q "alias make=" "$SHELL_RC" 2>/dev/null; then
    echo "⚠️ Un alias make existe déjà dans $SHELL_RC"
    echo "📋 Contenu actuel:"
    grep "alias make=" "$SHELL_RC"
    echo ""
    echo "🔄 Voulez-vous le remplacer ? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "❌ Opération annulée"
        exit 0
    fi
fi

# Créer une sauvegarde du fichier rc
if [ -f "$SHELL_RC" ]; then
    cp "$SHELL_RC" "$SHELL_RC.backup.$(date +%Y%m%d_%H%M%S)"
    echo "💾 Sauvegarde créée: $SHELL_RC.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Supprimer l'ancien alias s'il existe
sed -i '/alias make=/d' "$SHELL_RC" 2>/dev/null || true

# Ajouter le nouvel alias
echo "" >> "$SHELL_RC"
echo "# ============================================================================" >> "$SHELL_RC"
echo "# Alias pour JobbingTrack Makefiles" >> "$SHELL_RC"
echo "# ============================================================================" >> "$SHELL_RC"
echo "alias make='$MAKE_SCRIPT'" >> "$SHELL_RC"
echo "" >> "$SHELL_RC"

echo "✅ Alias make configuré avec succès !"
echo ""
echo "📋 Ajouté à $SHELL_RC:"
echo "   alias make='$MAKE_SCRIPT'"
echo ""
echo "🔄 Rechargez votre shell ou exécutez:"
echo "   source ~/.zshrc"
echo ""
echo "🧪 Testez maintenant:"
echo "   make help    # Doit afficher l'aide de JobbingTrack"
