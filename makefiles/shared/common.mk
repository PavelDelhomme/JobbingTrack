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

# Détecte automatiquement la commande Docker Compose disponible
DOCKER_COMPOSE_CMD := $(shell \
	if command -v docker-compose &> /dev/null; then \
		echo "docker-compose"; \
	elif docker compose version &> /dev/null 2>&1; then \
		echo "docker compose"; \
	else \
		echo "docker-compose"; \
	fi)

# Variables de fichiers Docker Compose
COMPOSE_FILES := -f docker-compose.yml -f backend/docker-compose.yml -f frontend/docker-compose.frontend.yml -f tests/docker-compose.test.yml

# ============================================================================
# FONCTIONS DE PORTABILITÉ SYSTÈME
# ============================================================================

# Fonction portable pour vérifier si un port est occupé
define check_port_occupied
	@if command -v ss &> /dev/null; then \
		ss -tuln | grep -q ":$(1) "; \
	elif command -v netstat &> /dev/null; then \
		netstat -tuln 2>/dev/null | grep -q ":$(1) "; \
	else \
		echo "⚠️ Impossible de vérifier les ports (ss/netstat non disponibles)"; \
		exit 1; \
	fi
endef

# Fonction portable pour obtenir le PID utilisant un port
define get_port_pid
	@if command -v ss &> /dev/null; then \
		ss -tuln | grep ":$(1) " | head -1 | awk '{print $$7}' | cut -d',' -f2 | cut -d'=' -f2; \
	elif command -v netstat &> /dev/null; then \
		netstat -tuln 2>/dev/null | grep ":$(1) " | head -1 | awk '{print $$7}' | cut -d'/' -f1; \
	else \
		echo ""; \
	fi
endef

# ============================================================================
# WRAPPER POUR COMMANDES DOCKER COMPOSE
# ============================================================================

# Fonction wrapper pour docker-compose avec détection automatique
define docker_compose
	@if [ "$(DOCKER_COMPOSE_CMD)" = "docker-compose" ]; then \
		docker-compose $(1); \
	else \
		docker compose $(1); \
	fi
endef

# ============================================================================
# FONCTIONS DE VÉRIFICATION
# ============================================================================

# Vérification rapide de Docker
define check_docker
	@if ! command -v docker &> /dev/null; then \
		echo "❌ Docker n'est pas installé"; \
		echo "💡 Installez Docker: https://docs.docker.com/get-docker/"; \
		exit 1; \
	fi
	@if ! docker info &> /dev/null; then \
		echo "❌ Docker daemon n'est pas en cours d'exécution"; \
		echo "💡 Démarrer Docker: sudo systemctl start docker (Linux) ou démarrer Docker Desktop (Windows/Mac)"; \
		exit 1; \
	fi
endef

# Vérification des dépendances système
define check_dependencies
	@echo "🔍 Vérification des dépendances..."
	@echo "🐳 Vérification de Docker..."
	@if ! command -v docker &> /dev/null; then \
		echo "❌ Docker n'est pas installé ou pas dans le PATH"; \
		echo "💡 Installez Docker: https://docs.docker.com/get-docker/"; \
		exit 1; \
	fi
	@echo "✅ Docker trouvé: $$(docker --version)"
	@echo "🐳 Vérification de Docker Compose..."
	@if command -v docker-compose &> /dev/null; then \
		echo "✅ docker-compose trouvé: $$(docker-compose --version)"; \
	elif docker compose version &> /dev/null; then \
		echo "✅ docker compose trouvé: $$(docker compose version)"; \
	else \
		echo "❌ Docker Compose n'est pas disponible"; \
		echo "💡 Installez Docker Compose ou utilisez 'docker compose' (Docker v2+)"; \
		exit 1; \
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
