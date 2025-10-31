#!/bin/bash

# ============================================
# SCRIPT DE LANCEMENT ULTRA-SIMPLE
# ============================================

echo "🚀 LANCEMENT DU COMMIT ET PUSH"
echo ""
echo "Ce script va :"
echo "  1. Rendre tous les scripts exécutables"
echo "  2. Ajouter tous les fichiers créés dans git"
echo "  3. Créer un commit détaillé"
echo "  4. Push vers GitHub"
echo ""
echo "Appuyez sur Entrée pour continuer..."
read

# Rendre exécutables
chmod +x scripts/*.sh

# Lancer le script de commit
bash scripts/git-commit-migration.sh
