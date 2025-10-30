#!/bin/bash

# ============================================
# Script de Correction Automatique des Schémas Prisma
# ============================================

set -e

echo "🔧 Correction automatique de tous les schémas Prisma..."
echo ""

cd "$(dirname "$0")/.."

# Trouver tous les fichiers schema.prisma
SCHEMA_FILES=$(find backend -name "schema.prisma" -type f)

if [ -z "$SCHEMA_FILES" ]; then
    echo "❌ Aucun fichier schema.prisma trouvé"
    exit 1
fi

echo "📋 Schémas Prisma trouvés:"
echo "$SCHEMA_FILES" | sed 's/^/  - /'
echo ""

FIXED=0
ERRORS=0

# Pour chaque schéma
while IFS= read -r schema; do
    SERVICE_DIR=$(dirname "$schema")
    SERVICE_NAME=$(basename "$SERVICE_DIR")
    
    echo "🔍 Traitement de $SERVICE_NAME..."
    
    # Aller dans le dossier du service
    cd "$SERVICE_DIR"
    
    # Vérifier si npx est disponible
    if ! command -v npx &> /dev/null; then
        echo "  ⚠️  npx non trouvé, installation en cours..."
        npm install -g npm
    fi
    
    # Exécuter prisma format
    if npx prisma format 2>&1 | grep -q "formatted"; then
        echo "  ✅ $SERVICE_NAME - Schéma formaté et corrigé"
        FIXED=$((FIXED + 1))
    else
        echo "  ⚠️  $SERVICE_NAME - Déjà correct ou erreur"
    fi
    
    # Retourner au répertoire racine
    cd - > /dev/null
    
    echo ""
done <<< "$SCHEMA_FILES"

echo "✅ Correction terminée !"
echo "   📦 Schémas corrigés: $FIXED"
echo ""
echo "💡 Vous pouvez maintenant lancer:"
echo "   make rebuild"
echo ""
