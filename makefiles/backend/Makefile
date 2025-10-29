# ============================================================================
# Makefile Backend - JobbingTrack
# ============================================================================
# Ce Makefile gère tous les services backend avec Docker
# ============================================================================

# Inclure les fonctions et variables communes
include ../shared/common.mk

# ============================================================================
# CONFIGURATION
# ============================================================================

BACKEND_DIR = ../../backend
DOCKER_COMPOSE_FILE = $(BACKEND_DIR)/../docker-compose.yml
DOCKER_COMPOSE_METRICS = $(BACKEND_DIR)/../docker-compose.metrics.yml
MONITORING_COMPOSE = ../../monitoring/docker-compose.monitoring.yml

# Services backend
SERVICES_ESSENTIAL = postgres redis api-gateway auth-service dashboard-service
SERVICES_ALL = $(SERVICES_ESSENTIAL) application-service company-service contact-service interview-service notification-service call-service event-service followup-service profile-service workflow-service security-service deployment-service

.PHONY: help install build dev test clean up down logs status health db-migrate db-seed db-reset monitoring-up monitoring-down

# ============================================================================
# AIDE
# ============================================================================

help: ## Afficher l'aide complète pour le backend
	$(call print_section,⚙️ BACKEND - JOBBINGTRACK (Microservices))
	@echo ""
	@echo "$(BOLD)$(CYAN)🚀 DÉMARRAGE RAPIDE:$(NC)"
	@echo "  $(GREEN)make up$(NC)              - Démarrer services essentiels"
	@echo "  $(GREEN)make up-all$(NC)          - Démarrer TOUS les services"
	@echo "  $(GREEN)make down$(NC)            - Arrêter tous les services"
	@echo "  $(GREEN)make logs$(NC)            - Voir les logs en temps réel"
	@echo ""
	@echo "$(BOLD)$(CYAN)🔧 SERVICES INDIVIDUELS:$(NC)"
	@echo "  $(YELLOW)make start-auth$(NC)       - Démarrer service auth"
	@echo "  $(YELLOW)make start-apps$(NC)       - Démarrer service applications"
	@echo "  $(YELLOW)make start-service SERVICE=<nom>$(NC)"
	@echo "  $(YELLOW)make stop-service SERVICE=<nom>$(NC)"
	@echo "  $(YELLOW)make restart-service SERVICE=<nom>$(NC)"
	@echo ""
	@echo "$(BOLD)$(CYAN)🗄️ BASE DE DONNÉES:$(NC)"
	@echo "  $(BLUE)make db-migrate$(NC)       - Appliquer migrations"
	@echo "  $(BLUE)make db-seed$(NC)          - Insérer données de test"
	@echo "  $(BLUE)make db-reset$(NC)         - Reset complet DB"
	@echo "  $(BLUE)make db-backup$(NC)        - Sauvegarder la DB"
	@echo "  $(BLUE)make db-restore$(NC)       - Restaurer depuis backup"
	@echo ""
	@echo "$(BOLD)$(CYAN)📊 MONITORING:$(NC)"
	@echo "  $(PURPLE)make monitoring-up$(NC)    - Démarrer stack monitoring"
	@echo "  $(PURPLE)make monitoring-down$(NC)  - Arrêter monitoring"
	@echo "  $(PURPLE)make monitoring-logs$(NC)  - Logs monitoring"
	@echo "  $(PURPLE)make monitoring-test$(NC)  - Tester API metrics"
	@echo ""
	@echo "$(BOLD)$(CYAN)🔨 BUILD & CLEAN:$(NC)"
	@echo "  $(CYAN)make build$(NC)            - Build tous les services"
	@echo "  $(CYAN)make rebuild$(NC)          - Rebuild sans cache"
	@echo "  $(CYAN)make clean$(NC)            - Nettoyage complet"
	@echo "  $(CYAN)make clean-force$(NC)      - Nettoyage d'urgence"
	@echo ""
	@echo "$(BOLD)$(CYAN)🧪 TESTS:$(NC)"
	@echo "  $(PURPLE)make test$(NC)             - Tests backend"
	@echo "  $(PURPLE)make test-unit$(NC)        - Tests unitaires"
	@echo "  $(PURPLE)make test-integration$(NC) - Tests d'intégration"
	@echo ""
	@echo "$(BOLD)$(CYAN)💡 EXEMPLES:$(NC)"
	@echo "  $(GREEN)make up && make logs$(NC)"
	@echo "  $(BLUE)make start-service SERVICE=api-gateway$(NC)"
	@echo "  $(PURPLE)make monitoring-up$(NC)"

