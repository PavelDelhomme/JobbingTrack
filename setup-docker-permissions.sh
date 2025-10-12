#!/bin/bash

echo "🔧 Configuration des permissions Docker pour JobbingTrack"
echo "=========================================================="
echo ""

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé sur ce système"
    echo "   Veuillez installer Docker avant de continuer"
    exit 1
fi

echo "✅ Docker est installé"
echo ""

# Vérifier si l'utilisateur est dans le groupe docker
if groups $USER | grep &>/dev/null '\bdocker\b'; then
    echo "✅ L'utilisateur $USER est déjà dans le groupe docker"
else
    echo "📝 Ajout de l'utilisateur $USER au groupe docker..."
    sudo usermod -aG docker $USER
    echo "✅ Utilisateur ajouté au groupe docker"
    echo ""
    echo "⚠️  IMPORTANT: Vous devez vous déconnecter et vous reconnecter"
    echo "   pour que les changements prennent effet, ou exécutez:"
    echo "   newgrp docker"
fi

echo ""
echo "🧪 Test de la commande docker stats..."

if docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>/dev/null | head -n 5; then
    echo ""
    echo "✅ Les statistiques Docker sont accessibles !"
    echo ""
    echo "📊 Les métriques suivantes seront disponibles dans le backoffice:"
    echo "   - Utilisation CPU en temps réel"
    echo "   - Utilisation mémoire (RAM) en temps réel"
    echo "   - Trafic réseau"
    echo "   - I/O disque"
else
    echo ""
    echo "❌ Impossible d'accéder aux statistiques Docker"
    echo ""
    echo "Solutions possibles:"
    echo "1. Vérifiez que Docker daemon est démarré:"
    echo "   sudo systemctl start docker"
    echo ""
    echo "2. Si vous venez d'ajouter votre utilisateur au groupe docker:"
    echo "   - Déconnectez-vous et reconnectez-vous"
    echo "   - OU exécutez: newgrp docker"
    echo ""
    echo "3. Vérifiez les permissions du socket Docker:"
    echo "   sudo chmod 666 /var/run/docker.sock"
    exit 1
fi

echo ""
echo "🎉 Configuration terminée avec succès !"
echo ""
echo "💡 Pour tester les nouvelles fonctionnalités:"
echo "   1. Démarrez vos services: make start"
echo "   2. Allez dans le backoffice: http://localhost:3000/backoffice"
echo "   3. Cliquez sur 'Gestion des Services'"
echo "   4. Consultez les métriques en temps réel de chaque service"
echo ""

