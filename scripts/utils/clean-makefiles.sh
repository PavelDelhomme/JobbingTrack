#!/bin/bash
# Script de nettoyage des makefiles obsolètes

echo "🧹 Nettoyage des makefiles obsolètes..."

# Supprimer les fichiers obsolètes
rm -f makefiles/root/Makefile
rm -f makefiles/Makefile.old.conflicts
rm -f makefiles/Makefile.dev
rm -f makefiles/Makefile.production
rm -f makefiles/backend/Makefile.backup
rm -f makefiles/backend/Makefile.old
rm -f makefiles/backend/Makefile.clean
rm -f makefiles/frontend/Makefile.clean

echo "✅ Nettoyage terminé"
echo ""
echo "📋 Makefiles restants:"
find makefiles -name "Makefile" -type f | sort
