# JobbingTrack Makefile - Gestion complète du projet avec build optimisé
# Utilisation: make <target>

.PHONY: help install build build-fast up down restart logs clean test migrate studio seed backup restore

# Variables
DOCKER_COMPOSE = docker-compose
BACKEND_DIR = backend
MOBILE_DIR = mobile

# Couleurs pour l'affichage
GREEN = \033[0;32m
YELLOW = \033[1;33m
RED = \033[0;31m
NC = \033[0m # No Color

## 🚀 COMMANDES PRINCIPALES

help: ## Afficher cette aide
	@echo "$(GREEN)JobbingTrack - Commandes disponibles:$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""

install: ## Installation complète du projet
	@echo "$(GREEN)🚀 Installation de JobbingTrack...$(NC)"
	@if [ ! -f "$(BACKEND_DIR)/package.json" ]; then \
		echo "$(RED)Erreur: package.json non trouvé dans backend/$(NC)"; \
		exit 1; \
	fi
	@echo "$(YELLOW)📦 Installation des dépendances backend...$(NC)"
	@cd $(BACKEND_DIR) && npm install
	@echo "$(GREEN)✅ Installation terminée!$(NC)"

build: ## Construire les images Docker (standard)
	@echo "$(GREEN)🏗️ Construction des images Docker...$(NC)"
	$(DOCKER_COMPOSE) build --no-cache
	@echo "$(GREEN)✅ Build terminé!$(NC)"

build-fast: ## Construction ultra-rapide avec cache optimisé ⚡
	@echo "$(GREEN)⚡ Construction ultra-rapide...$(NC)"
	DOCKER_BUILDKIT=1 $(DOCKER_COMPOSE) build --parallel --pull=false
	@echo "$(GREEN)✅ Build rapide terminé!$(NC)"

build-parallel: ## Construction rapide en parallèle 🚀
	@echo "$(GREEN)🚀 Construction rapide en parallèle...$(NC)"
	DOCKER_BUILDKIT=1 $(DOCKER_COMPOSE) build --parallel
	@echo "$(GREEN)✅ Build parallèle terminé!$(NC)"

up: ## Démarrer tous les services
	@echo "$(GREEN)🚀 Démarrage des services...$(NC)"
	$(DOCKER_COMPOSE) up -d
	@echo "$(GREEN)✅ Services démarrés!$(NC)"
	@echo "$(YELLOW)📊 Services disponibles:$(NC)"
	@echo "  - API: http://localhost:3000"
	@echo "  - Documentation: http://localhost:3000/api-docs"  
	@echo "  - Adminer: http://localhost:8080"
	@echo "  - Health Check: http://localhost:3000/health"

down: ## Arrêter tous les services
	@echo "$(YELLOW)🛑 Arrêt des services...$(NC)"
	$(DOCKER_COMPOSE) down
	@echo "$(GREEN)✅ Services arrêtés!$(NC)"

restart: down up ## Redémarrer tous les services

logs: ## Afficher les logs en temps réel
	$(DOCKER_COMPOSE) logs -f

logs-api: ## Afficher uniquement les logs de l'API
	$(DOCKER_COMPOSE) logs -f api

## 🗄️ GESTION BASE DE DONNÉES

migrate: ## Exécuter les migrations Prisma
	@echo "$(GREEN)🔄 Exécution des migrations...$(NC)"
	$(DOCKER_COMPOSE) exec api npx prisma migrate dev
	@echo "$(GREEN)✅ Migrations terminées!$(NC)"

migrate-reset: ## Reset complet de la base de données
	@echo "$(RED)⚠️  Reset de la base de données...$(NC)"
	@read -p "Êtes-vous sûr? Cette action est irréversible (y/n): " confirm && [ "$$confirm" = "y" ]
	$(DOCKER_COMPOSE) exec api npx prisma migrate reset --force
	@echo "$(GREEN)✅ Base de données resetée!$(NC)"

generate: ## Générer le client Prisma
	@echo "$(GREEN)🔧 Génération du client Prisma...$(NC)"
	$(DOCKER_COMPOSE) exec api npx prisma generate
	@echo "$(GREEN)✅ Client Prisma généré!$(NC)"

studio: ## Ouvrir Prisma Studio
	@echo "$(GREEN)🎨 Ouverture de Prisma Studio...$(NC)"
	@echo "$(YELLOW)Studio disponible sur: http://localhost:5555$(NC)"
	$(DOCKER_COMPOSE) exec api npx prisma studio

seed: ## Peupler la base avec des données de test
	@echo "$(GREEN)🌱 Peuplement de la base de données...$(NC)"
	$(DOCKER_COMPOSE) exec api npm run seed
	@echo "$(GREEN)✅ Base de données peuplée!$(NC)"

## 🧪 TESTS ET QUALITÉ

test: ## Lancer tous les tests
	@echo "$(GREEN)🧪 Exécution des tests...$(NC)"
	$(DOCKER_COMPOSE) exec api npm test

test-watch: ## Lancer les tests en mode watch
	$(DOCKER_COMPOSE) exec api npm run test:watch

test-coverage: ## Lancer les tests avec couverture
	$(DOCKER_COMPOSE) exec api npm run test:coverage

lint: ## Vérifier le code avec ESLint
	$(DOCKER_COMPOSE) exec api npm run lint

lint-fix: ## Corriger automatiquement les erreurs ESLint
	$(DOCKER_COMPOSE) exec api npm run lint:fix

format: ## Formater le code avec Prettier
	$(DOCKER_COMPOSE) exec api npm run format

## 🔧 UTILITAIRES

shell-api: ## Accéder au shell du conteneur API
	$(DOCKER_COMPOSE) exec api sh

shell-db: ## Accéder au shell PostgreSQL
	$(DOCKER_COMPOSE) exec postgres psql -U jobbingtrack -d jobbingtrack

backup: ## Sauvegarder la base de données
	@echo "$(GREEN)💾 Sauvegarde de la base de données...$(NC)"
	@mkdir -p backups
	$(DOCKER_COMPOSE) exec postgres pg_dump -U jobbingtrack jobbingtrack > backups/backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)✅ Sauvegarde terminée dans backups/$(NC)"

restore: ## Restaurer la base de données (usage: make restore FILE=backup.sql)
	@if [ -z "$(FILE)" ]; then \
		echo "$(RED)Erreur: Spécifiez le fichier avec FILE=nom_du_fichier.sql$(NC)"; \
		echo "$(YELLOW)Exemple: make restore FILE=backups/backup_20241026_143022.sql$(NC)"; \
		exit 1; \
	fi
	@echo "$(YELLOW)🔄 Restauration de la base de données...$(NC)"
	$(DOCKER_COMPOSE) exec -T postgres psql -U jobbingtrack -d jobbingtrack < $(FILE)
	@echo "$(GREEN)✅ Restauration terminée!$(NC)"

clean: ## Nettoyer les containers et volumes
	@echo "$(YELLOW)🧹 Nettoyage...$(NC)"
	$(DOCKER_COMPOSE) down -v --remove-orphans
	docker system prune -f
	@echo "$(GREEN)✅ Nettoyage terminé!$(NC)"

clean-all: ## Nettoyage complet (ATTENTION: supprime tout!)
	@echo "$(RED)⚠️  Nettoyage complet...$(NC)"
	@read -p "Êtes-vous sûr? Cette action supprime TOUT (y/n): " confirm && [ "$$confirm" = "y" ]
	$(DOCKER_COMPOSE) down -v --remove-orphans
	docker system prune -af --volumes
	@echo "$(GREEN)✅ Nettoyage complet terminé!$(NC)"

status: ## Afficher le statut des services
	@echo "$(GREEN)📊 Statut des services:$(NC)"
	$(DOCKER_COMPOSE) ps

## 🔍 MONITORING

health: ## Vérifier la santé de l'API
	@echo "$(GREEN)🏥 Vérification de santé...$(NC)"
	@curl -s http://localhost:3000/health | jq '.' || echo "$(RED)API non accessible$(NC)"

endpoints: ## Tester les endpoints principaux
	@echo "$(GREEN)🔗 Test des endpoints...$(NC)"
	@echo "Health Check:"
	@curl -s http://localhost:3000/health | jq '.status' || echo "❌"
	@echo "Documentation:"
	@curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:3000/api-docs

## 📱 MOBILE (à venir)

mobile-install: ## Installer les dépendances mobile
	@if [ -d "$(MOBILE_DIR)" ]; then \
		echo "$(GREEN)📱 Installation mobile...$(NC)"; \
		cd $(MOBILE_DIR) && npm install; \
	else \
		echo "$(YELLOW)📱 Dossier mobile non trouvé$(NC)"; \
	fi

mobile-ios: ## Démarrer l'app iOS
	@if [ -d "$(MOBILE_DIR)" ]; then \
		cd $(MOBILE_DIR) && npm run ios; \
	else \
		echo "$(RED)Dossier mobile non trouvé$(NC)"; \
	fi

mobile-android: ## Démarrer l'app Android
	@if [ -d "$(MOBILE_DIR)" ]; then \
		cd $(MOBILE_DIR) && npm run android; \
	else \
		echo "$(RED)Dossier mobile non trouvé$(NC)"; \
	fi

## 🚀 RACCOURCIS ET WORKFLOWS

dev: build-fast up ## Démarrage rapide pour développement ⚡
	@echo "$(GREEN)🔥 Mode développement activé avec hot reload!$(NC)"

dev-clean: clean build-fast up ## Clean + build rapide + start

rebuild: clean build up ## Rebuild complet (plus lent mais sûr)

rebuild-fast: clean build-fast up ## Rebuild rapide + start ⚡

quick-start: build-parallel up ## Start rapide en parallèle

stop: down ## Alias pour 'down'

restart-fast: down build-fast up ## Restart avec build rapide

## 🎯 WORKFLOWS SPÉCIAUX

full-reset: ## Reset complet: clean + build + migrate + seed
	@echo "$(YELLOW)🔄 Reset complet du projet...$(NC)"
	@$(MAKE) clean
	@$(MAKE) build-fast
	@$(MAKE) up
	@sleep 10
	@$(MAKE) migrate
	@$(MAKE) seed
	@echo "$(GREEN)✅ Reset complet terminé!$(NC)"

demo: ## Préparer une démo avec données de test
	@echo "$(GREEN)🎭 Préparation de la démo...$(NC)"
	@$(MAKE) clean
	@$(MAKE) build-fast
	@$(MAKE) up
	@sleep 10
	@$(MAKE) migrate
	@$(MAKE) seed
	@$(MAKE) health
	@echo "$(GREEN)🎉 Démo prête! API: http://localhost:3000$(NC)"
	@echo "$(GREEN)📚 Doc: http://localhost:3000/api-docs$(NC)"

production-ready: ## Vérifications avant production
	@echo "$(GREEN)🔍 Vérifications de production...$(NC)"
	@$(MAKE) lint
	@$(MAKE) test
	@$(MAKE) health
	@echo "$(GREEN)✅ Prêt pour la production!$(NC)"

# Commande par défaut
.DEFAULT_GOAL := help