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

.PHONY: help build build-system frontend-rebuild up down up-no-check up-mickdevil clean dev test migrate logs status install setup metrics-start metrics-test metrics-stop docker-exec test-socket fix-webpack verify-services start-simple-metrics clean-docker-cache show-docker-info diagnostic diagnostic-docker diagnostic-docker-compose diagnostic-cors diagnostic-network diagnostic-fix docker-compose-fix diag-services

# ============================================================================
# COMMANDE PAR DÉFAUT - Affiche l'aide
# ============================================================================

# La commande par défaut affiche l'aide
.DEFAULT_GOAL := help

# ============================================================================
# COMMANDES PRINCIPALES
# ============================================================================

# Démarrage et arrêt
.PHONY: up down up-full up-no-check up-mickdevil restart up-profile

# Démarrer tous les services essentiels
up: ## Démarrer services essentiels uniquement (postgres, redis, api-gateway, frontend, auth-service, dashboard-service, jobbingtrack-metrics-aggregator)
	@echo "🚀 Démarrage des services essentiels JobbingTrack..."
	@echo "📦 Services: postgres, redis, api-gateway, frontend, auth-service, dashboard-service, jobbingtrack-metrics-aggregator"
	$(call check_docker)
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) up -d postgres redis api-gateway frontend auth-service dashboard-service jobbingtrack-metrics-aggregator cadvisor)
	@echo ""
	@echo "✅ Services essentiels démarrés avec succès !"
	@echo ""
	@echo "🌐 Interfaces disponibles :"
	@echo "   Frontend:           http://localhost:8080"
	@echo "   API Gateway:        http://localhost:3000"
	@echo "   Auth Service:       http://localhost:3001"
	@echo "   Dashboard Service:  http://localhost:3007"
	@echo "   JobbingTrack Metrics:    http://localhost:3014"
	@echo "   cAdvisor:           http://localhost:8081"
	@echo ""
	@echo "🔑 Identifiants de connexion :"
	@echo "   Email:    ${ADMIN_EMAIL:-admin@jobbingtrack.test}"
	@echo "   Password: ${ADMIN_PASSWORD:-password123}"
	@echo ""
	@echo "💡 Utilisez 'make up-full' pour démarrer tous les services"

# Démarrer services essentiels SANS vérification Docker (mode officiel)
up-no-check: ## Démarrer services essentiels SANS vérification Docker (solution de contournement)
	@echo "🚀 Démarrage des services essentiels JobbingTrack (mode NO-CHECK - SANS vérification Docker)..."
	@echo "📦 Services: postgres, redis, api-gateway, frontend, auth-service, dashboard-service, jobbingtrack-metrics-aggregator, cadvisor"
	@echo "⚠️ ATTENTION: Vérifications Docker ignorées - Utilisez si les checks normaux échouent"
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) up -d postgres redis api-gateway frontend auth-service dashboard-service jobbingtrack-metrics-aggregator cadvisor)
	@echo ""
	@echo "✅ Services essentiels démarrés avec succès (mode NO-CHECK)!"
	@echo ""
	@echo "🌐 Interfaces disponibles :"
	@echo "   Frontend:           http://localhost:8080"
	@echo "   API Gateway:        http://localhost:3000"
	@echo "   Auth Service:       http://localhost:3001"
	@echo "   Dashboard Service:  http://localhost:3007"
	@echo "   JobbingTrack Metrics:    http://localhost:3014"
	@echo "   cAdvisor:           http://localhost:8081"
	@echo ""
	@echo "🔑 Identifiants de connexion :"
	@echo "   Email:    ${ADMIN_EMAIL:-admin@jobbingtrack.test}"
	@echo "   Password: ${ADMIN_PASSWORD:-password123}"
	@echo ""
	@echo "💡 Utilisez 'make up-full' pour démarrer tous les services"
	@echo "💡 Utilisez 'make up' normal si les vérifications Docker fonctionnent"

