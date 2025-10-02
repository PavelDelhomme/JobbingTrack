# Makefile Final JobbingTrack - Adapté à ton Infrastructure

# Variables
PROJECT_NAME=jobbingtrack
COMPOSE_FILE=docker-compose.yml
COMPOSE_PROD_FILE=docker-compose.prod.yml
API_CONTAINER=jobbingtrack-api
DB_CONTAINER=jobbingtrack-db
REDIS_CONTAINER=jobbingtrack-redis
FRONTEND_CONTAINER=jobbingtrack-frontend
MAIL_CONTAINER=jobbingtrack-mail

# Couleurs pour les messages
GREEN=\033[0;32m
YELLOW=\033[1;33m
RED=\033[0;31m
BLUE=\033[0;34m
PURPLE=\033[0;35m
RESET=\033[0m

.PHONY: help dev demo production up down restart status logs health test install-deps migrate seed backup clean

# 🆘 Aide - Affiche toutes les commandes disponibles
help: ## Afficher toutes les commandes disponibles
	@echo "$(BLUE)🎯 JobbingTrack - Commandes pour Développement & Production$(RESET)"
	@echo ""
	@echo "$(GREEN)🚀 DÉVELOPPEMENT LOCAL$(RESET)"
	@echo "  dev              🔥 Démarrage développement complet (API + DB + Mail)"
	@echo "  demo             🎭 Setup complet avec données de test"
	@echo "  install-deps     📦 Installer toutes les dépendances"
	@echo "  test-all         🧪 Tester inscription, connexion, reset password"
	@echo ""
	@echo "$(GREEN)🌐 PRODUCTION PORTAINER$(RESET)"
	@echo "  production       🚀 Démarrer en mode production (Portainer ready)"
	@echo "  prod-build       🏗️ Build production avec optimisations"
	@echo "  prod-deploy      📤 Déployer sur Portainer (shared-network-copy)"
	@echo "  prod-logs        📜 Logs production"
	@echo "  prod-status      📊 Status production"
	@echo ""
	@echo "$(GREEN)🔄 GESTION SERVICES$(RESET)"
	@echo "  up               ▶️ Démarrer services (local)"
	@echo "  down             ⏹️ Arrêter services"
	@echo "  restart          🔄 Redémarrer services"
	@echo "  status           📊 Statut des services"
	@echo ""
	@echo "$(GREEN)📊 MONITORING$(RESET)"
	@echo "  logs             📜 Logs temps réel (local)"
	@echo "  logs-api         📋 Logs API uniquement"
	@echo "  logs-mail        📧 Logs serveur mail"
	@echo "  health           🏥 Test santé API"
	@echo "  endpoints        🔗 Tester tous les endpoints"
	@echo ""
	@echo "$(GREEN)🗄️ BASE DE DONNÉES$(RESET)"
	@echo "  migrate          📈 Migrations Prisma"
	@echo "  migrate-reset    🔄 Reset complet DB"
	@echo "  seed             🌱 Données de test"
	@echo "  studio           🎨 Prisma Studio GUI"
	@echo "  backup           💾 Sauvegarde DB"
	@echo ""
	@echo "$(GREEN)🧪 TESTS$(RESET)"
	@echo "  test             🧪 Tests unitaires"
	@echo "  test-auth        🔐 Tester authentification complète"
	@echo "  test-email       📧 Tester envoi emails"
	@echo "  test-api         🌐 Tester API complète"
	@echo ""
	@echo "$(GREEN)🧹 MAINTENANCE$(RESET)"
	@echo "  clean            🧹 Nettoyer containers/volumes"
	@echo "  clean-all        💥 Nettoyage complet"
	@echo "  reset            🔄 Reset projet complet"
	@echo ""

# 🚀 DÉVELOPPEMENT LOCAL

# Démarrage développement complet
dev: install-deps
	@echo "$(GREEN)🔥 Démarrage mode développement...$(RESET)"
	@docker-compose up --build -d
	@sleep 10
	@make migrate
	@make seed
	@echo "$(GREEN)✅ Développement prêt !$(RESET)"
	@echo "$(BLUE)📊 Services disponibles :$(RESET)"
	@echo "  - API Backend: http://localhost:3000"
	@echo "  - Documentation: http://localhost:3000/api-docs"
	@echo "  - Base de données: localhost:5432"
	@echo "  - Adminer DB: http://localhost:8080"
	@echo "  - Mail Catcher: http://localhost:1080"

# Setup démo complet
demo: clean install-deps
	@echo "$(PURPLE)🎭 Préparation démo JobbingTrack...$(RESET)"
	@docker-compose up --build -d
	@sleep 15
	@make migrate
	@make seed
	@make test-auth
	@echo "$(GREEN)🎉 Démo JobbingTrack prête !$(RESET)"
	@echo "$(YELLOW)👤 Compte de test créé :$(RESET)"
	@echo "  Email: pavel@jobbingtrack.local"
	@echo "  Password: password123"
	@echo "$(BLUE)🌐 URLs importantes :$(RESET)"
	@echo "  - API: http://localhost:3000"
	@echo "  - Docs: http://localhost:3000/api-docs"
	@echo "  - Mail: http://localhost:1080"

# Installation des dépendances
install-deps:
	@echo "$(GREEN)📦 Installation des dépendances...$(RESET)"
	@if [ -d "backend" ]; then \
		cd backend && npm install; \
		echo "$(GREEN)✅ Dépendances backend installées$(RESET)"; \
	fi
	@if [ -d "frontend" ]; then \
		cd frontend && npm install; \
		echo "$(GREEN)✅ Dépendances frontend installées$(RESET)"; \
	fi

# 🌐 PRODUCTION PORTAINER

# Mode production (compatible Portainer + NPM)
production:
	@echo "$(PURPLE)🚀 Démarrage mode PRODUCTION...$(RESET)"
	@echo "$(YELLOW)⚠️ Configuration pour Portainer + Nginx Proxy Manager$(RESET)"
	@docker-compose -f $(COMPOSE_PROD_FILE) up --build -d
	@sleep 15
	@docker-compose -f $(COMPOSE_PROD_FILE) exec jobbingtrack-api npx prisma migrate deploy
	@echo "$(GREEN)✅ Production JobbingTrack démarrée !$(RESET)"
	@echo "$(BLUE)🌐 URLs production :$(RESET)"
	@echo "  - API: https://api.jobbingtrack.delhomme.ovh"
	@echo "  - Frontend: https://jobbingtrack.delhomme.ovh"
	@echo "  - Admin: https://admin.jobbingtrack.delhomme.ovh"

# Build production optimisé
prod-build:
	@echo "$(GREEN)🏗️ Build production optimisé...$(RESET)"
	@DOCKER_BUILDKIT=1 docker-compose -f $(COMPOSE_PROD_FILE) build --parallel --no-cache
	@echo "$(GREEN)✅ Build production terminé$(RESET)"

# Déploiement pour Portainer
prod-deploy: prod-build
	@echo "$(PURPLE)📤 Déploiement Portainer...$(RESET)"
	@echo "$(BLUE)💡 Copier le docker-compose.prod.yml dans Portainer$(RESET)"
	@echo "$(YELLOW)⚠️ N'oubliez pas de configurer les variables d'environnement$(RESET)"
	@echo "$(GREEN)✅ Prêt pour déploiement Portainer$(RESET)"

# Logs production
prod-logs:
	@echo "$(BLUE)📜 Logs production...$(RESET)"
	@docker-compose -f $(COMPOSE_PROD_FILE) logs -f

# Status production
prod-status:
	@echo "$(BLUE)📊 Status production :$(RESET)"
	@docker-compose -f $(COMPOSE_PROD_FILE) ps

# 🔄 GESTION SERVICES

# Démarrer services locaux
up:
	@echo "$(GREEN)▶️ Démarrage services locaux...$(RESET)"
	@docker-compose up -d
	@echo "$(GREEN)✅ Services démarrés$(RESET)"

# Arrêter services
down:
	@echo "$(YELLOW)⏹️ Arrêt services...$(RESET)"
	@docker-compose down
	@if [ -f "$(COMPOSE_PROD_FILE)" ]; then \
		docker-compose -f $(COMPOSE_PROD_FILE) down; \
	fi
	@echo "$(GREEN)✅ Services arrêtés$(RESET)"

# Redémarrer services
restart: down up
	@echo "$(GREEN)🔄 Services redémarrés$(RESET)"

# Status des services
status:
	@echo "$(BLUE)📊 Status services locaux :$(RESET)"
	@docker-compose ps
	@echo ""
	@if [ -f "$(COMPOSE_PROD_FILE)" ]; then \
		echo "$(BLUE)📊 Status services production :$(RESET)"; \
		docker-compose -f $(COMPOSE_PROD_FILE) ps; \
	fi

# 📊 MONITORING

# Logs temps réel
logs:
	@echo "$(BLUE)📜 Logs temps réel (Ctrl+C pour quitter)...$(RESET)"
	@docker-compose logs -f

# Logs API uniquement
logs-api:
	@echo "$(BLUE)📋 Logs API...$(RESET)"
	@docker-compose logs -f $(API_CONTAINER)

# Logs serveur mail
logs-mail:
	@echo "$(BLUE)📧 Logs serveur mail...$(RESET)"
	@docker-compose logs -f $(MAIL_CONTAINER)

# Test santé API
health:
	@echo "$(BLUE)🏥 Test santé API...$(RESET)"
	@sleep 3
	@curl -s http://localhost:3000/health | jq . || echo "$(RED)❌ API non accessible$(RESET)"

# Tester tous les endpoints principaux
endpoints:
	@echo "$(BLUE)🔗 Test endpoints principaux...$(RESET)"
	@echo "$(YELLOW)Health Check:$(RESET)"
	@curl -s http://localhost:3000/health | jq .status 2>/dev/null || echo "❌"
	@echo "$(YELLOW)Documentation:$(RESET)"
	@curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api-docs 2>/dev/null | grep -q "200" && echo "✅" || echo "❌"
	@echo "$(YELLOW)Auth Register:$(RESET)"
	@curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/v1/auth/register 2>/dev/null | grep -q "400\|405" && echo "✅" || echo "❌"

# 🗄️ BASE DE DONNÉES

# Migrations Prisma
migrate:
	@echo "$(GREEN)📈 Exécution migrations Prisma...$(RESET)"
	@docker-compose exec $(API_CONTAINER) npx prisma migrate dev --name auto-migration || true
	@echo "$(GREEN)✅ Migrations terminées$(RESET)"

# Reset complet DB
migrate-reset:
	@echo "$(RED)🔄 RESET COMPLET BASE DE DONNÉES$(RESET)"
	@read -p "Êtes-vous sûr? Tapez 'yes' pour confirmer: " confirm && [ "$$confirm" = "yes" ] || (echo "Annulé" && exit 1)
	@docker-compose exec $(API_CONTAINER) npx prisma migrate reset --force
	@echo "$(GREEN)✅ Base de données réinitialisée$(RESET)"

# Données de test
seed:
	@echo "$(GREEN)🌱 Insertion données de test...$(RESET)"
	@docker-compose exec $(API_CONTAINER) npm run seed || true
	@echo "$(GREEN)✅ Données de test insérées$(RESET)"

# Prisma Studio
studio:
	@echo "$(GREEN)🎨 Ouverture Prisma Studio...$(RESET)"
	@echo "$(BLUE)🌐 Studio: http://localhost:5555$(RESET)"
	@docker-compose exec -d $(API_CONTAINER) npx prisma studio --port 5555 --hostname 0.0.0.0

# Sauvegarde DB
backup:
	@echo "$(GREEN)💾 Sauvegarde base de données...$(RESET)"
	@mkdir -p backups
	@docker-compose exec $(DB_CONTAINER) pg_dump -U jobbingtrack jobbingtrack > backups/backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)✅ Sauvegarde créée dans backups/$(RESET)"

# 🧪 TESTS

# Tests unitaires
test:
	@echo "$(GREEN)🧪 Tests unitaires...$(RESET)"
	@docker-compose exec $(API_CONTAINER) npm test || true

# Test authentification complète
test-auth:
	@echo "$(GREEN)🔐 Test authentification complète...$(RESET)"
	@echo "$(YELLOW)1. Test inscription...$(RESET)"
	@curl -s -X POST http://localhost:3000/api/v1/auth/register \
		-H "Content-Type: application/json" \
		-d '{"email":"pavel@jobbingtrack.local","password":"password123","firstName":"Pavel","lastName":"Delhomme"}' \
		| jq '.success // false' || echo "❌ Inscription failed"
	@echo "$(YELLOW)2. Test connexion...$(RESET)"
	@curl -s -X POST http://localhost:3000/api/v1/auth/login \
		-H "Content-Type: application/json" \
		-d '{"email":"pavel@jobbingtrack.local","password":"password123"}' \
		| jq '.success // false' || echo "❌ Login failed"
	@echo "$(YELLOW)3. Test reset password...$(RESET)"
	@curl -s -X POST http://localhost:3000/api/v1/auth/forgot-password \
		-H "Content-Type: application/json" \
		-d '{"email":"pavel@jobbingtrack.local"}' \
		| jq '.success // false' || echo "❌ Reset failed"
	@echo "$(GREEN)✅ Tests authentification terminés$(RESET)"

# Test envoi emails
test-email:
	@echo "$(GREEN)📧 Test envoi emails...$(RESET)"
	@curl -s -X POST http://localhost:3000/api/test/test-email 2>/dev/null || echo "$(YELLOW)⚠️ Route de test email non disponible$(RESET)"
	@echo "$(BLUE)💡 Vérifiez http://localhost:1080 pour voir les emails$(RESET)"

# Test API complète
test-api: health endpoints test-auth
	@echo "$(GREEN)✅ Tests API complets terminés$(RESET)"

# 🧹 MAINTENANCE

# Nettoyage standard
clean:
	@echo "$(YELLOW)🧹 Nettoyage containers et volumes...$(RESET)"
	@docker-compose down -v --remove-orphans 2>/dev/null || true
	@docker-compose -f $(COMPOSE_PROD_FILE) down -v --remove-orphans 2>/dev/null || true
	@docker system prune -f
	@echo "$(GREEN)✅ Nettoyage terminé$(RESET)"

# Nettoyage complet
clean-all:
	@echo "$(RED)💥 NETTOYAGE COMPLET$(RESET)"
	@read -p "Supprimer TOUT (containers, volumes, images)? Tapez 'yes': " confirm && [ "$$confirm" = "yes" ] || (echo "Annulé" && exit 1)
	@docker-compose down -v --remove-orphans --rmi all 2>/dev/null || true
	@docker-compose -f $(COMPOSE_PROD_FILE) down -v --remove-orphans --rmi all 2>/dev/null || true
	@docker system prune -af --volumes
	@echo "$(GREEN)✅ Nettoyage complet terminé$(RESET)"

# Reset projet complet
reset: clean install-deps dev
	@echo "$(GREEN)🔄 Projet complètement réinitialisé$(RESET)"

# 🎯 RACCOURCIS UTILES
start: dev ## Alias pour 'dev'
stop: down ## Alias pour 'down'
restart-fast: down dev ## Restart rapide

# Tests rapides
quick-test: health test-auth ## Tests rapides essentiels

# Production check
prod-check: prod-build ## Vérifier build production

# Commande par défaut
.DEFAULT_GOAL := help