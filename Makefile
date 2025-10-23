# ============================================================================
# Makefile Principal - JobbingTrack
# ============================================================================
# Ce Makefile orchestre tous les sous-Makefiles du projet
# ============================================================================

# Inclure les fonctions et variables communes
include makefiles/shared/common.mk

# ============================================================================
# CONFIGURATION
# ============================================================================

# Variables de configuration
BACKEND_DIR = backend
FRONTEND_DIR = frontend
SCRIPTS_DIR = scripts
TESTS_DIR = tests

.PHONY: help build build-system frontend-rebuild up down clean dev test migrate logs status install setup metrics-start metrics-test metrics-stop docker-exec test-socket fix-webpack verify-services start-simple-metrics

# ============================================================================
# COMMANDE PAR DÉFAUT - Affiche l'aide
# ============================================================================

# La commande par défaut affiche l'aide
.DEFAULT_GOAL := help

# ============================================================================
# COMMANDES PRINCIPALES
# ============================================================================

# Démarrage et arrêt
.PHONY: up down up-full restart up-profile

# Démarrer tous les services essentiels
up: ## Démarrer services essentiels uniquement (postgres, redis, api-gateway, frontend, auth-service, dashboard-service)
	@echo "🚀 Démarrage des services essentiels JobbingTrack..."
	@echo "📦 Services: postgres, redis, api-gateway, frontend, auth-service, dashboard-service"
	$(call check_docker)
	$(call docker_compose, $(COMPOSE_FILES) up -d postgres redis api-gateway frontend auth-service dashboard-service)
	@echo ""
	@echo "✅ Services essentiels démarrés avec succès !"
	@echo ""
	@echo "🌐 Interfaces disponibles :"
	@echo "   Frontend:           http://localhost:8080"
	@echo "   API Gateway:        http://localhost:3000"
	@echo "   Auth Service:       http://localhost:3001"
	@echo "   Dashboard Service:  http://localhost:3007"
	@echo ""
	@echo "🔑 Identifiants de connexion :"
	@echo "   Email:    admin@jobbingtrack.test"
	@echo "   Password: SuperAdmin123!"
	@echo ""
	@echo "💡 Utilisez 'make up-full' pour démarrer tous les services"

# Démarrer tous les services avec tous les profils
up-full: ## Démarrer TOUS les services avec tous les profils
	@echo "🚀 Démarrage complet de JobbingTrack..."
	@echo "📦 Tous les services avec métriques complètes"
	$(call check_docker)
	# Démarrer d'abord les services essentiels
	$(call docker_compose, $(COMPOSE_FILES) up -d postgres redis api-gateway frontend auth-service dashboard-service)
	# Puis les services optionnels avec profils
	$(call docker_compose, $(COMPOSE_FILES) --profile applications up -d)
	$(call docker_compose, $(COMPOSE_FILES) --profile companies up -d)
	$(call docker_compose, $(COMPOSE_FILES) --profile contacts up -d)
	$(call docker_compose, $(COMPOSE_FILES) --profile interviews up -d)
	$(call docker_compose, $(COMPOSE_FILES) --profile notifications up -d)
	$(call docker_compose, $(COMPOSE_FILES) --profile calls up -d)
	$(call docker_compose, $(COMPOSE_FILES) --profile profiles up -d)
	$(call docker_compose, $(COMPOSE_FILES) --profile events up -d)
	$(call docker_compose, $(COMPOSE_FILES) --profile followups up -d)
	$(call docker_compose, $(COMPOSE_FILES) --profile workflows up -d)
	$(call docker_compose, $(COMPOSE_FILES) --profile monitoring up -d)
	@echo ""
	@echo "✅ Système complet démarré avec succès !"
	@echo ""
	@echo "🌐 Toutes les interfaces sont disponibles"
	@echo "📊 Monitoring: Prometheus (9090), Grafana (4000), cAdvisor (8080)"

# Arrêter tous les services
down: ## Arrêter tous les services
	@echo "🛑 Arrêt de tous les services JobbingTrack..."
	$(call docker_compose, $(COMPOSE_FILES) down)
	@echo "✅ Tous les services arrêtés"

