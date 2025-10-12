# Makefile pour JobbingTrack Microservices

.PHONY: help build up down logs clean dev test migrate

# Variables
COMPOSE_FILE = docker-compose.yml
SERVICES = api-gateway auth-service application-service company-service contact-service interview-service notification-service dashboard-service call-service profile-service event-service followup-service

# Aide
help:
	@echo "🚀 JobbingTrack Microservices - Commandes disponibles:"
	@echo ""
	@echo "Gestion des services:"
	@echo "  build          - Construire toutes les images Docker"
	@echo "  up             - Démarrer tous les services"
	@echo "  down           - Arrêter tous les services"
	@echo "  logs           - Voir les logs de tous les services"
	@echo "  dev            - Démarrer en mode développement"
	@echo "  test           - Exécuter les tests"
	@echo "  migrate        - Exécuter les migrations de base de données"
	@echo "  clean          - Nettoyer les conteneurs et volumes"
	@echo "  status         - Voir le statut des services"
	@echo ""
	@echo "Données de test:"
	@echo "  seed-minimal   - Générer données minimales (développement rapide)"
	@echo "  seed-standard  - Générer données standard (recommandé)"
	@echo "  seed-complete  - Générer beaucoup de données (tests de charge)"
	@echo "  seed-demo      - Générer données pour démo client"
	@echo "  clean-data     - Supprimer toutes les données de test"
	@echo ""
	@echo "Services individuels:"
	@echo "  start-SERVICE  - Démarrer un service (ex: start-auth-service)"
	@echo "  stop-SERVICE   - Arrêter un service"
	@echo "  logs-SERVICE   - Voir les logs d'un service"
	@echo "  restart-SERVICE - Redémarrer un service"
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

# Générer des données de test
seed-minimal:
	@echo "🎲 Génération de données de test (minimal)..."
	@cd "$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))" && bash generate-test-data.sh minimal

seed-standard:
	@echo "🎲 Génération de données de test (standard)..."
	@cd "$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))" && bash generate-test-data.sh standard

seed-complete:
	@echo "🎲 Génération de données de test (complet)..."
	@cd "$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))" && bash generate-test-data.sh complete

seed-demo:
	@echo "🎲 Génération de données de test (démo)..."
	@cd "$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))" && bash generate-test-data.sh demo

# Nettoyer toutes les données
clean-data:
	@echo "🗑️ Nettoyage de toutes les données..."
	docker compose -f $(COMPOSE_FILE) exec postgres psql -U jobbingtrack -d jobbingtrack -c 'TRUNCATE TABLE "Application", "Interview", "FollowUp", "Call", "Contact", "Company", "Activity", "ApplicationContact", "ApplicationDocument", "Document", "Reminder", "MessageTemplate" CASCADE;'
	@echo "✅ Données nettoyées"
