# JobbingTrack Makefile - Gestion complète du projet avec build optimisé
# Utilisation: make <target>

.PHONY: help install build build-fast up down restart logs clean test migrate studio seed backup restore

# Variables
DOCKER_COMPOSE = docker-compose
BACKEND_DIR = backend
MOBILE_DIR = mobile


## 🚀 COMMANDES PRINCIPALES

help: ## Afficher cette aide
	@echo "JobbingTrack - Commandes disponibles:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'
	@echo ""

install: ## Installation complète du projet
	@echo "🚀 Installation de JobbingTrack..."
	@if [ ! -f "$(BACKEND_DIR)/package.json" ]; then \
		echo "Erreur: package.json non trouvé dans backend/"; \
		exit 1; \
	fi
	@echo "📦 Installation des dépendances backend..."
	@cd $(BACKEND_DIR) && npm install
	@echo "✅ Installation terminée!"

build: ## Construire les images Docker (standard)
	@echo "🏗️ Construction des images Docker..."
	$(DOCKER_COMPOSE) build --no-cache
	@echo "✅ Build terminé!"

build-fast: ## Construction ultra-rapide avec cache optimisé ⚡
	@echo "⚡ Construction ultra-rapide..."
	DOCKER_BUILDKIT=1 $(DOCKER_COMPOSE) build --parallel --pull=false
	@echo "✅ Build rapide terminé!"

build-parallel: ## Construction rapide en parallèle 🚀
	@echo "🚀 Construction rapide en parallèle..."
	DOCKER_BUILDKIT=1 $(DOCKER_COMPOSE) build --parallel
	@echo "✅ Build parallèle terminé!"

up: ## Démarrer tous les services
	@echo "🚀 Démarrage des services..."
	$(DOCKER_COMPOSE) up -d
	@echo "✅ Services démarrés!"
	@echo "📊 Services disponibles:"
	@echo "  - API: http://localhost:3000"
	@echo "  - Documentation: http://localhost:3000/api-docs"  
	@echo "  - Adminer: http://localhost:8080"
	@echo "  - Health Check: http://localhost:3000/health"

down: ## Arrêter tous les services
	@echo "🛑 Arrêt des services..."
	$(DOCKER_COMPOSE) down
	@echo "✅ Services arrêtés!"

restart: down up ## Redémarrer tous les services

logs: ## Afficher les logs en temps réel
	$(DOCKER_COMPOSE) logs -f

logs-api: ## Afficher uniquement les logs de l'API
	$(DOCKER_COMPOSE) logs -f api

## 🗄️ GESTION BASE DE DONNÉES

migrate: ## Exécuter les migrations Prisma
	@echo "🔄 Exécution des migrations..."
	$(DOCKER_COMPOSE) exec api npx prisma migrate dev
	@echo "✅ Migrations terminées!"

migrate-reset: ## Reset complet de la base de données
	@echo "⚠️  Reset de la base de données..."
	@read -p "Êtes-vous sûr? Cette action est irréversible (y/n): " confirm && [ "$$confirm" = "y" ]
	$(DOCKER_COMPOSE) exec api npx prisma migrate reset --force
	@echo "✅ Base de données resetée!"

generate: ## Générer le client Prisma
	@echo "🔧 Génération du client Prisma..."
	$(DOCKER_COMPOSE) exec api npx prisma generate
	@echo "✅ Client Prisma généré!"

studio: ## Ouvrir Prisma Studio
	@echo "🎨 Ouverture de Prisma Studio..."
	@echo "Studio disponible sur: http://localhost:5555"
	$(DOCKER_COMPOSE) exec api npx prisma studio

seed: ## Peupler la base avec des données de test
	@echo "🌱 Peuplement de la base de données..."
	$(DOCKER_COMPOSE) exec api npm run seed
	@echo "✅ Base de données peuplée!"

## 🧪 TESTS ET QUALITÉ

test: ## Lancer tous les tests
	@echo "🧪 Exécution des tests..."
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
	@echo "💾 Sauvegarde de la base de données..."
	@mkdir -p backups
	$(DOCKER_COMPOSE) exec postgres pg_dump -U jobbingtrack jobbingtrack > backups/backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "✅ Sauvegarde terminée dans backups/"

