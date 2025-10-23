# ============================================================================
# Makefile Frontend - JobbingTrack
# ============================================================================
# Ce Makefile gère le frontend Next.js avec Docker
# ============================================================================

# Inclure les fonctions et variables communes
include ../shared/common.mk

# ============================================================================
# CONFIGURATION
# ============================================================================

FRONTEND_DIR = .
DOCKER_COMPOSE_FILE = docker-compose.frontend.yml
DOCKER_COMPOSE_PROD_FILE = docker-compose.prod.yml
DOCKER_COMPOSE_TEST_FILE = docker-compose.test.yml

# Variables par défaut
NODE_ENV ?= development
PORT ?= 8080

.PHONY: help install-deps build dev prod test clean clean-deps clean-build clean-all up down logs status health build-dev build-prod build-test lint type-check test-unit test-e2e test-all

# ============================================================================
# AIDE
# ============================================================================

help: ## Afficher l'aide complète pour le frontend
	$(call print_section,🖥️ FRONTEND - JOBBINGTRACK (Next.js))
	@echo ""
	@echo "$(BOLD)$(CYAN)🚀 DÉMARRAGE RAPIDE:$(NC)"
	@echo "  $(GREEN)make install-deps$(NC)     - Installer les dépendances npm"
	@echo "  $(GREEN)make dev$(NC)             - Démarrer en mode développement"
	@echo "  $(GREEN)make build$(NC)           - Construire pour production"
	@echo "  $(GREEN)make prod$(NC)            - Démarrer en production"
	@echo ""
	@echo "$(BOLD)$(CYAN)🔧 DÉVELOPPEMENT:$(NC)"
	@echo "  $(YELLOW)make clean$(NC)           - Nettoyer le cache et les builds"
	@echo "  $(YELLOW)make lint$(NC)            - Vérifier le code (ESLint)"
	@echo "  $(YELLOW)make type-check$(NC)      - Vérifier les types TypeScript"
	@echo "  $(YELLOW)make clean-deps$(NC)      - Nettoyer les node_modules"
	@echo ""
	@echo "$(BOLD)$(CYAN)🧪 TESTS:$(NC)"
	@echo "  $(PURPLE)make test-unit$(NC)       - Tests unitaires (Jest)"
	@echo "  $(PURPLE)make test-e2e$(NC)        - Tests end-to-end (Playwright)"
	@echo "  $(PURPLE)make test-all$(NC)        - Tous les tests"
	@echo ""
	@echo "$(BOLD)$(CYAN)🐳 DOCKER:$(NC)"
	@echo "  $(BLUE)make up$(NC)              - Démarrer avec Docker"
	@echo "  $(BLUE)make down$(NC)            - Arrêter Docker"
	@echo "  $(BLUE)make logs$(NC)            - Voir les logs Docker"
	@echo "  $(BLUE)make status$(NC)          - Statut des conteneurs"
	@echo "  $(BLUE)make build-dev$(NC)      - Construire image dev"
	@echo "  $(BLUE)make build-prod$(NC)     - Construire image prod"
	@echo ""
	@echo "$(BOLD)$(CYAN)📦 DÉPENDANCES:$(NC)"
	@echo "  $(CYAN)make install-deps$(NC)     - npm install (dépendances)"
	@echo "  $(CYAN)make clean-deps$(NC)      - Supprimer node_modules"
	@echo ""
	@echo "$(BOLD)$(CYAN)💡 EXEMPLES:$(NC)"
	@echo "  $(GREEN)make install-deps && make dev$(NC)"
	@echo "  $(BLUE)make build && make prod$(NC)"
	@echo "  $(PURPLE)make test-all$(NC)"

# ============================================================================
# INSTALLATION DES DÉPENDANCES
# ============================================================================

install-deps: ## Installer les dépendances npm
	$(call print_message,$(BLUE),📦 Installation des dépendances npm...)
	@npm install
	@echo "$(GREEN)✅ Dépendances installées$(NC)"

# ============================================================================
# DÉVELOPPEMENT
# ============================================================================

dev: ## Démarrer en mode développement (hot reload)
	$(call print_message,$(BLUE),🔧 Mode développement Next.js...)
	@npm run dev

build: ## Construire l'application pour production
	$(call print_message,$(BLUE),🔨 Construction de production...)
	@npm run build

prod: ## Démarrer en mode production
	$(call print_message,$(BLUE),🚀 Mode production Next.js...)
	@npm run start

# ============================================================================
# DOCKER
# ============================================================================

