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

.PHONY: help build build-system frontend-rebuild up down clean dev test migrate logs status install setup metrics-start metrics-test metrics-stop docker-exec test-socket fix-webpack verify-services start-simple-metrics clean-docker-cache show-docker-info

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
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) up -d postgres redis api-gateway frontend auth-service dashboard-service)
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
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) up -d postgres redis api-gateway frontend auth-service dashboard-service)
	# Puis les services optionnels avec profils
	$(call docker_compose, $(COMPOSE_FILES_FULL) --profile applications up -d)
	$(call docker_compose, $(COMPOSE_FILES_FULL) --profile companies up -d)
	$(call docker_compose, $(COMPOSE_FILES_FULL) --profile contacts up -d)
	$(call docker_compose, $(COMPOSE_FILES_FULL) --profile interviews up -d)
	$(call docker_compose, $(COMPOSE_FILES_FULL) --profile notifications up -d)
	$(call docker_compose, $(COMPOSE_FILES_FULL) --profile calls up -d)
	$(call docker_compose, $(COMPOSE_FILES_FULL) --profile profiles up -d)
	$(call docker_compose, $(COMPOSE_FILES_FULL) --profile events up -d)
	$(call docker_compose, $(COMPOSE_FILES_FULL) --profile followups up -d)
	$(call docker_compose, $(COMPOSE_FILES_FULL) --profile workflows up -d)
	$(call docker_compose, $(COMPOSE_FILES_FULL) --profile monitoring up -d)
	@echo ""
	@echo "✅ Système complet démarré avec succès !"
	@echo ""
	@echo "🌐 Toutes les interfaces sont disponibles"
	@echo "📊 Monitoring: Prometheus (9090), Grafana (4000), cAdvisor (8080)"

# Arrêter tous les services
down: ## Arrêter tous les services
	@echo "🛑 Arrêt de tous les services JobbingTrack..."
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) down)
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
	$(call docker_compose, $(COMPOSE_FILES_FULL) --profile $(PROFILE) up -d)
	@echo "✅ Profil $(PROFILE) démarré"

# ============================================================================
# GESTION INDIVIDUELLE DES SERVICES
# ============================================================================

.PHONY: start-auth start-applications stop-service restart-service logs-service

# Démarrer le service d'authentification
start-auth: ## Démarrer le service d'authentification
	@echo "🚀 Démarrage du service d'authentification..."
	$(call check_docker)
	$(call docker_compose, $(COMPOSE_FILES_FULL) --profile auth up -d)
	@echo "✅ Service d'authentification démarré"

# Démarrer le service d'applications
start-applications: ## Démarrer le service d'applications
	@echo "🚀 Démarrage du service d'applications..."
	$(call check_docker)
	$(call docker_compose, $(COMPOSE_FILES_FULL) --profile applications up -d)
	@echo "✅ Service d'applications démarré"

# Arrêter un service spécifique
stop-service: ## Arrêter un service spécifique (SERVICE=nom)
	@if [ -z "$(SERVICE)" ]; then \
		echo "❌ Spécifiez le service avec SERVICE=<nom>"; \
		echo "💡 Exemple: make stop-service SERVICE=api-gateway"; \
		exit 1; \
	fi
	@echo "🛑 Arrêt du service: $(SERVICE)"
	$(call docker_compose, $(COMPOSE_FILES_FULL) stop $(SERVICE))
	@echo "✅ Service $(SERVICE) arrêté"

# Redémarrer un service spécifique
restart-service: ## Redémarrer un service spécifique (SERVICE=nom)
	@if [ -z "$(SERVICE)" ]; then \
		echo "❌ Spécifiez le service avec SERVICE=<nom>"; \
		echo "💡 Exemple: make restart-service SERVICE=api-gateway"; \
		exit 1; \
	fi
	@echo "🔄 Redémarrage du service: $(SERVICE)"
	$(call docker_compose, $(COMPOSE_FILES_FULL) restart $(SERVICE))
	@echo "✅ Service $(SERVICE) redémarré"

# Voir les logs d'un service spécifique
logs-service: ## Voir les logs d'un service spécifique (SERVICE=nom)
	@if [ -z "$(SERVICE)" ]; then \
		echo "❌ Spécifiez le service avec SERVICE=<nom>"; \
		echo "💡 Exemple: make logs-service SERVICE=api-gateway"; \
		exit 1; \
	fi
	$(call docker_compose, $(COMPOSE_FILES_FULL) logs -f $(SERVICE))

# ============================================================================
# DIAGNOSTICS ET VÉRIFICATION
# ============================================================================

.PHONY: status logs health ps show-docker-info clean-docker-cache check-deps

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
	$(call docker_compose, $(COMPOSE_FILES_FULL) ps)

# Logs en temps réel de tous les services
logs: ## Affiche tous les logs en temps réel
	@echo "📜 Logs en temps réel de tous les services"
	@echo "========================================"
	$(call docker_compose, $(COMPOSE_FILES_FULL) logs -f)

# Vérification de santé complète
health: ## Vérifie la santé de tous les services
	@echo "🔍 Vérification complète de la santé du système"
	@echo "=============================================="
	./scripts/core/check.sh --detailed

# Nettoie le cache Docker Compose (force redétection)
clean-docker-cache: ## Nettoie le cache Docker Compose et force une redétection
	@echo "🧹 Nettoyage du cache Docker Compose..."
	$(call clean_docker_compose_cache)
	@echo "✅ Cache nettoyé - redétection au prochain appel"

