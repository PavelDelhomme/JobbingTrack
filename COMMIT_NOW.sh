#!/bin/bash
# Script pour commit et push toutes les modifications

cd /home/pactivisme/Documents/Dev/Perso/JobbingTrackProject/JobbingTrack

echo "📋 Vérification de l'état Git..."
git status

echo ""
echo "📦 Ajout de tous les fichiers modifiés..."
git add -A

echo ""
echo "📝 État après git add..."
git status --short

echo ""
echo "💾 Commit des modifications..."
git commit -m "fix: Activation hot reload et fallbacks P2021 pour company/application services

- Ajout volumes et nodemon pour company-service et application-service
- Installation de toutes les dépendances (y compris dev) dans Dockerfiles
- Hot reload activé pour rechargement automatique du code
- Amélioration fallbacks P2021 dans controllers et error handlers
- Documentation solution erreurs 500 (SOLUTION_ERREURS_500.md)
- Les services doivent être démarrés avec le profil 'full'
- Guide troubleshooting login (TROUBLESHOOTING_LOGIN.md)
- Quick fix guide (QUICK_FIX_500_ERRORS.md)"

echo ""
echo "🚀 Push vers le dépôt distant..."
git push origin feat/send-reset-and-validate-email

echo ""
echo "✅ Vérification finale..."
git status

echo ""
echo "✨ Terminé !"

