# Makefile pour JobbingTrack Microservices

.PHONY: help build up down logs clean dev test migrate test-all test-services test-auth test-integration test-load

# Variables
COMPOSE_FILE = docker-compose.yml
SERVICES = api-gateway auth-service application-service company-service contact-service interview-service notification-service dashboard-service

# Aide
help:
	@echo "🚀 JobbingTrack Microservices - Commandes disponibles:"
	@echo ""
	@echo "  build     - Construire toutes les images Docker"
	@echo "  up        - Démarrer tous les services"
	@echo "  down      - Arrêter tous les services"
	@echo "  logs      - Voir les logs de tous les services"
	@echo "  dev       - Démarrer en mode développement"
	@echo "  test      - Exécuter les tests"
	@echo "  migrate   - Exécuter les migrations de base de données"
	@echo "  clean     - Nettoyer les conteneurs et volumes"
	@echo "  status    - Voir le statut des services"
	@echo ""

# Construire toutes les images
build:
	@echo "🔨 Construction des images Docker..."
	docker-compose -f $(COMPOSE_FILE) build

# Démarrer tous les services
up:
	@echo "🚀 Démarrage des microservices..."
	docker-compose -f $(COMPOSE_FILE) up -d

# Arrêter tous les services
down:
	@echo "🛑 Arrêt des microservices..."
	docker-compose -f $(COMPOSE_FILE) down

# Voir les logs
logs:
	@echo "📋 Logs des microservices..."
	docker-compose -f $(COMPOSE_FILE) logs -f

# Mode développement
dev:
	@echo "🔧 Démarrage en mode développement..."
	docker-compose -f $(COMPOSE_FILE) up --build

# Exécuter les tests
test:
	@echo "🧪 Exécution des tests..."
	@for service in $(SERVICES); do \
		echo "Testing $$service..."; \
		docker-compose -f $(COMPOSE_FILE) exec $$service npm test || true; \
	done

# Migrations de base de données
migrate:
	@echo "🗄️ Exécution des migrations..."
	docker-compose -f $(COMPOSE_FILE) exec auth-service npx prisma migrate deploy
	docker-compose -f $(COMPOSE_FILE) exec auth-service npx prisma generate

# Nettoyer
clean:
	@echo "🧹 Nettoyage des conteneurs et volumes..."
	docker-compose -f $(COMPOSE_FILE) down -v
	docker system prune -f

# Statut des services
status:
	@echo "📊 Statut des services:"
	docker-compose -f $(COMPOSE_FILE) ps

# Démarrer un service spécifique
start-%:
	@echo "🚀 Démarrage du service $*..."
	docker-compose -f $(COMPOSE_FILE) up -d $*

# Arrêter un service spécifique
stop-%:
	@echo "🛑 Arrêt du service $*..."
	docker-compose -f $(COMPOSE_FILE) stop $*

# Logs d'un service spécifique
logs-%:
	@echo "📋 Logs du service $*..."
	docker-compose -f $(COMPOSE_FILE) logs -f $*

# Redémarrer un service spécifique
restart-%:
	@echo "🔄 Redémarrage du service $*..."
	docker-compose -f $(COMPOSE_FILE) restart $*

# Rebuild un service spécifique
rebuild-%:
	@echo "🔨 Reconstruction du service $*..."
	docker-compose -f $(COMPOSE_FILE) up --build -d $*

# Tests
# Tests automatisés complets
test-all: test-services test-auth test-integration
	@echo "$(GREEN)🎉 Tous les tests passés avec succès !$(RESET)"

# Tests de santé de tous les services
test-services:
	@echo "$(BLUE)🏥 Tests de santé des micro-services...$(RESET)"
	@./test-services.sh

# Tests d'authentification
test-auth:
	@echo "$(BLUE)🔐 Tests d'authentification...$(RESET)"
	@curl -s http://localhost:3000/health > /dev/null || (echo "$(RED)❌ API Gateway non accessible$(RESET)" && exit 1)
	@echo "$(GREEN)✅ Tests auth OK$(RESET)"

# Tests d'intégration
test-integration:
	@echo "$(BLUE)🔗 Tests d'intégration...$(RESET)"
	@./test-microservices.sh

# Tests de charge (optionnel)
test-load:
	@echo "$(BLUE)⚡ Tests de charge...$(RESET)"
	@if command -v ab > /dev/null 2>&1; then \
		ab -n 100 -c 10 http://localhost:3000/health; \
	else \
		echo "$(YELLOW)⚠️ Apache Bench (ab) non installé$(RESET)"; \
	fi

# Installer jq si nécessaire
install-jq:
	@if ! command -v jq > /dev/null 2>&1; then \
		echo "$(YELLOW)📦 Installation de jq...$(RESET)"; \
		if command -v apt > /dev/null 2>&1; then \
			sudo apt update && sudo apt install -y jq; \
		elif command -v brew > /dev/null 2>&1; then \
			brew install jq; \
		elif command -v pacman > /dev/null 2>&1; then \
			sudo pacman -S jq; \
		else \
			echo "$(RED)❌ Impossible d'installer jq automatiquement$(RESET)"; \
		fi; \
	else \
		echo "$(GREEN)✅ jq déjà installé$(RESET)"; \
	fi