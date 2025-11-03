#!/bin/bash

# ============================================
# Script de Nettoyage des Fichiers Obsolètes
# ============================================

set -e

echo "🗑️  Nettoyage des fichiers obsolètes..."
echo ""

cd "$(dirname "$0")/.."

# Créer le dossier trash_files
mkdir -p trash_files

# Déplacer les fichiers obsolètes
echo "📦 Déplacement des fichiers vers trash_files/..."

# Makefile obsolètes
[ -f "Makefile.old" ] && mv "Makefile.old" trash_files/ && echo "  ✅ Makefile.old"
[ -f "Makefile.old.old" ] && mv "Makefile.old.old" trash_files/ && echo "  ✅ Makefile.old.old"
[ -f "Makefile.backup" ] && mv "Makefile.backup" trash_files/ && echo "  ✅ Makefile.backup"

# Frontend backup
[ -d "frontend-backup-20251030-163022" ] && mv "frontend-backup-20251030-163022" trash_files/ && echo "  ✅ frontend-backup-20251030-163022"

# Scripts fix-admin-email et verify-admin-email (obsolètes)
[ -f "scripts/fix-admin-email.sh" ] && mv "scripts/fix-admin-email.sh" trash_files/ && echo "  ✅ fix-admin-email.sh"
[ -f "scripts/verify-admin-email.sh" ] && mv "scripts/verify-admin-email.sh" trash_files/ && echo "  ✅ verify-admin-email.sh"

echo ""
echo "✅ Nettoyage terminé !"
echo ""
echo "📂 Les fichiers obsolètes sont dans: trash_files/"
echo "💡 Vous pouvez supprimer ce dossier quand vous voulez: rm -rf trash_files"