# Démarrer services essentiels SANS vérification Docker (alias MickDevil pour rigoler)
up-mickdevil: up-no-check ## Alias MickDevil de up-no-check (pour rigoler)
	@echo ""
	@echo "😄 MickDevil approuve cette commande !"

# Démarrer tous les services avec tous les profils
up-full: ## Démarrer TOUS les services avec tous les profils
	@echo "🚀 Démarrage complet de JobbingTrack..."
	@echo "📦 Tous les services avec métriques complètes"
	$(call check_docker)
	# Démarrer d'abord les services essentiels (sans backend services qui causent des conflits)
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) up -d postgres redis cadvisor prometheus jobbingtrack-metrics-aggregator)
	# Attendre que les services de base soient prêts
	@echo "⏳ Attente des services de base..."
	@sleep 5
	# Démarrer les services frontend et API
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) up -d api-gateway frontend auth-service dashboard-service)
	# Attendre que les services API soient prêts
	@echo "⏳ Attente des services API..."
	@sleep 10
	# Puis les services métier avec profils (démarrage séquentiel pour éviter les conflits)
	$(call docker_compose, $(COMPOSE_FILES_FULL) --profile auth up -d)
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
	@echo "🌐 Interfaces disponibles :"
	@echo "   Frontend:           http://localhost:8080"
	@echo "   API Gateway:        http://localhost:3000"
	@echo "   Prometheus:         http://localhost:9090"
	@echo "   cAdvisor:           http://localhost:8081"
	@echo "   JobbingTrack Metrics:    http://localhost:3014"

# Arrêter tous les services
down: ## Arrêter tous les services
	@echo "🛑 Arrêt de tous les services JobbingTrack..."
	$(call docker_compose, $(COMPOSE_FILES_FULL) down --remove-orphans --volumes)
	# Arrêter tous les conteneurs JobbingTrack restants
	@docker ps -q --filter "name=jobbingtrack-*" | xargs -r docker stop || true
	@docker ps -aq --filter "name=jobbingtrack-*" | xargs -r docker rm || true
	# Nettoyer les réseaux orphelins qui peuvent causer des conflits
	@docker network prune -f || true
	@echo "✅ Tous les services arrêtés"

# Redémarrer tous les services
restart: ## Redémarrer tous les services
	@echo "🔄 Redémarrage complet de JobbingTrack..."
	$(MAKE) down
	@echo "⏳ Attente de 3 secondes pour s'assurer que tout est bien arrêté..."
	@sleep 3
	$(MAKE) up-full
	@echo "✅ Système redémarré"

# Redémarrer avec nettoyage forcé (si le restart normal échoue)
restart-force: ## Redémarrer avec nettoyage forcé de tous les conteneurs et réseaux
	@echo "🚨 REDÉMARRAGE FORCÉ - Nettoyage complet avant redémarrage"
	$(MAKE) clean-force
	@echo "⏳ Attente de 5 secondes après nettoyage complet..."
	@sleep 5
	$(MAKE) up-full
	@echo "✅ Système redémarré après nettoyage forcé"

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

.PHONY: status logs health ps show-docker-info clean-docker-cache check-deps cors-fix cors-fix-auto diagnostic diagnostic-docker diagnostic-docker-compose diagnostic-cors diagnostic-network diagnostic-fix docker-compose-fix diag-services

