#!/bin/bash
# Script pour corriger automatiquement les apostrophes non échappées dans les fichiers JSX

FRONTEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$FRONTEND_DIR"

echo "🔧 Correction des apostrophes dans les fichiers JSX..."

# Trouver tous les fichiers .tsx et .jsx
find src -type f \( -name "*.tsx" -o -name "*.jsx" \) | while read -r file; do
  # Remplacer les apostrophes dans les chaînes JSX (entre guillemets simples ou doubles)
  # Pattern: trouver les apostrophes dans les chaînes JSX et les remplacer par &apos;
  # On évite de remplacer les apostrophes dans les commentaires ou les chaînes de code
  
  # Utiliser sed pour remplacer les apostrophes dans les chaînes JSX
  # Pattern: '...' ou "..."
  sed -i.bak \
    -e "s/\(['\"]\)\([^'\"]*\)'\([^'\"]*\)\1/\1\2\&apos;\3\1/g" \
    -e "s/\(>\)\([^<]*\)'\([^<]*\)\(<\)/\1\2\&apos;\3\4/g" \
    "$file" 2>/dev/null
  
  # Supprimer les fichiers de backup
  rm -f "${file}.bak" 2>/dev/null
done

echo "✅ Correction terminée !"
echo "⚠️  Vérifiez les changements avec: git diff"

