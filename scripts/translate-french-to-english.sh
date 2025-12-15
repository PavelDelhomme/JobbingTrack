#!/bin/bash

# Script to translate French text to English in codebase
# This script uses sed to replace common French phrases with English equivalents

echo "🔄 Starting translation of French text to English..."

# Function to translate a file
translate_file() {
    local file="$1"
    if [ ! -f "$file" ]; then
        return
    fi
    
    echo "  Translating: $file"
    
    # Common translations
    sed -i 's/Erreur interne du serveur/Internal server error/g' "$file"
    sed -i 's/Données de requête invalides/Invalid request data/g' "$file"
    sed -i 's/Ressource non trouvée/Resource not found/g' "$file"
    sed -i 's/Conflit de données: ressource déjà existante/Data conflict: resource already exists/g' "$file"
    sed -i 's/Erreur de contrainte de clé étrangère/Foreign key constraint error/g' "$file"
    sed -i 's/Erreur de base de données/Database error/g' "$file"
    sed -i 's/Erreur HTTP/HTTP error/g' "$file"
    sed -i 's/Log de l'\''erreur/Error log/g' "$file"
    sed -i 's/Réponse d'\''erreur/Error response/g' "$file"
    sed -i 's/Erreurs de validation Joi/Joi validation errors/g' "$file"
    sed -i 's/Erreurs Prisma/Prisma errors/g' "$file"
    sed -i 's/Erreurs personnalisées/Custom errors/g' "$file"
    sed -i 's/Table non trouvée/Table not found/g' "$file"
    sed -i 's/Une ressource avec ces données existe déjà/A resource with this data already exists/g' "$file"
    sed -i 's/Référence invalide/Invalid reference/g' "$file"
    sed -i 's/Données invalides/Invalid data/g' "$file"
    sed -i 's/Token invalide/Invalid token/g' "$file"
    sed -i 's/Token expiré/Token expired/g' "$file"
    sed -i 's/Erreur par défaut/Default error/g' "$file"
}

# Translate error handlers
echo "📝 Translating error handlers..."
find backend -name "errorHandler.js" -type f | while read file; do
    translate_file "$file"
done

echo "✅ Translation complete!"
echo ""
echo "⚠️  Note: This script does basic translations. Please review the changes manually."