# Statut détaillé de chaque service
status: ## Statut détaillé de chaque service
	@echo "📊 Statut détaillé des services JobbingTrack"
	@echo "=========================================="
	@echo ""
	@echo "🔴 Services essentiels:"
	@docker ps --filter "name=jobbingtrack-*" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null | grep -E "postgres|redis|api-gateway|frontend|auth-service|dashboard-service" || echo "  Aucun service essentiel en cours d'exécution"
	@echo ""
	@echo "🟡 Services optionnels:"
	@docker ps --filter "name=jobbingtrack-*" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null | grep -v -E "postgres|redis|api-gateway|frontend|auth-service|dashboard-service" || echo "  Aucun service optionnel en cours d'exécution"

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
	# Force la recréation du cache en relançant la détection
	@echo "🔄 Recréation du cache..."
	@$(shell \
		if command -v docker-compose &>/dev/null 2>&1 && timeout 10 docker-compose version &>/dev/null 2>&1; then \
			echo "docker-compose" > /tmp/jobbingtrack_docker_compose_cache; \
		elif timeout 10 docker compose version &>/dev/null 2>&1; then \
			echo "docker compose" > /tmp/jobbingtrack_docker_compose_cache; \
		elif [ -x "/usr/bin/docker-compose" ] && timeout 10 /usr/bin/docker-compose version &>/dev/null 2>&1; then \
			echo "/usr/bin/docker-compose" > /tmp/jobbingtrack_docker_compose_cache; \
		elif [ -x "/usr/local/bin/docker-compose" ] && timeout 10 /usr/local/bin/docker-compose version &>/dev/null 2>&1; then \
			echo "/usr/local/bin/docker-compose" > /tmp/jobbingtrack_docker_compose_cache; \
		elif [ -x "/opt/bin/docker-compose" ] && timeout 10 /opt/bin/docker-compose version &>/dev/null 2>&1; then \
			echo "/opt/bin/docker-compose" > /tmp/jobbingtrack_docker_compose_cache; \
		elif [ -x "/snap/bin/docker-compose" ] && timeout 10 /snap/bin/docker-compose version &>/dev/null 2>&1; then \
			echo "/snap/bin/docker-compose" > /tmp/jobbingtrack_docker_compose_cache; \
		else \
			echo "docker-compose" > /tmp/jobbingtrack_docker_compose_cache; \
		fi \
	)
	@echo "✅ Cache nettoyé et recréé"

# Affiche les informations Docker détectées
show-docker-info: ## Affiche les informations Docker et Docker Compose détectées
	@echo "🐳 Informations Docker détectées"
	@echo "================================"
	@echo "Commande Docker Compose: $(DOCKER_COMPOSE_CMD)"
	@if [ -f "/tmp/jobbingtrack_docker_compose_cache" ]; then \
		echo "Cache: $$(cat /tmp/jobbingtrack_docker_compose_cache)"; \
	else \
		echo "Cache: Non encore créé (sera créé au premier make up)"; \
	fi
	@echo ""
	@echo "📊 Test des commandes:"
	@if command -v docker &>/dev/null 2>&1; then \
		echo "✅ docker: $(shell docker --version | head -1)"; \
	else \
		echo "❌ docker: Non installé"; \
	fi
	@if command -v docker-compose &>/dev/null 2>&1 && docker-compose version &>/dev/null 2>&1; then \
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
	@if ! command -v docker &>/dev/null 2>&1; then \
		echo "❌ Docker n'est pas installé ou pas dans le PATH"; \
		echo "💡 Installez Docker: https://docs.docker.com/get-docker/"; \
		exit 1; \
	fi
	@echo "✅ Docker trouvé: $$(docker --version)"
	@echo "🐳 Vérification de Docker Compose..."
	@if command -v docker-compose &>/dev/null 2>&1 && docker-compose version &>/dev/null 2>&1; then \
		echo "✅ docker-compose standalone: $$(docker-compose --version)"; \
	elif docker compose version &>/dev/null 2>&1; then \
		echo "✅ docker compose plugin: $$(docker compose version)"; \
	elif [ -x "/usr/bin/docker-compose" ] && /usr/bin/docker-compose version &>/dev/null 2>&1; then \
		echo "✅ docker-compose dans /usr/bin: $$(/usr/bin/docker-compose --version)"; \
	elif [ -x "/usr/local/bin/docker-compose" ] && /usr/local/bin/docker-compose version &>/dev/null 2>&1; then \
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