# ============================================================================
# DÉMARRAGE & ARRÊT
# ============================================================================

up: ## Démarrer services essentiels
	$(call print_message,$(BLUE),🚀 Démarrage services essentiels...)
	@cd $(BACKEND_DIR)/.. && docker-compose up -d $(SERVICES_ESSENTIAL)
	@echo "$(GREEN)✅ Services essentiels démarrés$(NC)"
	@echo ""
	@echo "$(CYAN)🌐 Interfaces disponibles:$(NC)"
	@echo "  Frontend:           http://localhost:8080"
	@echo "  API Gateway:        http://localhost:3000"
	@echo "  Auth Service:       http://localhost:3001"
	@echo "  Dashboard Service:  http://localhost:3007"

up-all: ## Démarrer TOUS les services backend + monitoring
	$(call print_message,$(BLUE),🚀 Démarrage COMPLET...)
	@cd $(BACKEND_DIR)/.. && docker-compose up -d $(SERVICES_ALL)
	@$(MAKE) monitoring-up
	@echo "$(GREEN)✅ Tous les services démarrés$(NC)"

down: ## Arrêter tous les services
	$(call print_message,$(RED),🛑 Arrêt de tous les services...)
	@cd $(BACKEND_DIR)/.. && docker-compose down --remove-orphans
	@docker ps -q --filter "name=jobbingtrack-*" | xargs -r docker stop || true
	@echo "$(GREEN)✅ Services arrêtés$(NC)"

restart: ## Redémarrer les services actifs
	$(call print_message,$(YELLOW),🔄 Redémarrage...)
	@cd $(BACKEND_DIR)/.. && docker-compose restart
	@echo "$(GREEN)✅ Services redémarrés$(NC)"

restart-clean: ## Redémarrage complet avec nettoyage
	$(call print_message,$(YELLOW),🔄 Redémarrage complet...)
	@$(MAKE) down
	@sleep 3
	@$(MAKE) up

# ============================================================================
# SERVICES INDIVIDUELS
# ============================================================================

start-auth: ## Démarrer service auth
	$(call print_message,$(BLUE),🔐 Démarrage service auth...)
	@cd $(BACKEND_DIR)/.. && docker-compose up -d auth-service

start-apps: ## Démarrer service applications
	$(call print_message,$(BLUE),📝 Démarrage service applications...)
	@cd $(BACKEND_DIR)/.. && docker-compose up -d application-service

start-service: ## Démarrer un service (SERVICE=nom)
	@if [ -z "$(SERVICE)" ]; then \
		echo "$(RED)❌ Spécifiez SERVICE=<nom>$(NC)"; \
		exit 1; \
	fi
	$(call print_message,$(BLUE),🚀 Démarrage $(SERVICE)...)
	@cd $(BACKEND_DIR)/.. && docker-compose up -d $(SERVICE)

stop-service: ## Arrêter un service (SERVICE=nom)
	@if [ -z "$(SERVICE)" ]; then \
		echo "$(RED)❌ Spécifiez SERVICE=<nom>$(NC)"; \
		exit 1; \
	fi
	$(call print_message,$(RED),🛑 Arrêt $(SERVICE)...)
	@cd $(BACKEND_DIR)/.. && docker-compose stop $(SERVICE)

restart-service: ## Redémarrer un service (SERVICE=nom)
	@if [ -z "$(SERVICE)" ]; then \
		echo "$(RED)❌ Spécifiez SERVICE=<nom>$(NC)"; \
		exit 1; \
	fi
	$(call print_message,$(YELLOW),🔄 Redémarrage $(SERVICE)...)
	@cd $(BACKEND_DIR)/.. && docker-compose restart $(SERVICE)

logs-service: ## Logs d'un service (SERVICE=nom)
	@if [ -z "$(SERVICE)" ]; then \
		echo "$(RED)❌ Spécifiez SERVICE=<nom>$(NC)"; \
		exit 1; \
	fi
	@cd $(BACKEND_DIR)/.. && docker-compose logs -f $(SERVICE)