# Affiche les informations Docker détectées
show-docker-info: ## Affiche les informations Docker et Docker Compose détectées
	@echo "🐳 Informations Docker détectées"
	@echo "================================"
	@echo "Commande Docker Compose: $(DOCKER_COMPOSE_CMD)"
	@if [ -f "/tmp/jobbingtrack_docker_compose_cache" ]; then \
		echo "Cache: $(shell cat /tmp/jobbingtrack_docker_compose_cache)"; \
	else \
		echo "Cache: Aucun"; \
	fi
	@echo ""
	@echo "📊 Test des commandes:"
	@if command -v docker &>/dev/null; then \
		echo "✅ docker: $(shell docker --version | head -1)"; \
	else \
		echo "❌ docker: Non installé"; \
	fi
	@if command -v docker-compose &>/dev/null && docker-compose version &>/dev/null 2>&1; then \
		echo "✅ docker-compose: $(shell docker-compose --version)"; \
	else \
		echo "❌ docker-compose: Non fonctionnel"; \
	fi
	@if docker compose version &>/dev/null 2>&1; then \
		echo "✅ docker compose: Plugin disponible"; \
	else \
		echo "❌ docker compose: Non disponible"; \
	fi

# Vérification complète des dépendances
check-deps: ## Vérifier que toutes les dépendances sont installées
	@echo "🔍 Vérification des dépendances..."
	@echo "🐳 Vérification de Docker..."
	@if ! command -v docker &> /dev/null; then \
		echo "❌ Docker n'est pas installé ou pas dans le PATH"; \
		echo "💡 Installez Docker: https://docs.docker.com/get-docker/"; \
		exit 1; \
	fi
	@echo "✅ Docker trouvé: $$(docker --version)"
	@echo "🐳 Vérification de Docker Compose..."
	@if command -v docker-compose &> /dev/null && docker-compose version &> /dev/null 2>&1; then \
		echo "✅ docker-compose standalone: $$(docker-compose --version)"; \
	elif docker compose version &> /dev/null 2>&1; then \
		echo "✅ docker compose plugin: $$(docker compose version)"; \
	elif [ -x "/usr/bin/docker-compose" ] && /usr/bin/docker-compose version &> /dev/null 2>&1; then \
		echo "✅ docker-compose dans /usr/bin: $$(/usr/bin/docker-compose --version)"; \
	elif [ -x "/usr/local/bin/docker-compose" ] && /usr/local/bin/docker-compose version &> /dev/null 2>&1; then \
		echo "✅ docker-compose dans /usr/local/bin: $$(/usr/local/bin/docker-compose --version)"; \
	else \
		echo "❌ Docker Compose n'est pas disponible"; \
		echo ""; \
		echo "💡 Installation recommandée :"; \
		echo ""; \
		echo "📦 Option 1 - Installation standalone :"; \
		echo "   sudo curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$$(uname -s)-\$$(uname -m)\" -o /usr/local/bin/docker-compose"; \
		echo "   sudo chmod +x /usr/local/bin/docker-compose"; \
		echo ""; \
		echo "📦 Option 2 - Installation via package manager :"; \
		echo "   # Ubuntu/Debian:"; \
		echo "   sudo apt-get update"; \
		echo "   sudo apt-get install docker-compose-plugin"; \
		echo ""; \
		echo "   # CentOS/RHEL/Fedora:"; \
		echo "   sudo dnf install docker-compose"; \
		echo ""; \
		echo "📦 Option 3 - Utiliser Docker Desktop (recommandé):"; \
		echo "   https://docs.docker.com/desktop/"; \
		echo ""; \
		echo "🔄 Après installation, relancez la commande"; \
		exit 1; \
	fi
	@echo "✅ Toutes les dépendances sont installées"

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
	$(call docker_compose, $(COMPOSE_FILES_FULL) exec postgres psql -U jobbingtrack -d jobbingtrack -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
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
	$(call docker_compose, $(COMPOSE_FILES_FULL) exec -T postgres psql -U jobbingtrack -d jobbingtrack < $(file))
	@echo "✅ Base de données restaurée"

# ============================================================================
# BUILD ET DÉVELOPPEMENT
# ============================================================================

.PHONY: build rebuild clean

# Build de tous les services
build: ## Build tous les services
	@echo "🔨 Build de tous les services..."
	$(call check_docker)
	$(call docker_compose, $(COMPOSE_FILES_FULL) build)
	@echo "✅ Tous les services construits"

# Rebuild sans cache
rebuild: ## Rebuild sans cache
	@echo "🔨 Rebuild complet sans cache..."
	$(call check_docker)
	$(call docker_compose, $(COMPOSE_FILES_FULL) build --no-cache)
	@echo "✅ Rebuild terminé"

# Nettoyage complet
clean: ## Nettoyage complet
	@echo "🧹 Nettoyage complet..."
	$(call docker_compose, $(COMPOSE_FILES_FULL) down -v --remove-orphans)
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
	$(call docker_compose, $(COMPOSE_FILES_FULL) logs -f metrics-aggregator)

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
	@echo "  make show-docker-info - Informations Docker/Docker Compose détectées"
	@echo "  make clean-docker-cache - Nettoyer le cache Docker Compose"
	@echo "  make check-deps     - Vérifier que toutes les dépendances sont installées"
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