# Correction automatique des problèmes CORS
cors-fix: ## Diagnostiquer et corriger automatiquement les problèmes CORS
	./scripts/utils/cors-diagnostic.sh

# Correction directe CORS (sans interaction)
cors-fix-auto: ## Corriger automatiquement les problèmes CORS sans demande de confirmation
	./scripts/utils/cors-fix-direct.sh

# ============================================================================
# DIAGNOSTICS CENTRALISÉS
# ============================================================================

# Diagnostic complet et interactif
diagnostic: ## Diagnostic complet et interactif de tous les problèmes système
	./scripts/utils/diagnostic.sh

# Diagnostic Docker uniquement
diagnostic-docker: ## Diagnostic Docker uniquement
	./scripts/utils/diagnostic.sh --docker

# Diagnostic Docker Compose uniquement
diagnostic-docker-compose: ## Diagnostic Docker Compose uniquement
	./scripts/utils/diagnostic.sh --docker-compose

# Diagnostic CORS uniquement
diagnostic-cors: ## Diagnostic CORS uniquement
	./scripts/utils/diagnostic.sh --cors

# Diagnostic réseau et ports uniquement
diagnostic-network: ## Diagnostic réseau et ports uniquement
	./scripts/utils/diagnostic.sh --network

# Correction automatique complète
diagnostic-fix: ## Diagnostic et correction automatique de tous les problèmes
	./scripts/utils/diagnostic.sh --auto-fix

# Correction automatique Docker Compose
docker-compose-fix: ## Diagnostiquer et corriger automatiquement les problèmes Docker Compose
	./scripts/utils/docker-compose-fix.sh

# ============================================================================
# DIAGNOSTICS AVANCÉS
# ============================================================================

# Diagnostic des services en cours d'exécution
diag-services: ## Diagnostic détaillé des services Docker en cours d'exécution
	@echo "🔍 DIAGNOSTIC DÉTAILLÉ DES SERVICES"
	@echo "==================================="
	@echo ""
	@echo "📊 Services essentiels:"
	@docker ps --filter "name=jobbingtrack" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}" 2>/dev/null | grep -E "postgres|redis|api-gateway|frontend|auth-service|dashboard-service" || echo "  Aucun service essentiel en cours d'exécution"
	@echo ""
	@echo "🟡 Services optionnels:"
	@docker ps --filter "name=jobbingtrack" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}" 2>/dev/null | grep -v -E "postgres|redis|api-gateway|frontend|auth-service|dashboard-service" || echo "  Aucun service optionnel en cours d'exécution"
	@echo ""
	@echo "🔍 Vérification des logs d'erreur (dernières 10 lignes):"
	@echo "API Gateway:"
	@docker logs --tail 10 jobbingtrack-api-gateway 2>/dev/null | head -5 || echo "  API Gateway non démarré ou logs indisponibles"
	@echo ""
	@echo "Frontend:"
	@docker logs --tail 10 jobbingtrack-frontend 2>/dev/null | head -5 || echo "  Frontend non démarré ou logs indisponibles"
	@echo ""
	@echo "📝 Commandes de diagnostic disponibles:"
	@echo "  make diagnostic              # Diagnostic complet interactif"
	@echo "  make diagnostic-docker       # Docker uniquement"
	@echo "  make diagnostic-cors        # CORS uniquement"
	@echo "  make diagnostic-fix         # Correction automatique"
	@echo "  make logs                   # Logs en temps réel"
	@echo "  make status                 # Statut des services"

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
	# Nettoyer les réseaux orphelins
	docker network prune -f
	# Forcer le nettoyage des volumes
	docker volume prune -f
	@echo "✅ Nettoyage terminé"