# ============================================================================
# MONITORING
# ============================================================================

monitoring-up: ## Démarrer stack monitoring
	$(call print_message,$(PURPLE),📊 Démarrage stack monitoring...)
	@cd ../../monitoring && docker-compose -f docker-compose.monitoring.yml up -d
	@echo "$(GREEN)✅ Monitoring démarré$(NC)"
	@echo ""
	@echo "$(CYAN)📊 Accès monitoring:$(NC)"
	@echo "  Prometheus:  http://localhost:9090 (local only)"
	@echo "  Loki:        http://localhost:3100 (local only)"
	@echo "  Grafana:     http://localhost:3001 (admin/admin123)"
	@echo "  API Metrics: http://localhost:3008"

monitoring-down: ## Arrêter stack monitoring
	$(call print_message,$(RED),🛑 Arrêt stack monitoring...)
	@cd ../../monitoring && docker-compose -f docker-compose.monitoring.yml down

monitoring-restart: ## Redémarrer stack monitoring
	$(call print_message,$(YELLOW),🔄 Redémarrage stack monitoring...)
	@cd ../../monitoring && docker-compose -f docker-compose.monitoring.yml restart

monitoring-logs: ## Logs monitoring
	@cd ../../monitoring && docker-compose -f docker-compose.monitoring.yml logs -f

monitoring-test: ## Tester API metrics
	$(call print_message,$(PURPLE),🧪 Test API metrics...)
	@curl -s http://localhost:3008/health | jq || echo "$(RED)❌ API non accessible$(NC)"
	@echo "$(GREEN)✅ Test terminé$(NC)"

# ============================================================================
# BASE DE DONNÉES
# ============================================================================

db-migrate: ## Appliquer les migrations
	$(call print_message,$(BLUE),🗄️ Application des migrations...)
	@echo "$(YELLOW)⚠️ Migrations non encore implémentées$(NC)"

db-seed: ## Insérer données de test
	$(call print_message,$(BLUE),🌱 Insertion données de test...)
	@../../scripts/db/seed.sh

db-reset: ## Reset complet de la DB
	$(call print_message,$(RED),⚠️ Reset complet de la DB...)
	@cd $(BACKEND_DIR)/.. && docker-compose exec postgres psql -U jobbingtrack -d jobbingtrack -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
	@echo "$(GREEN)✅ DB réinitialisée$(NC)"

db-backup: ## Sauvegarder la DB
	$(call print_message,$(BLUE),💾 Sauvegarde DB...)
	@../../scripts/db/backup.sh

db-restore: ## Restaurer DB (file=backup.sql)
	@if [ -z "$(file)" ]; then \
		echo "$(RED)❌ Spécifiez file=<backup.sql>$(NC)"; \
		exit 1; \
	fi
	$(call print_message,$(BLUE),📥 Restauration depuis $(file)...)
	@cd $(BACKEND_DIR)/.. && docker-compose exec -T postgres psql -U jobbingtrack -d jobbingtrack < $(file)

db-fix-role: ## Corriger rôle PostgreSQL
	$(call print_message,$(YELLOW),🔧 Correction rôle PostgreSQL...)
	@cd $(BACKEND_DIR)/.. && docker-compose exec postgres psql -U postgres -c "ALTER ROLE jobbingtrack WITH LOGIN;" || true
	@echo "$(GREEN)✅ Rôle corrigé$(NC)"

# ============================================================================
# LOGS & STATUS
# ============================================================================

logs: ## Logs de tous les services
	$(call print_message,$(BLUE),📋 Logs en temps réel...)
	@cd $(BACKEND_DIR)/.. && docker-compose logs -f

status: ## Statut des services
	$(call print_message,$(BLUE),📊 Statut des services...)
	@echo "$(CYAN)🔴 Services essentiels:$(NC)"
	@docker ps --filter "name=jobbingtrack-*" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "postgres|redis|api-gateway|auth-service" || echo "  Aucun"
	@echo ""
	@echo "$(CYAN)🟡 Services optionnels:$(NC)"
	@docker ps --filter "name=jobbingtrack-*" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -v -E "postgres|redis|api-gateway|auth-service|frontend" || echo "  Aucun"

ps: ## Liste conteneurs actifs
	@cd $(BACKEND_DIR)/.. && docker-compose ps

