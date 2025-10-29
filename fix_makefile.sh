#!/bin/bash

# Créer un fichier temporaire pour le Makefile corrigé
cat > /tmp/Makefile.fixed << 'EOL'
# ============================================================================
# Makefile Principal - JobbingTrack
# ============================================================================
# Ce Makefile orchestre tous les sous-Makefiles du projet
# ============================================================================

# Inclure les fonctions et variables communes
include makefiles/shared/common.mk

# ============================================================================
# CONFIGURATION
# ============================================================================

# Variables de configuration
BACKEND_DIR = backend
FRONTEND_DIR = frontend
SCRIPTS_DIR = scripts
TESTS_DIR = tests

# ... (le reste du Makefile reste inchangé jusqu'à la ligne 168) ...

	@echo "🔍 Pour voir les logs : make logs"
	@echo "🔍 Pour vérifier l'état : make status"
	@if docker ps -a --format "{{.Names}}" | grep -qE "^jobbingtrack-frontend$$|^jobbingtrack-api-gateway$$"; then \
		echo " Conflit de nom détecté, nettoyage forcé puis relance..."; \
		make clean-force; \
		docker-compose -f docker-compose.yml -f docker-compose.metrics.yml up -d --remove-orphans || true; \
	fi

# ... (le reste du Makefile reste inchangé) ...
EOL

# Remplacer le Makefile existant par la version corrigée
sudo cp /tmp/Makefile.fixed /home/pactivisme/Documents/Dev/Perso/JobbingTrack/Makefile

# Rendre le script exécutable
chmod +x /home/pactivisme/Documents/Dev/Perso/JobbingTrack/Makefile

echo "✅ Makefile corrigé avec succès !"
echo "Vous pouvez maintenant exécuter 'make up-full' à nouveau."
