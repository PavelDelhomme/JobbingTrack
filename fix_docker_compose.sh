#!/bin/bash

# Script pour corriger automatiquement tous les scripts shell
# pour utiliser le wrapper Docker Compose portable

echo "🔧 Correction automatique des scripts Docker Compose..."

# Liste des scripts à corriger
scripts=(
    "scripts/setup/install-dependencies.sh"
    "scripts/health/check-all.sh"
    "scripts/core/stop.sh"
)

for script in "${scripts[@]}"; do
    if [ -f "$script" ]; then
        echo "📝 Traitement de $script..."
        
        # Ajouter l'import du wrapper après la ligne de configuration
        if ! grep -q "docker-compose-wrapper.sh" "$script"; then
            # Trouver la section configuration
            if grep -q "^# Configuration" "$script"; then
                sed -i '/^# Configuration/a\
\
# ============================================================================\
# DÉTECTION AUTOMATIQUE DOCKER COMPOSE\
# ============================================================================\
\
# Import du wrapper Docker Compose utilitaire\
SCRIPT_DIR="$(cd \"$(dirname \"${BASH_SOURCE[0]}\")\" && pwd)"\
UTILS_DIR="$SCRIPT_DIR/../utils"\
\
if [ -f "$UTILS_DIR/docker-compose-wrapper.sh" ]; then\
    source "$UTILS_DIR/docker-compose-wrapper.sh"\
\
    # Initialiser la détection Docker Compose\
    if ! init_docker_compose_detection; then\
        echo -e "${RED}❌ Impossible d'\''initialiser Docker Compose${NC}"\
        exit 1\
    fi\
else\
    echo -e "${RED}❌ Wrapper Docker Compose non trouvé${NC}"\
    exit 1\
fi' "$script"
            fi
        fi
        
        # Remplacer docker-compose par docker_compose_wrapper
        sed -i 's/docker-compose/docker_compose_wrapper/g' "$script"
        
        echo "✅ $script corrigé"
    else
        echo "⚠️ $script non trouvé"
    fi
done

echo "🎉 Correction terminée !"
