#!/bin/bash

# Script pour installer Docker Buildx

echo "🔧 Installation de Docker Buildx"
echo ""

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé"
    echo "💡 Installez Docker d'abord : https://docs.docker.com/get-docker/"
    exit 1
fi

echo "✅ Docker est installé"
echo ""

# Vérifier si buildx est déjà installé
if docker buildx version &> /dev/null; then
    echo "✅ Docker Buildx est déjà installé"
    docker buildx version
    exit 0
fi

echo "📋 Installation de Docker Buildx..."
echo ""

# Détecter la distribution
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo "❌ Impossible de détecter la distribution"
    exit 1
fi

case $OS in
    ubuntu|debian)
        echo "📦 Installation via apt (Ubuntu/Debian)..."
        sudo apt-get update
        sudo apt-get install -y docker-buildx-plugin docker-compose-plugin
        ;;
    arch|manjaro)
        echo "📦 Installation via pacman (Arch/Manjaro)..."
        sudo pacman -S --noconfirm docker-buildx docker-compose
        ;;
    fedora|rhel|centos)
        echo "📦 Installation via dnf/yum (Fedora/RHEL/CentOS)..."
        sudo dnf install -y docker-buildx-plugin docker-compose-plugin || \
        sudo yum install -y docker-buildx-plugin docker-compose-plugin
        ;;
    *)
        echo "⚠️  Distribution non reconnue: $OS"
        echo "💡 Installez manuellement: https://docs.docker.com/build/install/buildx/"
        exit 1
        ;;
esac

# Vérifier l'installation
if docker buildx version &> /dev/null; then
    echo ""
    echo "✅ Docker Buildx installé avec succès !"
    docker buildx version
    echo ""
    echo "💡 Créez un builder si nécessaire : docker buildx create --use"
else
    echo ""
    echo "❌ Échec de l'installation"
    echo "💡 Essayez manuellement : https://docs.docker.com/build/install/buildx/"
    exit 1
fi