health: ## Vérifier santé des services
	$(call print_message,$(GREEN),💚 Vérification santé...)
	@../../scripts/core/check.sh --detailed

# ============================================================================
# BUILD & CLEAN
# ============================================================================

build: ## Build tous les services
	$(call print_message,$(BLUE),🔨 Build de tous les services...)
	@cd $(BACKEND_DIR)/.. && docker-compose build
	@echo "$(GREEN)✅ Build terminé$(NC)"

rebuild: ## Rebuild sans cache
	$(call print_message,$(BLUE),🔨 Rebuild sans cache...)
	@cd $(BACKEND_DIR)/.. && docker-compose build --no-cache
	@echo "$(GREEN)✅ Rebuild terminé$(NC)"

rebuild-service: ## Rebuild un service (SERVICE=nom)
	@if [ -z "$(SERVICE)" ]; then \
		echo "$(RED)❌ Spécifiez SERVICE=<nom>$(NC)"; \
		exit 1; \
	fi
	$(call print_message,$(BLUE),🔨 Rebuild $(SERVICE)...)
	@cd $(BACKEND_DIR)/.. && docker-compose build --no-cache $(SERVICE)
	@cd $(BACKEND_DIR)/.. && docker-compose up -d $(SERVICE)

clean: ## Nettoyage complet
	$(call print_message,$(YELLOW),🧹 Nettoyage...)
	@cd $(BACKEND_DIR)/.. && docker-compose down -v --remove-orphans
	@docker system prune -f
	@docker network prune -f
	@docker volume prune -f
	@echo "$(GREEN)✅ Nettoyage terminé$(NC)"

clean-force: ## Nettoyage d'urgence
	$(call print_message,$(RED),⚠️ NETTOYAGE D'URGENCE...)
	@docker ps -q --filter "name=jobbingtrack-*" | xargs -r docker stop || true
	@docker ps -aq --filter "name=jobbingtrack-*" | xargs -r docker rm -f || true
	@docker images "jobbingtrack-*" -q | xargs -r docker rmi -f || true
	@docker volume ls --filter "name=jobbingtrack_*" -q | xargs -r docker volume rm -f || true
	@docker network prune -f
	@docker system prune -a -f --volumes
	@echo "$(GREEN)✅ Nettoyage d'urgence terminé$(NC)"

# ============================================================================
# TESTS
# ============================================================================

test: ## Tests backend
	$(call print_message,$(PURPLE),🧪 Tests backend...)
	@echo "$(YELLOW)⚠️ Tests non encore implémentés$(NC)"

test-unit: ## Tests unitaires
	$(call print_message,$(PURPLE),🧪 Tests unitaires...)
	@echo "$(YELLOW)⚠️ Tests unitaires non implémentés$(NC)"

test-integration: ## Tests d'intégration
	$(call print_message,$(PURPLE),🧪 Tests d'intégration...)
	@echo "$(YELLOW)⚠️ Tests d'intégration non implémentés$(NC)"

# ============================================================================
# DIAGNOSTIC
# ============================================================================

check: ## Diagnostic backend
	$(call print_message,$(BLUE),🔍 Diagnostic backend...)
	@echo "$(YELLOW)📦 Services Docker:$(NC)"
	@docker ps --filter "name=jobbingtrack-" --format "table {{.Names}}\t{{.Status}}" | head -10
	@echo ""
	@echo "$(YELLOW)🌐 Réseau:$(NC)"
	@docker network ls | grep jobbingtrack || echo "  Aucun réseau jobbingtrack"
	@echo ""
	@echo "$(GREEN)✅ Diagnostic terminé$(NC)"

diagnostic: ## Diagnostic complet
	@../../scripts/utils/diagnostic.sh

diagnostic-services: ## Diagnostic services
	$(call print_message,$(BLUE),🔍 Diagnostic services...)
	@docker ps --filter "name=jobbingtrack" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}"

# ============================================================================
# WORKFLOW RECOMMANDÉ
# ============================================================================

setup: ## Configuration initiale
	$(call print_message,$(GREEN),⚙️ Configuration backend...)
	@$(MAKE) up
	@$(MAKE) db-fix-role
	@echo "$(GREEN)✅ Configuration terminée$(NC)"

workflow: setup test ## Workflow complet
	$(call print_message,$(GREEN),✅ Workflow terminé$(NC))