up: ## Démarrer avec Docker (mode développement)
	$(call print_message,$(BLUE),🐳 Démarrage Docker frontend...)
	@$(call docker_compose, -f $(DOCKER_COMPOSE_FILE) up -d
	@echo "$(GREEN)✅ Frontend démarré sur http://localhost:8080$(NC)"

down: ## Arrêter Docker
	$(call print_message,$(RED),🛑 Arrêt Docker frontend...)
	@$(call docker_compose, -f $(DOCKER_COMPOSE_FILE) down

logs: ## Voir les logs Docker
	$(call print_message,$(BLUE),📋 Logs Docker frontend...)
	@$(call docker_compose, -f $(DOCKER_COMPOSE_FILE) logs -f

status: ## Statut des conteneurs Docker
	$(call print_message,$(BLUE),📊 Statut Docker frontend...)
	@$(call docker_compose, -f $(DOCKER_COMPOSE_FILE) ps

health: ## Vérifier la santé du frontend
	$(call print_message,$(GREEN),💚 Vérification santé frontend...)
	@curl -s http://localhost:8080/api/health || echo "$(RED)❌ Frontend non accessible$(NC)"

build-dev: ## Construire l'image Docker de développement
	$(call print_message,$(BLUE),🔨 Construction image dev...)
	@$(call docker_compose, -f $(DOCKER_COMPOSE_FILE) build

build-prod: ## Construire l'image Docker de production
	$(call print_message,$(BLUE),🔨 Construction image prod...)
	@$(call docker_compose, -f $(DOCKER_COMPOSE_PROD_FILE) build

build-test: ## Construire l'image Docker de test
	$(call print_message,$(BLUE),🔨 Construction image test...)
	@$(call docker_compose, -f $(DOCKER_COMPOSE_TEST_FILE) build

# ============================================================================
# TESTS
# ============================================================================

test-unit: ## Tests unitaires avec Jest
	$(call print_message,$(PURPLE),🧪 Tests unitaires Jest...)
	@npm run test:unit

test-e2e: ## Tests end-to-end avec Playwright
	$(call print_message,$(PURPLE),🎭 Tests E2E Playwright...)
	@npm run test:e2e

test-all: ## Tous les tests
	$(call print_message,$(PURPLE),🧪 Tous les tests...)
	@npm run test:all

# ============================================================================
# QUALITÉ DU CODE
# ============================================================================

lint: ## Vérifier le code avec ESLint
	$(call print_message,$(YELLOW),🔍 Vérification ESLint...)
	@npm run lint

lint-fix: ## Corriger automatiquement les problèmes ESLint
	$(call print_message,$(YELLOW),🔧 Correction ESLint automatique...)
	@npm run lint:fix

type-check: ## Vérifier les types TypeScript
	$(call print_message,$(BLUE),🔍 Vérification TypeScript...)
	@npm run type-check

format: ## Formater le code avec Prettier
	$(call print_message,$(BLUE),💅 Formatage Prettier...)
	@npm run format

format-check: ## Vérifier le formatage Prettier
	$(call print_message,$(BLUE),🔍 Vérification formatage...)
	@npm run format:check

# ============================================================================
# NETTOYAGE
# ============================================================================

clean: ## Nettoyer le cache et les builds
	$(call print_message,$(YELLOW),🧹 Nettoyage du frontend...)
	@npm run clean
	@rm -rf .next
	@rm -rf node_modules/.cache
	@echo "$(GREEN)✅ Cache nettoyé$(NC)"

clean-deps: ## Supprimer les node_modules
	$(call print_message,$(YELLOW),🗑️ Suppression node_modules...)
	@rm -rf node_modules
	@rm -f package-lock.json
	@echo "$(GREEN)✅ node_modules supprimé$(NC)"

clean-build: ## Nettoyer les builds
	$(call print_message,$(YELLOW),🗑️ Suppression des builds...)
	@rm -rf .next
	@rm -rf out
	@echo "$(GREEN)✅ Builds supprimés$(NC)"

clean-all: clean-deps clean-build ## Nettoyer complètement
	$(call print_message,$(RED),🧹 Nettoyage complet...)
	@docker system prune -f --volumes
	@echo "$(GREEN)✅ Nettoyage terminé$(NC)"

# ============================================================================
# MAINTENANCE
# ============================================================================

refresh-deps: clean-deps install-deps ## Actualiser les dépendances
	$(call print_message,$(BLUE),🔄 Actualisation des dépendances...)
	@echo "$(GREEN)✅ Dépendances actualisées$(NC)"

rebuild: clean build ## Rebuild complet
	$(call print_message,$(BLUE),🔨 Rebuild complet...)
	@echo "$(GREEN)✅ Rebuild terminé$(NC)"

# ============================================================================
# DIAGNOSTIC
# ============================================================================

check: ## Diagnostic du frontend
	$(call print_message,$(BLUE),🔍 Diagnostic frontend...)

	@echo "$(YELLOW)📦 Vérification des dépendances:$(NC)"
	@if [ -d "node_modules" ]; then \
		echo "   $(GREEN)✅ node_modules présent$(NC)"; \
	else \
		echo "   $(RED)❌ node_modules manquant$(NC)"; \
	fi

	@if [ -f "package-lock.json" ]; then \
		echo "   $(GREEN)✅ package-lock.json présent$(NC)"; \
	else \
		echo "   $(YELLOW)⚠️ package-lock.json manquant$(NC)"; \
	fi

	@echo "$(YELLOW)🔨 Vérification des builds:$(NC)"
	@if [ -d ".next" ]; then \
		echo "   $(GREEN)✅ Build .next présent$(NC)"; \
	else \
		echo "   $(YELLOW)⚠️ Pas de build .next$(NC)"; \
	fi

	@echo "$(YELLOW)🐳 Vérification Docker:$(NC)"
	@$(call docker_compose, -f $(DOCKER_COMPOSE_FILE) ps --format "table {{.Service}}\t{{.Status}}" 2>/dev/null | grep -v "NAME\|---" || echo "   Aucun conteneur Docker"

	@echo "$(GREEN)✅ Diagnostic terminé$(NC)"

# ============================================================================
# WORKFLOW RECOMMANDÉ
# ============================================================================

setup: install-deps ## Configuration initiale
	$(call print_message,$(GREEN),✅ Configuration frontend terminée$(NC)

workflow: install-deps type-check lint test-unit ## Workflow de développement complet
	$(call print_message,$(GREEN),✅ Workflow de développement terminé$(NC))

# ============================================================================
# VARIABLES D'ENVIRONNEMENT
# ============================================================================

.env: ## Créer le fichier .env (copie depuis .env.example si disponible)
	@if [ -f ".env.example" ]; then \
		cp .env.example .env; \
		echo "$(GREEN)✅ .env créé depuis .env.example$(NC)"; \
	else \
		echo "$(YELLOW)⚠️ .env.example non trouvé$(NC)"; \
	fi
