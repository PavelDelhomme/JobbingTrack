# Frontend Makefile pour JobbingTrack Dashboard
.PHONY: help init dev build up down logs clean install test lint format shell health

# Variables
COMPOSE_FILE = docker-compose.frontend.yml
SERVICE_NAME = jobbingtrack-frontend

# Couleurs
GREEN := \033[0;32m
BLUE := \033[0;34m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m # No Color

help:
	@echo "$(BLUE)🎨 JobbingTrack Frontend Dashboard$(NC)"
	@echo ""
	@echo "  $(GREEN)init$(NC)        - Initialiser Next.js (première fois)"
	@echo "  $(GREEN)install$(NC)     - Installer dépendances"
	@echo "  $(GREEN)dev$(NC)         - Mode développement avec hot reload"
	@echo "  $(GREEN)build$(NC)       - Construire image Docker"
	@echo "  $(GREEN)up$(NC)          - Démarrer service frontend"
	@echo "  $(GREEN)down$(NC)        - Arrêter service"
	@echo "  $(GREEN)logs$(NC)        - Logs temps réel"
	@echo "  $(GREEN)shell$(NC)       - Shell du conteneur"
	@echo "  $(GREEN)health$(NC)      - Test santé frontend"
	@echo "  $(GREEN)clean$(NC)       - Nettoyer conteneurs"
	@echo "  $(GREEN)rebuild$(NC)     - Reconstruction complète"
	@echo ""

# Initialiser Next.js si pas encore fait
init:
	@echo "$(YELLOW)🚀 Initialisation Next.js...$(NC)"
	@if [ ! -d "src" ] && [ ! -d "app" ] && [ ! -d "pages" ]; then \
		echo "$(YELLOW)📦 Création structure Next.js...$(NC)"; \
		docker compose -f $(COMPOSE_FILE) run --rm $(SERVICE_NAME) \
		npx create-next-app@latest . --typescript --tailwind --app --eslint --no-src-dir --import-alias "@/*" --use-npm; \
		echo "$(GREEN)✅ Next.js initialisé$(NC)"; \
	else \
		echo "$(GREEN)✅ Next.js déjà configuré$(NC)"; \
	fi

# Installation des dépendances
install:
	@echo "$(YELLOW)📦 Installation dépendances...$(NC)"
	docker compose -f $(COMPOSE_FILE) run --rm $(SERVICE_NAME) npm install
	@echo "$(GREEN)✅ Dépendances installées$(NC)"

# Mode développement
dev:
	@echo "$(YELLOW)🔥 Démarrage développement...$(NC)"
	docker compose -f $(COMPOSE_FILE) up --build
	@echo "$(GREEN)✅ Frontend: http://localhost:8080$(NC)"

# Build image
build:
	@echo "$(YELLOW)🏗️ Construction image...$(NC)"
	docker compose -f $(COMPOSE_FILE) build --no-cache
	@echo "$(GREEN)✅ Image construite$(NC)"

# Démarrer service
up:
	@echo "$(YELLOW)🚀 Démarrage service...$(NC)"
	docker compose -f $(COMPOSE_FILE) up -d
	@echo "$(GREEN)✅ Frontend: http://localhost:8080$(NC)"

# Arrêter service
down:
	@echo "$(YELLOW)🛑 Arrêt service...$(NC)"
	docker compose -f $(COMPOSE_FILE) down
	@echo "$(GREEN)✅ Service arrêté$(NC)"

# Logs
logs:
	@echo "$(BLUE)📋 Logs frontend...$(NC)"
	docker compose -f $(COMPOSE_FILE) logs -f

# Shell
shell:
	@echo "$(BLUE)🐚 Shell conteneur...$(NC)"
	docker compose -f $(COMPOSE_FILE) exec $(SERVICE_NAME) sh

# Test santé
health:
	@echo "$(BLUE)🏥 Test santé frontend...$(NC)"
	@curl -f http://localhost:8080 && echo "$(GREEN)✅ Frontend OK$(NC)" || echo "$(RED)❌ Frontend inaccessible$(NC)"

# Tests
test:
	@echo "$(YELLOW)🧪 Tests frontend...$(NC)"
	docker compose -f $(COMPOSE_FILE) run --rm $(SERVICE_NAME) npm test

# Lint
lint:
	@echo "$(YELLOW)🔍 Vérification code...$(NC)"
	docker compose -f $(COMPOSE_FILE) run --rm $(SERVICE_NAME) npm run lint

# Format
format:
	@echo "$(YELLOW)✨ Formatage code...$(NC)"
	docker compose -f $(COMPOSE_FILE) run --rm $(SERVICE_NAME) npm run format

# Nettoyer
clean:
	@echo "$(YELLOW)🧹 Nettoyage...$(NC)"
	docker compose -f $(COMPOSE_FILE) down -v
	docker system prune -f
	@echo "$(GREEN)✅ Nettoyage terminé$(NC)"

# Rebuild complet
rebuild:
	@echo "$(YELLOW)🔄 Reconstruction complète...$(NC)"
	$(MAKE) down
	$(MAKE) build
	$(MAKE) up
	@echo "$(GREEN)✅ Reconstruction terminée$(NC)"