# Redémarrer tous les services
restart: ## Redémarrer tous les services
	@echo "🔄 Redémarrage complet de JobbingTrack..."
	$(MAKE) down
	$(MAKE) up-full
	@echo "✅ Système redémarré"

# Démarrer un profil spécifique
up-profile: ## Démarrer un profil spécifique (PROFILE=nom)
	@if [ -z "$(PROFILE)" ]; then \
		echo "❌ Spécifiez le profil avec PROFILE=<nom>"; \
		echo "💡 Exemples:"; \
		echo "   make up-profile PROFILE=auth         # Service d'authentification"; \
		echo "   make up-profile PROFILE=applications # Gestion des candidatures"; \
		echo "   make up-profile PROFILE=monitoring   # Métriques complètes"; \
		echo "   make up-profile PROFILE=full         # Tous les services"; \
		exit 1; \
	fi
	@echo "🚀 Démarrage du profil: $(PROFILE)"
	$(call check_docker)
	$(call docker_compose, $(COMPOSE_FILES) --profile $(PROFILE) up -d)
	@echo "✅ Profil $(PROFILE) démarré"

# ============================================================================
# GESTION INDIVIDUELLE DES SERVICES
# ============================================================================

.PHONY: start-auth start-applications stop-service restart-service logs-service

# Démarrer le service d'authentification
start-auth: ## Démarrer le service d'authentification
	@echo "🚀 Démarrage du service d'authentification..."
	$(call check_docker)
	$(call docker_compose, $(COMPOSE_FILES) --profile auth up -d)
	@echo "✅ Service d'authentification démarré"

# Démarrer le service d'applications
start-applications: ## Démarrer le service d'applications
	@echo "🚀 Démarrage du service d'applications..."
	$(call check_docker)
	$(call docker_compose, $(COMPOSE_FILES) --profile applications up -d)
	@echo "✅ Service d'applications démarré"

# Arrêter un service spécifique
stop-service: ## Arrêter un service spécifique (SERVICE=nom)
	@if [ -z "$(SERVICE)" ]; then \
		echo "❌ Spécifiez le service avec SERVICE=<nom>"; \
		echo "💡 Exemple: make stop-service SERVICE=api-gateway"; \
		exit 1; \
	fi
	@echo "🛑 Arrêt du service: $(SERVICE)"
	$(call docker_compose, $(COMPOSE_FILES) stop $(SERVICE))
	@echo "✅ Service $(SERVICE) arrêté"

# Redémarrer un service spécifique
restart-service: ## Redémarrer un service spécifique (SERVICE=nom)
	@if [ -z "$(SERVICE)" ]; then \
		echo "❌ Spécifiez le service avec SERVICE=<nom>"; \
		echo "💡 Exemple: make restart-service SERVICE=api-gateway"; \
		exit 1; \
	fi
	@echo "🔄 Redémarrage du service: $(SERVICE)"
	$(call docker_compose, $(COMPOSE_FILES) restart $(SERVICE))
	@echo "✅ Service $(SERVICE) redémarré"

# Voir les logs d'un service spécifique
logs-service: ## Voir les logs d'un service spécifique (SERVICE=nom)
	@if [ -z "$(SERVICE)" ]; then \
		echo "❌ Spécifiez le service avec SERVICE=<nom>"; \
		echo "💡 Exemple: make logs-service SERVICE=api-gateway"; \
		exit 1; \
	fi
	$(call docker_compose, $(COMPOSE_FILES) logs -f $(SERVICE))

# ============================================================================
# DIAGNOSTICS ET VÉRIFICATION
# ============================================================================

.PHONY: status logs health ps

# Statut détaillé de chaque service
status: ## Statut détaillé de chaque service
	@echo "📊 Statut détaillé des services JobbingTrack"
	@echo "=========================================="
	@echo ""
	@echo "🔴 Services essentiels:"
	@docker ps --filter "name=jobbingtrack-postgres\|jobbingtrack-redis\|jobbingtrack-api-gateway\|jobbingtrack-frontend" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "  Aucun service essentiel en cours d'exécution"
	@echo ""
	@echo "🟡 Services optionnels:"
	@docker ps --filter "name=jobbingtrack-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -v "postgres\|redis\|api-gateway\|frontend" 2>/dev/null || echo "  Aucun service optionnel en cours d'exécution"

