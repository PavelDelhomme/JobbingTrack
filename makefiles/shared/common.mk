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

# Fonction pour afficher des messages colorés
define print_message
	@echo "$(1)$(2)$(NC)"
endef

# Fonction pour afficher des sections
define print_section
	@echo ""
	@echo "$(BOLD)$(CYAN)═══════════════════════════════════════════════════$(NC)"
	@echo "$(BOLD)$(CYAN)$(1)$(NC)"
	@echo "$(BOLD)$(CYAN)═══════════════════════════════════════════════════$(NC)"
endef

# Fonction pour vérifier si une commande existe
define check_command
	@if ! command -v $(1) &> /dev/null; then \
		$(call print_message,$(RED),$(EMOJI_ERROR) $(1) n'est pas installé); \
		exit 1; \
	fi
endef

# Fonction pour attendre que PostgreSQL soit prêt
define wait_for_postgres
	@echo "$(BLUE)⏳ Attente de PostgreSQL...$(NC)"; \
	MAX_ATTEMPTS=60; \
	ATTEMPT=0; \
	while [ $$ATTEMPT -lt $$MAX_ATTEMPTS ]; do \
		if docker compose exec postgres psql -U jobbingtrack -d jobbingtrack -c "SELECT 1" > /dev/null 2>&1; then \
			echo "$(GREEN)$(EMOJI_SUCCESS) PostgreSQL est accessible$(NC)"; \
			break; \
		fi; \
		echo "$(YELLOW)⏳ PostgreSQL n'est pas encore prêt, tentative $$(($$ATTEMPT + 1))/$$MAX_ATTEMPTS...$(NC)"; \
		sleep 2; \
		ATTEMPT=$$(($$ATTEMPT + 1)); \
	done; \
	if [ $$ATTEMPT -eq $$MAX_ATTEMPTS ]; then \
		echo "$(RED)$(EMOJI_ERROR) PostgreSQL n'est pas accessible après $$MAX_ATTEMPTS tentatives$(NC)"; \
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
	@echo "$(BOLD)$(BLUE)📚 Aide - $(PROJECT_NAME)$(NC)"
	@echo "$(CYAN)================================$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(NC) - %s\n", $$1, $$2}'
endef

# Vérifie les dépendances système
define check_dependencies
	@echo "$(BLUE)🔍 Vérification des dépendances...$(NC)"
	@$(call check_command,docker)
	@$(call check_command,docker-compose)
	@echo "$(GREEN)$(EMOJI_SUCCESS) Toutes les dépendances sont installées$(NC)"
endef
