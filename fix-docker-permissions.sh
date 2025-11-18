#!/bin/bash

# Script pour résoudre les problèmes de permissions Docker

echo "🔧 Résolution des problèmes de permissions Docker"
echo ""

# Vérifier si l'utilisateur est dans le groupe docker
if groups | grep -q docker; then
    echo "✅ Vous êtes déjà dans le groupe docker"
    echo "💡 Si les permissions ne fonctionnent toujours pas, déconnectez-vous et reconnectez-vous"
    echo ""
    echo "📋 Solutions possibles :"
    echo "   1. Déconnectez-vous et reconnectez-vous (ou redémarrez votre session)"
    echo "   2. Utilisez 'newgrp docker' pour activer le groupe sans redémarrer"
    echo "   3. Utilisez 'sudo' pour les commandes Docker (temporaire)"
    exit 0
fi

echo "❌ Vous n'êtes PAS dans le groupe docker"
echo ""
echo "📋 Solution : Ajouter votre utilisateur au groupe docker"
echo "----------------------------------------"
echo ""
echo "Exécutez ces commandes (avec sudo) :"
echo ""
echo "  sudo usermod -aG docker $USER"
echo "  newgrp docker"
echo ""
echo "OU redémarrez votre session après avoir exécuté :"
echo "  sudo usermod -aG docker $USER"
echo ""
echo "💡 Après cela, vous pourrez utiliser Docker sans sudo"