# Liste des conteneurs actifs
ps: ## Liste les conteneurs actifs
	@echo "📋 Conteneurs actifs JobbingTrack"
	@echo "================================"
	$(call docker_compose, $(COMPOSE_FILES) ps)

# Logs en temps réel de tous les services
logs: ## Affiche tous les logs en temps réel
	@echo "📜 Logs en temps réel de tous les services"
	@echo "========================================"
	$(call docker_compose, $(COMPOSE_FILES) logs -f)

# Vérification de santé complète
health: ## Vérifie la santé de tous les services
	@echo "🔍 Vérification complète de la santé du système"
	@echo "=============================================="
	./scripts/core/check.sh --detailed

# ============================================================================
# BASE DE DONNÉES
# ============================================================================

.PHONY: db-migrate db-seed db-reset db-backup db-restore

# Migrations de base de données
db-migrate: ## Appliquer les migrations de base de données
	@echo "🗄️ Application des migrations..."
	@echo "⚠️ Les migrations ne sont pas encore implémentées"
	@echo "💡 Cette commande sera implémentée avec Prisma ou un outil de migration"

# Seed de données de test
db-seed: ## Insérer des données de test
	@echo "🌱 Insertion de données de test..."
	./scripts/db/seed.sh

# Reset complet de la base de données
db-reset: ## Reset complet de la DB
	@echo "🔄 Reset complet de la base de données..."
	$(call docker_compose, $(COMPOSE_FILES) exec postgres psql -U jobbingtrack -d jobbingtrack -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
	@echo "✅ Base de données réinitialisée"
	@echo "💡 Relancez 'make db-seed' pour recréer les données"

# Sauvegarde de la base de données
db-backup: ## Créer une sauvegarde de la DB
	@echo "💾 Création d'une sauvegarde..."
	./scripts/db/backup.sh

# Restauration de la base de données
db-restore: ## Restaurer depuis un fichier (file=nom_du_fichier.sql)
	@if [ -z "$(file)" ]; then \
		echo "❌ Spécifiez le fichier avec file=<nom_du_fichier.sql>"; \
		echo "💡 Exemple: make db-restore file=backup_20231001.sql"; \
		exit 1; \
	fi
	@echo "📥 Restauration depuis $(file)..."
	$(call docker_compose, $(COMPOSE_FILES) exec -T postgres psql -U jobbingtrack -d jobbingtrack < $(file))
	@echo "✅ Base de données restaurée"

# ============================================================================
# BUILD ET DÉVELOPPEMENT
# ============================================================================

.PHONY: build rebuild clean

# Build de tous les services
build: ## Build tous les services
	@echo "🔨 Build de tous les services..."
	$(call check_docker)
	$(call docker_compose, $(COMPOSE_FILES) build)
	@echo "✅ Tous les services construits"

# Rebuild sans cache
rebuild: ## Rebuild sans cache
	@echo "🔨 Rebuild complet sans cache..."
	$(call check_docker)
	$(call docker_compose, $(COMPOSE_FILES) build --no-cache)
	@echo "✅ Rebuild terminé"

# Nettoyage complet
clean: ## Nettoyage complet
	@echo "🧹 Nettoyage complet..."
	$(call docker_compose, $(COMPOSE_FILES) down -v --remove-orphans)
	docker system prune -f
	@echo "✅ Nettoyage terminé"

# ============================================================================
# TESTS
# ============================================================================

.PHONY: test test-integration

# Lancer tous les tests
test: ## Lancer tous les tests
	@echo "🧪 Exécution de tous les tests..."
	./scripts/testing/run-tests.sh --all

# Tests d'intégration
test-integration: ## Tests d'intégration
	@echo "🔗 Tests d'intégration..."
	./scripts/testing/run-tests.sh --integration

# ============================================================================
# MONITORING
# ============================================================================

.PHONY: metrics cadvisor logs-metrics

# Ouvrir Prometheus
metrics: ## Ouvrir Prometheus
	@echo "📈 Ouverture de Prometheus..."
	@echo "🌐 URL: http://localhost:9090"
	@if command -v xdg-open &> /dev/null; then \
		xdg-open http://localhost:9090 2>/dev/null & \
	else \
		echo "💡 Ouvrez votre navigateur à l'adresse ci-dessus"; \
	fi

# Ouvrir cAdvisor
cadvisor: ## Ouvrir cAdvisor
	@echo "📊 Ouverture de cAdvisor..."
	@echo "🌐 URL: http://localhost:8080"
	@if command -v xdg-open &> /dev/null; then \
		xdg-open http://localhost:8080 2>/dev/null & \
	else \
		echo "💡 Ouvrez votre navigateur à l'adresse ci-dessus"; \
	fi

# Logs du système de métriques
logs-metrics: ## Logs du système de métriques
	@echo "📜 Logs du système de métriques..."
	$(call docker_compose, $(COMPOSE_FILES) logs -f metrics-aggregator)

# Aide complète avec organisation par catégories
help: ## Afficher l'aide organisée par catégories
	@echo "================================================================"
	@echo "🚀 JOBBINGTRACK - PLATEFORME DE GESTION DE CANDIDATURES"
	@echo "================================================================"
	@echo ""
	@echo "📦 DEMARRAGE RAPIDE:"
	@echo "  make up              - Démarrer services essentiels uniquement"
	@echo "  make up-full         - Démarrer TOUS les services"
	@echo "  make down            - Arrêter tous les services"
	@echo "  make restart         - Redémarrer tous les services"
	@echo ""
	@echo "🔧 GESTION INDIVIDUELLE:"
	@echo "  make start-auth      - Démarrer le service d'authentification"
	@echo "  make start-applications - Démarrer le service d'applications"
	@echo "  make stop-service SERVICE=nom - Arrêter un service spécifique"
	@echo "  make restart-service SERVICE=nom - Redémarrer un service"
	@echo "  make logs-service SERVICE=nom - Voir les logs d'un service"
	@echo ""
	@echo "📊 PROFILES ET PROFILS:"
	@echo "  make up-profile PROFILE=auth - Démarrer un profil spécifique"
	@echo "  make up-profile PROFILE=monitoring - Démarrer les métriques"
	@echo "  make up-profile PROFILE=full - Démarrer tous les services"
	@echo ""
	@echo "🔍 DIAGNOSTICS:"
	@echo "  make health          - Vérifier la santé de tous les services"
	@echo "  make ps             - Lister les conteneurs actifs"
	@echo "  make logs           - Afficher tous les logs"
	@echo "  make status         - Statut détaillé de chaque service"
	@echo ""
	@echo "🗄️ BASE DE DONNÉES:"
	@echo "  make db-migrate     - Migrations de base de données"
	@echo "  make db-seed        - Insérer des données de test"
	@echo "  make db-reset       - Reset complet de la DB"
	@echo "  make db-backup      - Sauvegarde de la DB"
	@echo "  make db-restore     - Restauration de la DB"
	@echo ""
	@echo "🔨 BUILD ET DÉVELOPPEMENT:"
	@echo "  make build          - Build tous les services"
	@echo "  make rebuild        - Rebuild sans cache"
	@echo "  make clean          - Nettoyage complet"
	@echo ""
	@echo "🧪 TESTS:"
	@echo "  make test           - Lancer tous les tests"
	@echo "  make test-integration - Tests d'intégration"
	@echo ""
	@echo "📈 MONITORING:"
	@echo "  make metrics        - Ouvrir Prometheus"
	@echo "  make cadvisor       - Ouvrir cAdvisor"
	@echo "  make logs-metrics   - Logs du système de métriques"
	@echo ""
	@echo "📚 AIDE DÉTAILLÉE:"
	@echo "  make help-up        - Aide détaillée pour 'make up'"
	@echo "  make help-status    - Aide détaillée pour 'make status'"
	@echo "  make help-logs      - Aide détaillée pour 'make logs'"
	@echo "  make help-*         - Aide pour n'importe quelle commande"
	@echo ""
	@echo "💡 ASTUCES:"
	@echo "  • Utilisez 'make help-<commande>' pour l'aide détaillée d'une commande"
	@echo "  • Ex: 'make help-health' pour l'aide de la commande health"
	@echo "  • Toutes les commandes supportent les variables d'environnement"
