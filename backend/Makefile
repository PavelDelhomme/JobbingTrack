# Makefile pour JobbingTrack Microservices

.PHONY: help build up down logs clean dev test migrate

# Variables
COMPOSE_FILE = docker-compose.yml
SERVICES = api-gateway auth-service application-service company-service contact-service interview-service notification-service dashboard-service call-service profile-service event-service

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
	docker compose -f $(COMPOSE_FILE) build

# Démarrer tous les services
up:
	@echo "🚀 Démarrage des microservices..."
	docker compose -f $(COMPOSE_FILE) up -d

# Arrêter tous les services
down:
	@echo "🛑 Arrêt des microservices..."
	docker compose -f $(COMPOSE_FILE) down

# Voir les logs
logs:
	@echo "📋 Logs des microservices..."
	docker compose -f $(COMPOSE_FILE) logs -f

# Mode développement
dev:
	@echo "🔧 Démarrage en mode développement..."
	docker compose -f $(COMPOSE_FILE) up --build

# Exécuter les tests
test:
	@echo "🧪 Exécution des tests..."
	@for service in $(SERVICES); do \
		echo "Testing $$service..."; \
		docker compose -f $(COMPOSE_FILE) exec $$service npm test || true; \
	done

# Migrations de base de données
migrate:
	@echo "🗄️ Exécution des migrations..."
	docker compose -f $(COMPOSE_FILE) exec auth-service npx prisma migrate deploy
	docker compose -f $(COMPOSE_FILE) exec auth-service npx prisma generate

# Nettoyer
clean:
	@echo "🧹 Nettoyage des conteneurs et volumes..."
	docker compose -f $(COMPOSE_FILE) down -v
	docker system prune -f

# Statut des services
status:
	@echo "📊 Statut des services:"
	docker compose -f $(COMPOSE_FILE) ps

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

# Redémarrer un service spécifique
restart-%:
	@echo "🔄 Redémarrage du service $*..."
	docker compose -f $(COMPOSE_FILE) restart $*

# Rebuild un service spécifique
rebuild-%:
	@echo "🔨 Reconstruction du service $*..."
	docker compose -f $(COMPOSE_FILE) up --build -d $*