# Nettoyage d'urgence (force tout)
clean-force: ## Nettoyage d'urgence - force la suppression de TOUT
	@echo "🚨 NETTOYAGE D'URGENCE - SUPPRESSION COMPLÈTE"
	@echo "⚠️ Cette commande va supprimer TOUS les conteneurs, images et volumes JobbingTrack"
	# Arrêter et supprimer tous les conteneurs JobbingTrack
	@docker ps -q --filter "name=jobbingtrack-*" | xargs -r docker stop || true
	@docker ps -aq --filter "name=jobbingtrack-*" | xargs -r docker rm -f || true
	# Supprimer les images JobbingTrack
	@docker images "jobbingtrack-*" -q | xargs -r docker rmi -f || true
	# Supprimer les volumes JobbingTrack
	@docker volume ls --filter "name=jobbingtrack_*" -q | xargs -r docker volume rm -f || true
	# Nettoyer les réseaux
	@docker network prune -f
	# Nettoyage système
	docker system prune -a -f --volumes
	@echo "✅ Nettoyage d'urgence terminé"
	@echo "💡 Utilisez 'make up-full' pour redémarrer depuis zéro"

# ============================================================================
# TESTS
# ============================================================================

.PHONY: test test-unit test-integration test-database test-api test-backend test-e2e test-e2e-ui test-mobile test-frontend test-performance test-security test-all test-report test-quick test-backend-only test-frontend-only test-coverage

# Lancer tous les tests
test: ## Lancer tous les tests
	@echo "🧪 Exécution de tous les tests..."
	./scripts/testing/run-tests.sh --all

# Tests unitaires
test-unit: ## Tests unitaires
	@echo "🔧 Tests unitaires..."
	cd tests && npm run test:unit

# Tests d'intégration
test-integration: ## Tests d'intégration
	@echo "🔗 Tests d'intégration..."
	./scripts/testing/run-tests.sh --integration

# Tests de base de données
test-database: ## Tests de base de données
	@echo "🗄️ Tests de base de données..."
	node tests/database/test-database.js

# Tests API
test-api: ## Tests API backend
	@echo "🌐 Tests API..."
	node tests/api/test-api.js

# Tests backend
test-backend: ## Tests des services backend
	@echo "🔧 Tests backend..."
	node tests/backend/test-services.js

# Tests E2E
test-e2e: ## Tests E2E (Playwright)
	@echo "🎭 Tests E2E..."
	cd tests && npx playwright test

# Tests E2E avec interface
test-e2e-ui: ## Tests E2E avec interface graphique
	@echo "🎭 Tests E2E avec UI..."
	cd tests && npx playwright test --ui

# Tests mobile
test-mobile: ## Tests mobile
	@echo "📱 Tests mobile..."
	node tests/mobile/test-mobile.js

# Tests frontend
test-frontend: ## Tests frontend
	@echo "⚛️ Tests frontend..."
	cd frontend && npm run test

# Tests de performance
test-performance: ## Tests de performance
	@echo "⚡ Tests de performance..."
	node tests/performance/test-performance.js

# Tests de sécurité
test-security: ## Tests de sécurité
	@echo "🔒 Tests de sécurité..."
	node tests/security/test-security.js

# Tests complets (tous les types)
test-all: ## Tests complets (tous types)
	@echo "🚀 Tests complets - Suite complète..."
	node tests/run-tests.js

# Tests avec rapport
test-report: ## Tests avec génération de rapport
	@echo "📊 Tests avec rapport..."
	node tests/run-tests.js --report

# Tests rapides (sans E2E)
test-quick: ## Tests rapides (sans E2E)
	@echo "⚡ Tests rapides..."
	node tests/run-tests.js --no-e2e

# Tests backend uniquement
test-backend-only: ## Tests backend uniquement
	@echo "🔧 Tests backend uniquement..."
	node tests/run-tests.js --no-frontend --no-mobile --no-e2e

# Tests frontend uniquement
test-frontend-only: ## Tests frontend uniquement
	@echo "⚛️ Tests frontend uniquement..."
	node tests/run-tests.js --no-backend --no-api --no-database --no-mobile --no-e2e