restore: ## Restaurer la base de données (usage: make restore FILE=backup.sql)
	@if [ -z "$(FILE)" ]; then \
		echo "Erreur: Spécifiez le fichier avec FILE=nom_du_fichier.sql"; \
		echo "Exemple: make restore FILE=backups/backup_20241026_143022.sql"; \
		exit 1; \
	fi
	@echo "🔄 Restauration de la base de données..."
	$(DOCKER_COMPOSE) exec -T postgres psql -U jobbingtrack -d jobbingtrack < $(FILE)
	@echo "✅ Restauration terminée!"

clean: ## Nettoyer les containers et volumes
	@echo "🧹 Nettoyage..."
	$(DOCKER_COMPOSE) down -v --remove-orphans
	docker system prune -f
	@echo "✅ Nettoyage terminé!"

clean-all: ## Nettoyage complet (ATTENTION: supprime tout!)
	@echo "⚠️  Nettoyage complet..."
	@read -p "Êtes-vous sûr? Cette action supprime TOUT (y/n): " confirm && [ "$$confirm" = "y" ]
	$(DOCKER_COMPOSE) down -v --remove-orphans
	docker system prune -af --volumes
	@echo "✅ Nettoyage complet terminé!"

status: ## Afficher le statut des services
	@echo "📊 Statut des services:"
	$(DOCKER_COMPOSE) ps

## 🔍 MONITORING

health: ## Vérifier la santé de l'API
	@echo "🏥 Vérification de santé..."
	@curl -s http://localhost:3000/health | jq '.' || echo "API non accessible"

endpoints: ## Tester les endpoints principaux
	@echo "🔗 Test des endpoints..."
	@echo "Health Check:"
	@curl -s http://localhost:3000/health | jq '.status' || echo "❌"
	@echo "Documentation:"
	@curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:3000/api-docs

## 📱 MOBILE (à venir)

mobile-install: ## Installer les dépendances mobile
	@if [ -d "$(MOBILE_DIR)" ]; then \
		echo "📱 Installation mobile..."; \
		cd $(MOBILE_DIR) && npm install; \
	else \
		echo "📱 Dossier mobile non trouvé"; \
	fi

mobile-ios: ## Démarrer l'app iOS
	@if [ -d "$(MOBILE_DIR)" ]; then \
		cd $(MOBILE_DIR) && npm run ios; \
	else \
		echo "Dossier mobile non trouvé"; \
	fi

mobile-android: ## Démarrer l'app Android
	@if [ -d "$(MOBILE_DIR)" ]; then \
		cd $(MOBILE_DIR) && npm run android; \
	else \
		echo "Dossier mobile non trouvé"; \
	fi

## 🚀 RACCOURCIS ET WORKFLOWS

dev: build-fast up ## Démarrage rapide pour développement ⚡
	@echo "🔥 Mode développement activé avec hot reload!"

dev-clean: clean build-fast up ## Clean + build rapide + start

rebuild: clean build up ## Rebuild complet (plus lent mais sûr)

rebuild-fast: clean build-fast up ## Rebuild rapide + start ⚡

quick-start: build-parallel up ## Start rapide en parallèle

stop: down ## Alias pour 'down'

restart-fast: down build-fast up ## Restart avec build rapide

## 🎯 WORKFLOWS SPÉCIAUX

full-reset: ## Reset complet: clean + build + migrate + seed
	@echo "🔄 Reset complet du projet..."
	@$(MAKE) clean
	@$(MAKE) build-fast
	@$(MAKE) up
	@sleep 10
	@$(MAKE) migrate
	@$(MAKE) seed
	@echo "✅ Reset complet terminé!"

demo: ## Préparer une démo avec données de test
	@echo "🎭 Préparation de la démo..."
	@$(MAKE) clean
	@$(MAKE) build-fast
	@$(MAKE) up
	@sleep 10
	@$(MAKE) migrate
	@$(MAKE) seed
	@$(MAKE) health
	@echo "🎉 Démo prête! API: http://localhost:3000"
	@echo "📚 Doc: http://localhost:3000/api-docs"

production-ready: ## Vérifications avant production
	@echo "🔍 Vérifications de production..."
	@$(MAKE) lint
	@$(MAKE) test
	@$(MAKE) health
	@echo "✅ Prêt pour la production!"

# Commande par défaut
.DEFAULT_GOAL := help