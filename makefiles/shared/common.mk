# ============================================================================
# Common Makefile Variables and Functions - JobbingTrack
# ============================================================================

# Couleurs ANSI pour les messages
GREEN := \033[0;32m
RED := \033[0;31m
YELLOW := \033[1;33m
BLUE := \033[0;34m
PURPLE := \033[0;35m
CYAN := \033[0;36m
BOLD := \033[1m
NC := \033[0m

# Emojis pour les messages
EMOJI_SUCCESS := ✅
EMOJI_ERROR := ❌
EMOJI_WARNING := ⚠️
EMOJI_INFO := ℹ️
EMOJI_BUILD := 🔨
EMOJI_RUN := 🚀
EMOJI_STOP := 🛑
EMOJI_TEST := 🧪
EMOJI_CLEAN := 🧹

# Fonction pour afficher des messages (simplifiée pour compatibilité)
define print_message
	@echo "$(2)"
endef

# Fonction pour afficher des sections (simplifiée pour compatibilité)
define print_section
	@echo ""
	@echo "═══════════════════════════════════════════════════"
	@echo "$(1)"
	@echo "═══════════════════════════════════════════════════"
endef

# Fonction pour vérifier si une commande existe
define check_command
	@if ! command -v $(1) &> /dev/null; then \
		echo "❌ $(1) n'est pas installé"; \
		exit 1; \
	fi
endef

# Fonction pour vérifier et créer le réseau Docker si nécessaire
define ensure_docker_network
	@if ! docker network inspect backend_jobbingtrack-network &> /dev/null; then \
		echo "🌐 Création du réseau Docker 'backend_jobbingtrack-network'..."; \
		if ! docker network create backend_jobbingtrack-network &> /dev/null; then \
			echo "❌ Erreur lors de la création du réseau Docker"; \
			exit 1; \
		else \
			echo "✅ Réseau Docker créé avec succès"; \
		fi; \
	else \
		echo "🌐 Le réseau Docker 'backend_jobbingtrack-network' existe déjà"; \
	fi
endef

# Fonction pour attendre que PostgreSQL soit prêt
define wait_for_postgres
	@echo "⏳ Attente de PostgreSQL..."; \
	MAX_ATTEMPTS=30; \
	ATTEMPT=0; \
	while [ $$ATTEMPT -lt $$MAX_ATTEMPTS ]; do \
		POSTGRES_CONTAINER=$$(docker ps -q -f name=jobbingtrack-postgres 2>/dev/null | head -1); \
		if [ -n "$$POSTGRES_CONTAINER" ] && docker exec $$POSTGRES_CONTAINER pg_isready -U jobbingtrack -d jobbingtrack >/dev/null 2>&1; then \
			echo "✅ PostgreSQL est accessible"; \
			break; \
		fi; \
		echo "⏳ PostgreSQL n'est pas encore prêt, tentative $$(($$ATTEMPT + 1))/$$MAX_ATTEMPTS..."; \
		sleep 3; \
		ATTEMPT=$$(($$ATTEMPT + 1)); \
	done; \
	if [ $$ATTEMPT -eq $$MAX_ATTEMPTS ]; then \
		echo "❌ PostgreSQL n'est pas accessible après $$MAX_ATTEMPTS tentatives"; \
		echo "🔍 Vérification du statut du conteneur:"; \
		docker ps -f name=jobbingtrack-postgres --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null || echo "  Aucun conteneur PostgreSQL trouvé"; \
		echo "🔍 Logs récents:"; \
		docker logs --tail 10 jobbingtrack-postgres 2>/dev/null || echo "  Impossible de récupérer les logs"; \
		exit 1; \
	fi
endef

# Variables communes de projet
PROJECT_NAME := JobbingTrack
PROJECT_VERSION := 1.0.1

# Répertoires principaux
ROOT_DIR := $(shell pwd)
BACKEND_DIR := backend
FRONTEND_DIR := frontend
TESTS_DIR := tests
SCRIPTS_DIR := scripts
MAKEFILES_DIR := makefiles

# Configuration Docker
DOCKER_COMPOSE_ROOT := docker-compose.yml
DOCKER_COMPOSE_BACKEND := $(BACKEND_DIR)/docker-compose.yml
DOCKER_COMPOSE_FRONTEND := $(FRONTEND_DIR)/docker-compose.frontend.yml
DOCKER_COMPOSE_TESTS := $(TESTS_DIR)/docker-compose.test.yml

# Services backend principaux
BACKEND_SERVICES := api-gateway auth-service application-service company-service contact-service interview-service notification-service dashboard-service call-service profile-service event-service followup-service

# Variables de couleur pour compatibilité avec les anciens scripts
MAKE_GREEN := $(GREEN)
MAKE_RED := $(RED)
MAKE_YELLOW := $(YELLOW)
MAKE_BLUE := $(BLUE)
MAKE_PURPLE := $(PURPLE)
MAKE_CYAN := $(CYAN)
MAKE_NC := $(NC)

# ============================================================================
# SYSTÈME DE WARNING HELP
# ============================================================================

# Fonction pour vérifier si l'utilisateur a lu le help
define check_help_read
	@if [ -z "$$JOBBINGTRACK_HELP_READ" ] && [ -z "$$CI" ] && [ -z "$$TEST_NOPROMPT" ] && [ -t 0 ]; then \
		echo ""; \
		echo "╔════════════════════════════════════════════════════════╗"; \
		echo "║  ⚠️  PREMIÈRE UTILISATION ? LISEZ L'AIDE D'ABORD !     ║"; \
		echo "╚════════════════════════════════════════════════════════╝"; \
		echo ""; \
		echo "💡 Pour découvrir toutes les commandes disponibles :"; \
		echo "   make help                    → Vue d'ensemble"; \
		echo "   make tests-help              → Guide complet des tests"; \
		echo "   make help-$(1)               → Aide détaillée pour cette commande"; \
		echo ""; \
		echo "🔕 Pour désactiver ce message :"; \
		echo "   make disable-help  → Désactiver (temporaire ou définitif)"; \
		echo ""; \
		echo "🔔 Pour réactiver ce message :"; \
		echo "   make enable-help   → Réactiver le message d'aide"; \
		echo ""; \
		echo "📊 Pour voir le statut :"; \
		echo "   make help-status-help  → Afficher le statut actuel"; \
		echo ""; \
		echo "⏱️  Démarrage dans 3 secondes..."; \
		echo ""; \
		sleep 3; \
	fi
endef

# ============================================================================
# Fonctions d'aide pour les Makefiles
# ============================================================================

# Affiche l'aide d'un Makefile
define show_help
	@echo "📚 Aide - $(PROJECT_NAME)"
	@echo "================================================================"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "%-25s - %s\n", $$1, $$2}'
endef

# ============================================================================
# DÉTECTION AUTOMATIQUE DOCKER COMPOSE
# ============================================================================

# ============================================================================
# DÉTECTION ROBUSTE DOCKER COMPOSE
# ============================================================================

# Cache de la commande Docker Compose détectée
DOCKER_COMPOSE_CACHE_FILE := /tmp/jobbingtrack_docker_compose_cache

# Détecte la commande Docker Compose qui fonctionne réellement (version robuste)
DOCKER_COMPOSE_CMD := $(shell \
	if command -v docker-compose &>/dev/null 2>&1 && timeout 10 docker-compose version &>/dev/null 2>&1; then \
		echo "docker-compose" > $(DOCKER_COMPOSE_CACHE_FILE); \
		echo "docker-compose"; \
	elif timeout 10 docker compose version &>/dev/null 2>&1; then \
		echo "docker compose" > $(DOCKER_COMPOSE_CACHE_FILE); \
		echo "docker compose"; \
	elif [ -x "/usr/bin/docker-compose" ] && timeout 10 /usr/bin/docker-compose version &>/dev/null 2>&1; then \
		echo "/usr/bin/docker-compose" > $(DOCKER_COMPOSE_CACHE_FILE); \
		echo "/usr/bin/docker-compose"; \
	elif [ -x "/usr/local/bin/docker-compose" ] && timeout 10 /usr/local/bin/docker-compose version &>/dev/null 2>&1; then \
		echo "/usr/local/bin/docker-compose" > $(DOCKER_COMPOSE_CACHE_FILE); \
		echo "/usr/local/bin/docker-compose"; \
	elif [ -x "/opt/bin/docker-compose" ] && timeout 10 /opt/bin/docker-compose version &>/dev/null 2>&1; then \
		echo "/opt/bin/docker-compose" > $(DOCKER_COMPOSE_CACHE_FILE); \
		echo "/opt/bin/docker-compose"; \
	elif [ -x "/snap/bin/docker-compose" ] && timeout 10 /snap/bin/docker-compose version &>/dev/null 2>&1; then \
		echo "/snap/bin/docker-compose" > $(DOCKER_COMPOSE_CACHE_FILE); \
		echo "/snap/bin/docker-compose"; \
	else \
		echo "docker-compose" > $(DOCKER_COMPOSE_CACHE_FILE); \
		echo "docker-compose"; \
	fi \
)

# Fonction pour proposer l'installation de Docker Compose
define install_docker_compose
	@echo "❌ Docker Compose n'est pas disponible"
	@echo ""
	@echo "💡 Installation recommandée :"
	@echo ""
	@echo "📦 Option 1 - Installation standalone :"
	@echo "   sudo curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$$(uname -s)-\$$(uname -m)\" -o /usr/local/bin/docker-compose"
	@echo "   sudo chmod +x /usr/local/bin/docker-compose"
	@echo ""
	@echo "📦 Option 2 - Installation via package manager :"
	@echo "   # Ubuntu/Debian:"
	@echo "   sudo apt-get update"
	@echo "   sudo apt-get install docker-compose-plugin"
	@echo ""
	@echo "   # CentOS/RHEL/Fedora:"
	@echo "   sudo dnf install docker-compose"
	@echo ""
	@echo "📦 Option 3 - Utiliser Docker Desktop (recommandé):"
	@echo "   https://docs.docker.com/desktop/"
	@echo ""
	@echo "🔄 Après installation, relancez la commande"
	@exit 1
endef

# Variables de fichiers Docker Compose
COMPOSE_FILES := -f docker-compose.yml -f backend/docker-compose.yml -f frontend/docker-compose.frontend.yml

# Fichiers pour les services essentiels (sans backend services conflictuels)
COMPOSE_FILES_ESSENTIAL := -f docker-compose.yml

# Fichiers pour tous les services (sans backend/docker-compose.yml qui peut redéfinir les contextes)
COMPOSE_FILES_FULL := -f docker-compose.yml -f docker-compose.monitoring.yml

# Afficher la commande Docker Compose détectée
DOCKER_COMPOSE_INFO := $(shell echo "🐳 Commande Docker Compose: $(DOCKER_COMPOSE_CMD)")

# ============================================================================
# FONCTIONS DE PORTABILITÉ SYSTÈME
# ============================================================================

# Fonction portable pour vérifier si un port est occupé
define check_port_occupied
	@if command -v ss &>/dev/null 2>&1; then \
		ss -tuln | grep -q ":$(1) "; \
	elif command -v netstat &>/dev/null 2>&1; then \
		netstat -tuln 2>/dev/null | grep -q ":$(1) "; \
	else \
		echo "⚠️ Impossible de vérifier les ports (ss/netstat non disponibles)"; \
		exit 1; \
	fi
endef

# Fonction portable pour obtenir le PID utilisant un port
define get_port_pid
	@if command -v ss &>/dev/null 2>&1; then \
		ss -tuln | grep ":$(1) " | head -1 | awk '{print $$7}' | cut -d',' -f2 | cut -d'=' -f2; \
	elif command -v netstat &>/dev/null 2>&1; then \
		netstat -tuln 2>/dev/null | grep ":$(1) " | head -1 | awk '{print $$7}' | cut -d'/' -f1; \
	else \
		echo ""; \
	fi
endef

# ============================================================================
# WRAPPER POUR COMMANDES DOCKER COMPOSE
# ============================================================================

# Fonction wrapper simple pour Docker Compose
define docker_compose
	@if echo "$(DOCKER_COMPOSE_CMD)" | grep -q "docker compose"; then \
		docker compose --ansi never $(1); \
	elif echo "$(DOCKER_COMPOSE_CMD)" | grep -q "docker-compose"; then \
		docker-compose --ansi never $(1); \
	else \
		$(DOCKER_COMPOSE_CMD) --ansi never $(1); \
	fi
endef

# Fonction wrapper pour Docker Compose avec variables d'environnement
define docker_compose_env
	@if echo "$(DOCKER_COMPOSE_CMD)" | grep -q "docker compose"; then \
		$(1) docker compose --ansi never $(2); \
	elif echo "$(DOCKER_COMPOSE_CMD)" | grep -q "docker-compose"; then \
		$(1) docker-compose --ansi never $(2); \
	else \
		$(1) $(DOCKER_COMPOSE_CMD) --ansi never $(2); \
	fi
endef

# Nettoie le cache Docker Compose (force redétection)
define clean_docker_compose_cache
	@rm -f $(DOCKER_COMPOSE_CACHE_FILE) 2>/dev/null || true
	@echo "🧹 Cache Docker Compose nettoyé - redétection au prochain appel"
endef

# ============================================================================
# FONCTIONS DE VÉRIFICATION
# ============================================================================

# Vérification complète de Docker (inspirée de diagnostic.sh qui fonctionne)
define check_docker
	@echo "🐳 Vérification de Docker..."
	@if ! command -v docker &>/dev/null 2>&1; then \
		echo "❌ Docker n'est pas installé ou pas dans le PATH"; \
		echo ""; \
		if [ -f "$(ROOT_DIR)/scripts/setup/install-docker.sh" ]; then \
			echo "💡 Installation automatique disponible !"; \
			echo ""; \
			echo "🚀 Voulez-vous installer Docker automatiquement ? (O/n)"; \
			echo "   Le script va installer Docker et Docker Compose"; \
			echo ""; \
			echo "   Pour installer maintenant, exécutez:"; \
			echo "   ./scripts/setup/install-docker.sh"; \
			echo ""; \
			echo "   Ou relancez 'make up-full' après installation"; \
		else \
			echo "💡 Installation Docker:"; \
			echo "   # Ubuntu/Debian:"; \
			echo "   curl -fsSL https://get.docker.com | sudo sh"; \
			echo ""; \
			echo "   # CentOS/RHEL:"; \
			echo "   sudo dnf install docker docker-compose"; \
			echo ""; \
			echo "   # Manjaro/Arch:"; \
			echo "   sudo pacman -S docker docker-compose"; \
			echo ""; \
			echo "   # Ou Docker Desktop: https://docs.docker.com/desktop/"; \
			echo ""; \
			echo "🔄 Après installation:"; \
			echo "   sudo systemctl start docker"; \
			echo "   sudo usermod -aG docker \$$USER"; \
			echo "   newgrp docker"; \
		fi; \
		exit 1; \
	fi
	@echo "✅ Docker trouvé: $$(docker --version)"
	@if ! docker info &>/dev/null 2>&1; then \
		echo "❌ Docker daemon n'est pas en cours d'exécution"; \
		echo ""; \
		echo "💡 Démarrage Docker:"; \
		echo "   sudo systemctl start docker          # Linux"; \
		echo "   sudo service docker start            # Linux alternative"; \
		echo "   # Docker Desktop: Démarrer l'application"; \
		echo ""; \
		echo "🔄 Si permission refusée:"; \
		echo "   sudo usermod -aG docker \$USER"; \
		echo "   # Puis redémarrer la session ou:"; \
		echo "   newgrp docker"; \
		exit 1; \
	fi
	@echo "✅ Docker daemon fonctionne"
	@if ! docker ps &>/dev/null 2>&1; then \
		echo "⚠️ Docker fonctionne mais permission refusée pour docker ps"; \
		echo ""; \
		echo "💡 Solution permissions:"; \
		echo "   sudo usermod -aG docker \$USER"; \
		echo "   # Redémarrer la session ou:"; \
		echo "   newgrp docker"; \
		echo ""; \
		echo "🔄 Ou exécuter avec sudo:"; \
		echo "   sudo make up"; \
		exit 1; \
	fi
	@echo "✅ Docker permissions OK"
endef

# Vérification des dépendances système
define check_dependencies
	@echo "🔍 Vérification des dépendances..."
	@echo "🐳 Vérification de Docker..."
	@if ! command -v docker &>/dev/null 2>&1; then \
		echo "❌ Docker n'est pas installé ou pas dans le PATH"; \
		echo "💡 Installez Docker: https://docs.docker.com/get-docker/"; \
		exit 1; \
	fi
	@echo "✅ Docker trouvé: $$(docker --version)"
	@echo "🐳 Vérification de Docker Compose..."
	@if command -v docker-compose &>/dev/null 2>&1 && docker-compose version &>/dev/null 2>&1; then \
		echo "✅ docker-compose standalone: $$(docker-compose --version)"; \
	elif docker compose version &>/dev/null 2>&1; then \
		echo "✅ docker compose plugin: $$(docker compose version)"; \
	elif [ -x "/usr/bin/docker-compose" ] && /usr/bin/docker-compose version &>/dev/null 2>&1; then \
		echo "✅ docker-compose dans /usr/bin: $$(/usr/bin/docker-compose --version)"; \
	elif [ -x "/usr/local/bin/docker-compose" ] && /usr/local/bin/docker-compose version &>/dev/null 2>&1; then \
		echo "✅ docker-compose dans /usr/local/bin: $$(/usr/local/bin/docker-compose --version)"; \
	else \
		$(call install_docker_compose); \
	fi
	@echo "✅ Toutes les dépendances sont installées"
endef

# Vérifie et nettoie les services existants qui peuvent causer des conflits
define check_and_clean_existing_services
	@# Vérifier les conteneurs existants uniquement (les ports sont gérés par Docker)
	@EXISTING_CONTAINERS=$$(docker ps | grep -c "jobbingtrack" || echo "0"); \
	if [ "$$EXISTING_CONTAINERS" -gt 0 ]; then \
		echo "⚠️ $$EXISTING_CONTAINERS service(s) JobbingTrack déjà démarré(s)"; \
		echo "💡 Utilisez 'make down' pour arrêter d'abord"; \
		exit 1; \
	fi
endef

# Vérifie et libère les ports occupés par d'autres processus
define check_and_free_ports
	@echo "🔍 Vérification des ports requis..."
	@PORTS_NEEDED="3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3011 3014 8080 8081 5432 6379 9090"; \
	for port in $$PORTS_NEEDED; do \
		if command -v ss >/dev/null 2>&1; then \
			PID=$$(ss -tlnp 2>/dev/null | grep ":$$port " | head -1 | awk '{print $$7}' | cut -d',' -f2 | cut -d'=' -f2 || echo ""); \
		elif command -v netstat >/dev/null 2>&1; then \
			PID=$$(netstat -tlnp 2>/dev/null | grep ":$$port " | head -1 | awk '{print $$7}' | cut -d'/' -f1 || echo ""); \
		else \
			PID=""; \
		fi; \
		if [ -n "$$PID" ] && [ "$$PID" != "-" ]; then \
			echo "⚠️ Port $$port occupé par le processus $$PID - tentative d'arrêt..."; \
			if command -v pkill >/dev/null 2>&1; then \
				if echo "$$PID" | grep -q "next-server\|node\|npm\|yarn"; then \
					pkill -f "next-server\|node.*$$port\|npm.*$$port\|yarn.*$$port" || echo "⚠️ Impossible d'arrêter automatiquement le processus $$PID"; \
				else \
					kill -TERM $$PID 2>/dev/null || kill -KILL $$PID 2>/dev/null || echo "⚠️ Impossible d'arrêter le processus $$PID"; \
				fi; \
				sleep 2; \
			fi; \
		fi; \
	done; \
	echo "✅ Vérification des ports terminée"
endef