# Tests avec coverage
test-coverage: ## Tests avec coverage
	@echo "📊 Tests avec coverage..."
	cd tests && npm run test:coverage

# Setup des tests
test-setup: ## Configuration complète de l'environnement de test
	@echo "⚙️ Configuration de l'environnement de test..."
	node tests/setup.js

# Nettoyage des tests
test-clean: ## Nettoyage complet de l'environnement de test
	@echo "🧹 Nettoyage des tests..."
	./tests/cleanup.sh 2>/dev/null || echo "Script cleanup.sh non trouvé, nettoyage manuel..."
	rm -rf tests/reports/*
	rm -rf tests/coverage/*
	rm -rf tests/e2e/results/*
	rm -rf tests/temp/*
	rm -rf tests/node_modules/.cache
	rm -rf tests/.nyc_output
	docker-compose -f tests/docker-compose.test.yml down -v 2>/dev/null || true
	docker volume rm jobbingtrack_postgres_test_data 2>/dev/null || true
	@echo "✅ Nettoyage terminé"

# Vérification de la configuration des tests
test-verify: ## Vérification de la configuration des tests
	@echo "🔍 Vérification de la configuration..."
	node tests/verify.js

# Initialisation complète avec données de test
init-with-tests: ## Initialisation complète avec génération de données de test
	@echo "🚀 Initialisation complète avec données de test..."
	./scripts/testing/init-with-test-data.sh

# Génération de données de test par défaut
generate-test-data: ## Générer des données de test par défaut
	@echo "🎲 Génération de données de test..."
	node scripts/testing/generate-simple-test-data.js e2e

# Nettoyage et régénération des données de test
refresh-test-data: ## Nettoyer et régénérer les données de test
	@echo "🧹 Nettoyage et régénération des données de test..."
	node scripts/testing/generate-simple-test-data.js e2e --clean
	@echo "✅ Données de test régénérées"

# Amélioration des tests existants
enhance-tests: ## Améliorer les tests existants
	@echo "🛠️ Amélioration des tests existants..."
	node scripts/testing/enhance-existing-tests.js

# Service de test runner
start-test-runner: ## Démarrer le service de test runner
	@echo "🚀 Démarrage du service de test runner..."
	cd backend && node test-runner-service.js

# Setup complet avec tests (script automatique)
full-setup: ## Setup complet automatique avec tests
	@echo "🚀 Setup complet automatique JobbingTrack + Tests..."
	./scripts/testing/full-setup.sh

# ============================================================================
# MONITORING
# ============================================================================

.PHONY: metrics cadvisor logs-metrics

# Ouvrir Prometheus
metrics: ## Ouvrir Prometheus
	@echo "📈 Ouverture de Prometheus..."
	@echo "🌐 URL: http://localhost:9090"
	@if command -v xdg-open >/dev/null 2>&1; then \
		xdg-open http://localhost:9090 2>/dev/null & \
	else \
		echo "💡 Ouvrez votre navigateur à l'adresse ci-dessus"; \
	fi

# Ouvrir cAdvisor
cadvisor: ## Ouvrir cAdvisor
	@echo "📊 Ouverture de cAdvisor..."
	@echo "🌐 URL: http://localhost:8080"
	@if command -v xdg-open >/dev/null 2>&1; then \
		xdg-open http://localhost:8080 2>/dev/null & \
	else \
		echo "💡 Ouvrez votre navigateur à l'adresse ci-dessus"; \
	fi

# Logs du système de métriques
logs-metrics: ## Logs du système de métriques
	@echo "📜 Logs du système de métriques..."
	$(call docker_compose, $(COMPOSE_FILES_FULL) logs -f jobbingtrack-metrics-aggregator)

# Aide complète avec organisation par catégories
help: ## Afficher l'aide organisée par catégories
	@echo "================================================================"
	@echo "🚀 JOBBINGTRACK - PLATEFORME DE GESTION DE CANDIDATURES"
	@echo "================================================================"
	@echo ""
	@echo "📦 DEMARRAGE RAPIDE:"
	@echo "  make up              - Démarrer services essentiels uniquement"
	@echo "  make up-no-check     - Démarrer SANS vérification Docker (officiel)"
	@echo "  make up-mickdevil    - Alias MickDevil de up-no-check (pour rigoler) 😄"
	@echo "  make up-full         - Démarrer TOUS les services"
	@echo "  make down            - Arrêter tous les services"
	@echo "  make restart         - Redémarrer tous les services"
	@echo "  make restart-force   - Redémarrer avec nettoyage forcé (si restart échoue)"
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
	@echo "  make diag-services  - Diagnostic détaillé des services avec logs"
	@echo "  make show-docker-info - Informations Docker/Docker Compose détectées"
	@echo "  make clean-docker-cache - Nettoyer le cache Docker Compose"
	@echo "  make check-deps     - Vérifier que toutes les dépendances sont installées"
	@echo ""
	@echo "🔧 DIAGNOSTICS SPÉCIALISÉS:"
	@echo "  make diagnostic     - Diagnostic complet et interactif"
	@echo "  make diagnostic-docker - Docker uniquement"
	@echo "  make diagnostic-cors  - CORS uniquement"
	@echo "  make diagnostic-network - Réseau et ports uniquement"
	@echo "  make diagnostic-fix - Correction automatique complète"
	@echo ""
	@echo "🔧 CORRECTIONS:"
	@echo "  make cors-fix       - Diagnostiquer et corriger les problèmes CORS"
	@echo "  make cors-fix-auto  - Corriger automatiquement les problèmes CORS"
	@echo "  make docker-compose-fix - Diagnostiquer et corriger Docker Compose"
	@echo ""
	@echo "🚨 MODE SANS VÉRIFICATION (si vérifications Docker échouent):"
	@echo "  make up-no-check    - Démarrer SANS vérification Docker (officiel)"
	@echo "  make up-mickdevil   - Alias MickDevil de up-no-check (pour rigoler) 😄"
	@echo "  make clean-docker-cache - Recréer le cache Docker Compose"
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
	@echo "  make test-all       - Tests complets (tous types)"
	@echo "  make test-quick     - Tests rapides (sans E2E)"
	@echo "  make test-backend-only - Tests backend uniquement"
	@echo "  make test-frontend-only - Tests frontend uniquement"
	@echo ""
	@echo "📋 TESTS PAR CATEGORIE:"
	@echo "  make test-unit      - Tests unitaires"
	@echo "  make test-integration - Tests d'intégration"
	@echo "  make test-database  - Tests de base de données"
	@echo "  make test-api       - Tests API backend"
	@echo "  make test-backend   - Tests des services backend"
	@echo "  make test-frontend  - Tests frontend"
	@echo "  make test-mobile    - Tests mobile"
	@echo "  make test-e2e       - Tests E2E (Playwright)"
	@echo "  make test-e2e-ui    - Tests E2E avec interface"
	@echo "  make test-performance - Tests de performance"
	@echo "  make test-security  - Tests de sécurité"
	@echo "  make test-coverage  - Tests avec coverage"
	@echo "  make test-report    - Tests avec génération de rapport"
	@echo "  make test-setup     - Configuration complète des tests"
	@echo "  make test-clean     - Nettoyage complet des tests"
	@echo "  make test-verify    - Vérification de la configuration"
	@echo "  make init-with-tests - Initialisation complète avec données"
	@echo "  make generate-test-data - Générer données de test"
	@echo "  make refresh-test-data - Nettoyer et régénérer données"
	@echo "  make enhance-tests   - Améliorer tests existants"
	@echo "  make start-test-runner - Service de test runner"
	@echo "  make full-setup      - Setup complet automatique"
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
