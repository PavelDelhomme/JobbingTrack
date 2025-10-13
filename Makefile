# Makefile pour JobbingTrack Microservices (FullStack)

.PHONY: help build up up-service up-backoffice down down-backoffice logs clean dev test migrate test-all test-services test-auth test-integration test-load full-dev full-up full-down full-logs full-clean full-health

# Couleurs
GREEN := \033[0;32m
RED := \033[0;31m
YELLOW := \033[1;33m
BLUE := \033[0;34m
NC := \033[0m
RESET := \033[0m

# Variables
BACKEND_DIR = backend
COMPOSE_FILE = backend/docker-compose.yml
FRONTEND_COMPOSE_FILE = frontend/docker-compose.frontend.yml
SERVICES = api-gateway auth-service application-service company-service contact-service interview-service notification-service dashboard-service
BACKOFFICE_SERVICES = postgres redis auth-service dashboard-service api-gateway

# Aide
help:
	@echo "🚀 JobbingTrack Microservices (FullStack) - Commandes disponibles:"
	@echo ""
	@echo "  🏗️  INFRASTRUCTURE:"
	@echo "    build              - Construire toutes les images Docker"
	@echo "    up                 - Démarrer TOUS les services (backend + infra)"
	@echo "    full-up            - Démarrer TOUT (backend + frontend) - même que 'make up'"
	@echo "    up-service         - Démarrer un/plusieurs services (ex: make up-service SERVICE=auth-service)"
	@echo "    up-backoffice      - Démarrer le backoffice (auth, dashboard, api-gateway, frontend)"
	@echo "    down               - Arrêter TOUS les services (backend + frontend)"
	@echo "    down-backoffice    - Arrêter uniquement le backoffice"
	@echo "    logs               - Voir les logs de TOUS les services"
	@echo "    logs-<service>     - Logs d'un service spécifique (ex: logs-auth-service)"
	@echo "    logs-backend       - Logs des services backend uniquement"
	@echo "    logs-infra         - Logs PostgreSQL + Redis"
	@echo "    dev                - Démarrer en mode développement"
	@echo "    status             - Voir le statut des services"
	@echo "    clean              - Nettoyer les conteneurs et volumes"
	@echo ""
	@echo "  🧪 TESTS AUTOMATISÉS:"
	@echo "    test-automated     - Tests automatisés complets (dossier tests/)"
	@echo "    test-workflow      - Tests workflow utilisateur complet"
	@echo "    test-auth-user     - Tests authentification avec dumb@delhomme.ovh"
	@echo "    test-applications  - Tests candidatures + auto-création entreprises"
	@echo "    test-cleanup       - Nettoyage données de test"
	@echo ""
	@echo "  🔧 TESTS TECHNIQUES:"
	@echo "    test-all           - Tests techniques (services + intégration)"
	@echo "    test-services      - Tests de santé des micro-services"
	@echo "    test-auth          - Tests d'authentification technique"
	@echo "    test-integration   - Tests d'intégration"
	@echo "    test-load          - Tests de charge"
	@echo ""
	@echo "  🗄️  BASE DE DONNÉES:"
	@echo "    migrate            - Exécuter les migrations"
	@echo "    generate-test-data - Générer des données de test réalistes"
	@echo ""

# ===== INFRASTRUCTURE =====

# Construire toutes les images
build:
	@echo "🔨 Construction des images Docker..."
	docker compose -f $(COMPOSE_FILE) build

# Démarrer tous les services
up:
	@echo "🚀 Démarrage de TOUS les microservices..."
	docker compose -f $(COMPOSE_FILE) up -d
	@echo "$(BLUE)🌐 Démarrage du frontend...$(NC)"
	@cd frontend && docker compose -f docker-compose.frontend.yml up -d
	@echo "$(GREEN)✅ Tous les services sont démarrés !$(NC)"
	@echo "$(BLUE)📍 Accès:$(NC)"
	@echo "   - Frontend:    http://localhost:8080"
	@echo "   - API Gateway: http://localhost:3000"

# Démarrer TOUT (backend + frontend) - même que 'make up'
full-up: up

# Démarrer un ou plusieurs services spécifiques
# Usage: make up-service SERVICE=auth-service
# Usage: make up-service SERVICE="auth-service api-gateway"
up-service:
	@if [ -z "$(SERVICE)" ]; then \
		echo "$(RED)❌ Erreur: Veuillez spécifier SERVICE$(NC)"; \
		echo "$(YELLOW)💡 Exemple: make up-service SERVICE=auth-service$(NC)"; \
		echo "$(YELLOW)💡 Exemple: make up-service SERVICE=\"auth-service api-gateway\"$(NC)"; \
		exit 1; \
	fi
	@echo "$(BLUE)🚀 Démarrage du/des service(s): $(SERVICE)$(NC)"
	@docker compose -f $(COMPOSE_FILE) up -d $(SERVICE)
	@echo "$(GREEN)✅ Service(s) $(SERVICE) démarré(s) !$(NC)"

# Démarrer le backoffice (auth, dashboard backend, api-gateway + frontend)
up-backoffice:
	@echo "$(BLUE)🎯 Démarrage du backoffice (auth, dashboard, api-gateway, frontend)...$(NC)"
	@echo "$(YELLOW)📦 Démarrage des services backend...$(NC)"
	@docker compose -f $(COMPOSE_FILE) up -d $(BACKOFFICE_SERVICES)
	@echo "$(YELLOW)🌐 Démarrage du frontend...$(NC)"
	@cd frontend && docker compose -f docker-compose.frontend.yml up -d
	@echo ""
	@echo "$(GREEN)✅ Backoffice démarré avec succès !$(NC)"
	@echo "$(BLUE)📍 Accès:$(NC)"
	@echo "   - Frontend:    http://localhost:8080"
	@echo "   - API Gateway: http://localhost:3000"
	@echo "   - Auth:        http://localhost:3001"
	@echo "   - Dashboard:   http://localhost:3007"

# Arrêter tous les services
down:
	@echo "🛑 Arrêt de TOUS les microservices..."
	docker compose -f $(COMPOSE_FILE) down
	@echo "$(BLUE)🛑 Arrêt du frontend...$(NC)"
	@cd frontend && docker compose -f docker-compose.frontend.yml down 2>/dev/null || true
	@echo "$(GREEN)✅ Tous les services sont arrêtés !$(NC)"

# Arrêter uniquement le backoffice
down-backoffice:
	@echo "$(BLUE)🛑 Arrêt du backoffice...$(NC)"
	@docker compose -f $(COMPOSE_FILE) stop $(BACKOFFICE_SERVICES)
	@echo "$(BLUE)🛑 Arrêt du frontend...$(NC)"
	@cd frontend && docker compose -f docker-compose.frontend.yml down 2>/dev/null || true
	@echo "$(GREEN)✅ Backoffice arrêté !$(NC)"

# Voir les logs
logs:
	@echo "📋 Logs des microservices..."
	docker compose -f $(COMPOSE_FILE) logs -f

# Mode développement
dev:
	@echo "🔧 Démarrage en mode développement..."
	docker compose -f $(COMPOSE_FILE) up --build

# Statut des services
status:
	@echo "📊 Statut des services:"
	docker compose -f $(COMPOSE_FILE) ps

# Nettoyer
clean:
	@echo "🧹 Nettoyage des conteneurs, volumes et images du projet..."
	docker compose -f $(COMPOSE_FILE) down -v --remove-orphans
	docker system prune -f
	@echo "🗑️ Suppression des images Docker du projet JobbingTrack..."
	docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.ID}}" | grep -E "(jobbingtrack|backend-|frontend-)" | awk 'NR>1 {print $$3}' | xargs -r docker rmi -f 2>/dev/null || true
	@echo "$(GREEN)✅ Nettoyage du projet terminé ! (Images de base préservées)$(NC)"

# ===== TESTS AUTOMATISÉS (DOSSIER tests/) =====

# Tests automatisés complets
test-automated:
	@echo "$(BLUE)🧪 Tests automatisés complets...$(NC)"
	@if [ -d "tests" ]; then \
		cd tests && $(MAKE) test-all; \
	else \
		echo "$(RED)❌ Dossier tests/ non trouvé$(NC)"; \
		echo "$(YELLOW)💡 Créez le dossier tests/ avec les scripts automatisés$(NC)"; \
		exit 1; \
	fi

# Génération de données de test
generate-test-data:
	@echo "$(BLUE)🎲 Génération de données de test...$(NC)"
	@AUTO_GENERATE=true ./backend/generate-test-data.sh standard

# Tests workflow utilisateur complet
test-workflow:
	@echo "$(BLUE)📝 Tests workflow utilisateur complet...$(NC)"
	@if [ -d "tests" ]; then \
		cd tests && $(MAKE) test-workflow; \
	else \
		echo "$(RED)❌ Dossier tests/ non trouvé$(NC)"; \
		exit 1; \
	fi

# Tests authentification avec dumb@delhomme.ovh
test-auth-user:
	@echo "$(BLUE)🔐 Tests authentification utilisateur...$(NC)"
	@if [ -d "tests" ]; then \
		cd tests && $(MAKE) test-auth; \
	else \
		echo "$(RED)❌ Dossier tests/ non trouvé$(NC)"; \
		exit 1; \
	fi

# Tests candidatures + auto-création entreprises
test-applications:
	@echo "$(BLUE)📋 Tests candidatures + auto-création entreprises...$(NC)"
	@if [ -d "tests" ]; then \
		cd tests && $(MAKE) test-applications; \
	else \
		echo "$(RED)❌ Dossier tests/ non trouvé$(NC)"; \
		exit 1; \
	fi

# Nettoyage données de test
test-cleanup:
	@echo "$(BLUE)🧹 Nettoyage données de test...$(NC)"
	@if [ -d "tests" ]; then \
		cd tests && $(MAKE) clean-test; \
	else \
		echo "$(YELLOW)⚠️ Dossier tests/ non trouvé - rien à nettoyer$(NC)"; \
	fi

# ===== TESTS TECHNIQUES (SERVICES) =====

# Tests techniques complets
test-all: test-services test-auth test-integration
	@echo "$(GREEN)🎉 Tous les tests techniques passés avec succès !$(NC)"

# Tests de santé de tous les services
test-services:
	@echo "$(BLUE)🏥 Tests de santé des micro-services...$(NC)"
	@if [ -f "./test-services.sh" ]; then \
		./test-services.sh; \
	elif [ -f "backend/test-services.sh" ]; then \
		cd backend && ./test-services.sh; \
	else \
		echo "$(RED)❌ Script test-services.sh non trouvé$(NC)"; \
		exit 1; \
	fi

# Tests d'authentification technique
test-auth:
	@echo "$(BLUE)🔐 Tests d'authentification technique...$(NC)"
	@curl -s http://localhost:3000/health > /dev/null || (echo "$(RED)❌ API Gateway non accessible$(NC)" && exit 1)
	@echo "$(GREEN)✅ Tests auth technique OK$(NC)"

# Tests d'intégration
test-integration:
	@echo "$(BLUE)🔗 Tests d'intégration...$(NC)"
	@if [ -f "./test-microservices.sh" ]; then \
		./test-microservices.sh; \
	elif [ -f "backend/test-microservices.sh" ]; then \
		cd backend && ./test-microservices.sh; \
	else \
		echo "$(RED)❌ Script test-microservices.sh non trouvé$(NC)"; \
		exit 1; \
	fi

# Tests de charge (optionnel)
test-load:
	@echo "$(BLUE)⚡ Tests de charge...$(NC)"
	@if command -v ab > /dev/null 2>&1; then \
		ab -n 100 -c 10 http://localhost:3000/health; \
	else \
		echo "$(YELLOW)⚠️ Apache Bench (ab) non installé$(NC)"; \
	fi

# ===== GESTION SERVICES INDIVIDUELS =====

# Démarrer un service spécifique
start-%:
	@echo "🚀 Démarrage du service $*..."
	docker compose -f $(COMPOSE_FILE) up -d $*

# Arrêter un service spécifique
stop-%:
	@echo "🛑 Arrêt du service $*..."
	docker compose -f $(COMPOSE_FILE) stop $*

# Logs d'un service spécifique
logs-%:
	@echo "📋 Logs du service $*..."
	docker compose -f $(COMPOSE_FILE) logs -f $*

# Logs des services backend uniquement (sans infra)
logs-backend:
	@echo "📋 Logs des services backend..."
	docker compose -f $(COMPOSE_FILE) logs -f $(SERVICES)

# Logs de l'infrastructure (PostgreSQL + Redis)
logs-infra:
	@echo "📋 Logs infrastructure (PostgreSQL + Redis)..."
	docker compose -f $(COMPOSE_FILE) logs -f postgres redis

# Redémarrer un service spécifique
restart-%:
	@echo "🔄 Redémarrage du service $*..."
	docker compose -f $(COMPOSE_FILE) restart $*

# Rebuild un service spécifique
rebuild-%:
	@echo "🔨 Reconstruction du service $*..."
	docker compose -f $(COMPOSE_FILE) up --build -d $*

# ===== BASE DE DONNÉES =====

# Migrations de base de données
migrate:
	@echo "🗄️ Exécution des migrations..."
	docker compose -f $(COMPOSE_FILE) exec auth-service npx prisma migrate deploy
	docker compose -f $(COMPOSE_FILE) exec auth-service npx prisma generate

# ===== UTILITAIRES =====

# Tests legacy (pour compatibilité)
test:
	@echo "$(YELLOW)⚠️ Utilisation legacy - utilisez 'make test-all' ou 'make test-automated'$(NC)"
	@$(MAKE) test-all

# Installer jq si nécessaire
install-jq:
	@if ! command -v jq > /dev/null 2>&1; then \
		echo "$(YELLOW)📦 Installation de jq...$(NC)"; \
		if command -v apt > /dev/null 2>&1; then \
			sudo apt update && sudo apt install -y jq; \
		elif command -v brew > /dev/null 2>&1; then \
			brew install jq; \
		elif command -v pacman > /dev/null 2>&1; then \
			sudo pacman -S jq; \
		else \
			echo "$(RED)❌ Impossible d'installer jq automatiquement$(NC)"; \
		fi; \
	else \
		echo "$(GREEN)✅ jq déjà installé$(NC)"; \
	fi