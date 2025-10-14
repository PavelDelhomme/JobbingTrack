#!/bin/bash

# Script pour nettoyer automatiquement les fichiers de sauvegarde
# Usage: ./scripts/system/clean-backups.sh

set -e

echo "🧹 Nettoyage automatique des fichiers de sauvegarde..."

# Compter les fichiers avant nettoyage
BEFORE=$(find . -name "*.backup*" -o -name "*~" -o -name "*.orig" -o -name "*.bak" | wc -l)

if [ "$BEFORE" -eq 0 ]; then
    echo "✅ Aucun fichier de sauvegarde trouvé"
    exit 0
fi

echo "📊 Fichiers de sauvegarde trouvés: $BEFORE"

# Lister les fichiers à supprimer
echo ""
echo "📋 Fichiers à supprimer:"
find . -name "*.backup*" -o -name "*~" -o -name "*.orig" -o -name "*.bak" | head -20

# Demander confirmation
echo ""
echo "⚠️ Êtes-vous sûr de vouloir supprimer ces fichiers ? (y/N)"
read -r response

if [[ ! "$response" =~ ^[Yy]$ ]]; then
    echo "❌ Opération annulée"
    exit 0
fi

# Supprimer les fichiers
echo ""
echo "🗑️ Suppression en cours..."
find . -name "*.backup*" -o -name "*~" -o -name "*.orig" -o -name "*.bak" -delete

# Compter après nettoyage
AFTER=$(find . -name "*.backup*" -o -name "*~" -o -name "*.orig" -o -name "*.bak" | wc -l)

echo ""
echo "✅ Nettoyage terminé !"
echo "📊 Fichiers supprimés: $((BEFORE - AFTER))"
echo "📁 Fichiers restants: $AFTER"

# Conseils
echo ""
echo "💡 Conseils pour éviter l'accumulation:"
echo "   • Configurez votre éditeur pour ne pas créer de fichiers de sauvegarde"
echo "   • Utilisez 'git clean' pour nettoyer automatiquement"
echo "   • Exécutez ce script régulièrement: ./scripts/system/clean-backups.sh"
