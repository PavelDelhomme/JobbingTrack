#!/bin/bash

# ============================================================================
# Script d'Installation des Emojis - JobbingTrack
# ============================================================================
# Ce script installe une police d'emojis sur Linux (Manjaro/Arch/Ubuntu/Debian)
# ============================================================================

set -e

echo "😀 Installation des Emojis pour JobbingTrack"
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

# Fonction pour installer sur Manjaro/Arch
install_emojis_manjaro_arch() {
    echo "🔧 Installation des emojis (Manjaro/Arch)..."
    
    # Installer Noto Color Emoji (le plus complet)
    sudo pacman -S --noconfirm noto-fonts-emoji || {
        echo "⚠️  noto-fonts-emoji non disponible, tentative avec ttf-noto-emoji..."
        sudo pacman -S --noconfirm ttf-noto-emoji || {
            echo "⚠️  ttf-noto-emoji non disponible, installation de font-noto-emoji..."
            sudo pacman -S --noconfirm font-noto-emoji || {
                echo "❌ Impossible d'installer une police d'emojis via pacman"
                echo "💡 Installation manuelle recommandée"
                return 1
            }
        }
    }
    
    # Installer aussi les emojis Apple (optionnel mais joli)
    if pacman -Ss apple-emoji &>/dev/null; then
        echo "🍎 Installation des emojis Apple (optionnel)..."
        sudo pacman -S --noconfirm ttf-apple-emoji 2>/dev/null || echo "⚠️  Emojis Apple non disponibles"
    fi
    
    echo "✅ Emojis installés"
}

# Fonction pour installer sur Ubuntu/Debian
install_emojis_ubuntu_debian() {
    echo "🔧 Installation des emojis (Ubuntu/Debian)..."
    
    sudo apt-get update
    sudo apt-get install -y fonts-noto-color-emoji || {
        echo "⚠️  fonts-noto-color-emoji non disponible, tentative avec fonts-noto-emoji..."
        sudo apt-get install -y fonts-noto-emoji || {
            echo "❌ Impossible d'installer une police d'emojis"
            return 1
        }
    }
    
    echo "✅ Emojis installés"
}

# Installation selon la distribution
case $DISTRO in
    manjaro|arch)
        install_emojis_manjaro_arch
        ;;
    ubuntu|debian)
        install_emojis_ubuntu_debian
        ;;
    *)
        echo "⚠️  Distribution non supportée automatiquement: $DISTRO"
        echo ""
        echo "💡 Installation manuelle:"
        echo "   # Manjaro/Arch:"
        echo "   sudo pacman -S noto-fonts-emoji"
        echo ""
        echo "   # Ubuntu/Debian:"
        echo "   sudo apt-get install fonts-noto-color-emoji"
        echo ""
        echo "   # Puis redémarrer votre session ou:"
        echo "   fc-cache -fv"
        exit 1
        ;;
esac

# Mettre à jour le cache des polices
echo ""
echo "🔄 Mise à jour du cache des polices..."
fc-cache -fv >/dev/null 2>&1 || {
    echo "⚠️  fc-cache non disponible, redémarrez votre session"
}

echo ""
echo "✅ Installation terminée !"
echo ""
echo "📝 Prochaines étapes:"
echo "   1. Redémarrer votre session graphique (ou simplement fermer/rouvrir les applications)"
echo "   2. Ou exécuter: fc-cache -fv"
echo "   3. Les emojis devraient maintenant s'afficher correctement"
echo ""
echo "🧪 Test: Ouvrez un terminal et tapez:"
echo "   echo '😀 🚀 ✅ ❌ ⚠️ 📦 🔧 🌐 📊 👤 🔑'"
echo ""

