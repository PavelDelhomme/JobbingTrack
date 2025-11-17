#!/bin/bash

# ============================================================================
# Script d'Installation Docker et Docker Compose - JobbingTrack
# ============================================================================
# Ce script installe Docker et Docker Compose sur Linux (Ubuntu/Debian/Manjaro/Arch)
# ============================================================================

set -e

echo "🐳 Installation Docker et Docker Compose pour JobbingTrack"
echo "================================================================"
echo ""

# Détecter la distribution
if [ -f /etc/os-release ]; then
    . /etc/os-release
    DISTRO=$ID
else
    echo "❌ Impossible de détecter la distribution Linux"
    exit 1
fi

echo "📦 Distribution détectée: $DISTRO"
echo ""

# Fonction pour installer Docker sur Ubuntu/Debian
install_docker_ubuntu_debian() {
    echo "🔧 Installation Docker (Ubuntu/Debian)..."
    
    # Mettre à jour les paquets
    sudo apt-get update
    
    # Installer les dépendances
    sudo apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    # Ajouter la clé GPG officielle Docker
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # Configurer le repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Installer Docker
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    echo "✅ Docker installé"
}

# Fonction pour installer Docker sur Manjaro/Arch
install_docker_manjaro_arch() {
    echo "🔧 Installation Docker (Manjaro/Arch)..."
    
    # Installer Docker
    sudo pacman -S --noconfirm docker docker-compose
    
    # Démarrer Docker
    sudo systemctl start docker
    sudo systemctl enable docker
    
    echo "✅ Docker installé"
}

# Fonction pour installer Docker Compose standalone
install_docker_compose_standalone() {
    echo "🔧 Installation Docker Compose standalone..."
    
    # Télécharger la dernière version
    DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    sudo curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    
    # Rendre exécutable
    sudo chmod +x /usr/local/bin/docker-compose
    
    echo "✅ Docker Compose standalone installé (version ${DOCKER_COMPOSE_VERSION})"
}

# Fonction pour créer l'alias docker-compose
create_docker_compose_alias() {
    echo "🔧 Création de l'alias docker-compose..."
    
    # Détecter le shell
    SHELL_NAME=$(basename "$SHELL")
    
    if [ "$SHELL_NAME" = "zsh" ]; then
        RC_FILE="$HOME/.zshrc"
    elif [ "$SHELL_NAME" = "bash" ]; then
        RC_FILE="$HOME/.bashrc"
    else
        RC_FILE="$HOME/.profile"
    fi
    
    # Vérifier si l'alias existe déjà
    if grep -q "alias docker-compose=" "$RC_FILE" 2>/dev/null; then
        echo "⚠️  Alias docker-compose existe déjà dans $RC_FILE"
    else
        # Ajouter l'alias
        echo "" >> "$RC_FILE"
        echo "# Alias docker-compose pour JobbingTrack" >> "$RC_FILE"
        echo "alias docker-compose='docker compose'" >> "$RC_FILE"
        echo "✅ Alias ajouté dans $RC_FILE"
    fi
    
    # Créer l'alias pour la session actuelle
    alias docker-compose='docker compose'
    export -f docker-compose 2>/dev/null || true
}

# Fonction pour configurer les permissions
setup_docker_permissions() {
    echo "🔧 Configuration des permissions Docker..."
    
    # Ajouter l'utilisateur au groupe docker
    sudo usermod -aG docker $USER
    
    echo "✅ Utilisateur $USER ajouté au groupe docker"
    echo ""
    echo "⚠️  IMPORTANT: Vous devez redémarrer votre session ou exécuter:"
    echo "   newgrp docker"
}

# Installation selon la distribution
case $DISTRO in
    ubuntu|debian)
        install_docker_ubuntu_debian
        ;;
    manjaro|arch)
        install_docker_manjaro_arch
        ;;
    *)
        echo "⚠️  Distribution non supportée automatiquement: $DISTRO"
        echo ""
        echo "💡 Installation manuelle:"
        echo "   https://docs.docker.com/get-docker/"
        exit 1
        ;;
esac

# Installer Docker Compose si pas déjà installé
if ! command -v docker compose &>/dev/null 2>&1 && ! command -v docker-compose &>/dev/null 2>&1; then
    install_docker_compose_standalone
fi

# Créer l'alias docker-compose
if command -v docker compose &>/dev/null 2>&1 && ! command -v docker-compose &>/dev/null 2>&1; then
    create_docker_compose_alias
fi

# Configurer les permissions
setup_docker_permissions

# Vérification finale
echo ""
echo "🔍 Vérification de l'installation..."
echo ""

if command -v docker &>/dev/null 2>&1; then
    echo "✅ Docker: $(docker --version)"
else
    echo "❌ Docker non trouvé"
fi

if command -v docker compose &>/dev/null 2>&1; then
    echo "✅ Docker Compose (plugin): $(docker compose version)"
elif command -v docker-compose &>/dev/null 2>&1; then
    echo "✅ Docker Compose (standalone): $(docker-compose --version)"
else
    echo "❌ Docker Compose non trouvé"
fi

echo ""
echo "================================================================"
echo "✅ Installation terminée !"
echo ""
echo "📝 Prochaines étapes:"
echo "   1. Redémarrer votre session ou exécuter: newgrp docker"
echo "   2. Vérifier: docker ps"
echo "   3. Lancer le projet: make up-full"
echo ""
echo "📖 Documentation: docs/getting-started/GUIDE_INSTALLATION.md"
echo ""

