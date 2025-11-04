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
	@echo " Démarrage des services essentiels JobbingTrack..."
	@echo " Services: postgres, redis, api-gateway, frontend, auth-service, dashboard-service, jobbingtrack-metrics-aggregator"
	$(call check_docker)
	$(call check_and_free_ports)
	$(call ensure_docker_network)
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) up -d postgres redis api-gateway frontend auth-service dashboard-service jobbingtrack-metrics-aggregator cadvisor)
	@echo ""
	@echo " Services essentiels démarrés avec succès !"
	@echo ""
	@echo " Interfaces disponibles :"
	@echo "   Frontend:           http://localhost:8080"
	@echo "   API Gateway:        http://localhost:3000"
	@echo "   Auth Service:       http://localhost:3001"
	@echo "   Dashboard Service:  http://localhost:3007"
	@echo "   JobbingTrack Metrics:    http://localhost:3014"
	@echo "   cAdvisor:           http://localhost:8081"
	@echo ""
	@echo " Identifiants de connexion :"
	@echo "   Email:    ${ADMIN_EMAIL:-admin@jobbingtrack.test}"
	@echo "   Password: ${ADMIN_PASSWORD:-password123}"
	@echo ""
	@echo " Utilisez 'make up-full' pour démarrer tous les services"

# Démarrer services essentiels SANS vérification Docker (mode officiel)
up-no-check: ## Démarrer services essentiels SANS vérification Docker (solution de contournement)
	@echo " Démarrage des services essentiels JobbingTrack (mode NO-CHECK - SANS vérification Docker)..."
	@echo " Services: postgres, redis, api-gateway, frontend, auth-service, dashboard-service, jobbingtrack-metrics-aggregator, cadvisor"
	@echo " ATTENTION: Vérifications Docker ignorées - Utilisez si les checks normaux échouent"
	$(call check_and_free_ports)
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) up -d postgres redis api-gateway frontend auth-service dashboard-service jobbingtrack-metrics-aggregator cadvisor)
	@echo ""
	@echo " Services essentiels démarrés avec succès (mode NO-CHECK)!"
	@echo ""
	@echo " Interfaces disponibles :"
	@echo "   Frontend:           http://localhost:8080"
	@echo "   API Gateway:        http://localhost:3000"
	@echo "   Auth Service:       http://localhost:3001"
	@echo "   Dashboard Service:  http://localhost:3007"
	@echo "   JobbingTrack Metrics:    http://localhost:3014"
	@echo "   cAdvisor:           http://localhost:8081"
	@echo ""
	@echo " Identifiants de connexion :"
	@echo "   Email:    ${ADMIN_EMAIL:-admin@jobbingtrack.test}"
	@echo "   Password: ${ADMIN_PASSWORD:-password123}"
	@echo ""
	@echo " Utilisez 'make up-full' pour démarrer tous les services"
	@echo " Utilisez 'make up' normal si les vérifications Docker fonctionnent"

# Démarrer services essentiels SANS vérification Docker (alias MickDevil pour rigoler)
up-mickdevil: up-no-check ## Alias MickDevil de up-no-check (pour rigoler)
	@echo ""
	@echo " MickDevil approuve cette commande !"

# Démarrer tous les services avec tous les profils
up-full: ## Démarrer TOUS les services avec tous les profils
	@echo " 🔄 Démarrage complet de JobbingTrack avec nettoyage en profondeur..."
	@echo " 🚀 Tous les services avec métriques complètes"
	
	# Vérification des prérequis Docker
	$(call check_docker)
	
	# Nettoyage complet en premier
	@echo "🧹 Nettoyage complet de l'environnement Docker..."
	@echo " 1/4 Arrêt et suppression des conteneurs en cours..."
	@docker-compose -f docker-compose.yml -f docker-compose.metrics.yml down --remove-orphans --volumes --timeout 30 2>/dev/null || true
	
	@echo " 2/4 Suppression des conteneurs orphelins..."
	@docker ps -aq --filter "name=jobbingtrack-" | xargs -r docker rm -f 2>/dev/null || true
	
	@echo " 3/4 Nettoyage des réseaux..."
	@docker network rm backend_jobbingtrack-network jobbingtrack_jobbingtrack-network 2>/dev/null || true
	
	@echo " 4/4 Nettoyage des volumes orphelins..."
	@docker volume ls -q --filter "name=jobbingtrack" | xargs -r docker volume rm -f 2>/dev/null || true
	
	# Création du réseau si nécessaire
	@echo "🌐 Vérification du réseau Docker..."
	@if ! docker network inspect backend_jobbingtrack-network >/dev/null 2>&1; then \
		echo "  ✓ Création du réseau 'backend_jobbingtrack-network'..."; \
		docker network create backend_jobbingtrack-network; \
	else \
		echo "  ✓ Réseau 'backend_jobbingtrack-network' existe déjà"; \
	fi
	
	# Démarrer les services de base d'abord
	@echo "🚀 Démarrage des services de base (PostgreSQL, Redis)..."
	@docker-compose -f docker-compose.yml up -d postgres redis
	
	# Attendre que PostgreSQL soit prêt
	@echo "⏳ Attente du démarrage de PostgreSQL..."
	@for i in $$(seq 1 30); do \
		if docker-compose -f docker-compose.yml exec -T postgres pg_isready -U jobbingtrack >/dev/null 2>&1; then \
			echo "  ✓ PostgreSQL est prêt"; \
			break; \
		fi; \
		echo -n "."; \
		sleep 1; \
		if [ $$i -eq 30 ]; then \
			echo "❌ Timeout en attendant PostgreSQL"; \
			exit 1; \
		fi; \
	done
	
	# Démarrer les autres services
	@echo "🚀 Démarrage des services principaux..."
	@docker-compose -f docker-compose.yml up -d api-gateway auth-service

	# Correction rôle/DB si nécessaire
	$(MAKE) db-fix-role
	
	# Démarrer le frontend
	@echo "🚀 Démarrage du frontend..."
	@docker-compose -f docker-compose.yml up -d frontend
	
	# Démarrer le service de monitoring
	@echo "📊 Démarrage du service de métriques..."
	@docker-compose -f docker-compose.yml up -d jobbingtrack-metrics-aggregator
	
	# Démarrer les services de monitoring supplémentaires si disponibles
	@if [ -f "docker-compose.metrics.yml" ]; then \
		echo "📊 Démarrage des services de monitoring supplémentaires..."; \
		docker-compose -f docker-compose.metrics.yml up -d; \
	fi
	
	# Vérification de l'état des services
	@echo "✅ Tous les services ont été démarrés"
	@echo ""
	@echo "🌐 Accès aux services :"
	@echo "  - Frontend:           http://localhost:8080"
	@echo "  - API Gateway:        http://localhost:3000"
	@echo "  - cAdvisor:           http://localhost:8081"
	@echo "  - JobbingTrack Metrics: http://localhost:3014"
	@echo ""
	@echo "🔍 Pour voir les logs : make logs"
	@echo "🔍 Pour vérifier l'état : make status"
	@if docker ps -a --format '{{.Names}}' | grep -qE '^jobbingtrack-frontend$$|^jobbingtrack-api-gateway$$'; then \
		echo " Conflit de nom détecté, nettoyage forcé puis relance..."; \
		$(MAKE) clean-force; \
		$(DOCKER_COMPOSE_CMD) -f docker-compose.yml -f docker-compose.metrics.yml up -d --remove-orphans || true; \
	fi
	# Attendre que les services soient prêts
	@echo " Attente du démarrage des services..."
	@sleep 15
	# Vérifier que les services critiques sont bien démarrés
	@echo " Vérification des services critiques..."
	@docker ps --filter "name=jobbingtrack-" --format "table {{.Names}}\t{{.Status}}" || true
	@echo ""
	@echo " Système complet démarré avec succès !"
	@echo ""
	@echo " Interfaces disponibles :"
	@echo "   Frontend:           http://localhost:8080"
	@echo "   API Gateway:        http://localhost:3000"
	@echo "   Auth Service:       http://localhost:3001"
	@echo "   Dashboard Service:  http://localhost:3007"
	@echo "   JobbingTrack Metrics: http://localhost:3014"
	@echo "   Prometheus:         http://localhost:9090"
	@echo "   cAdvisor:           http://localhost:8081"

# Arrêter tous les services
down: ## Arrêter tous les services
	@echo " Arrêt de tous les services JobbingTrack..."
	$(call docker_compose, $(COMPOSE_FILES_FULL) down --remove-orphans --volumes)
	# Arrêter tous les conteneurs JobbingTrack restants
	@docker ps -q --filter "name=jobbingtrack-*" | xargs -r docker stop || true
	@docker ps -aq --filter "name=jobbingtrack-*" | xargs -r docker rm || true
	# Nettoyer les réseaux orphelins qui peuvent causer des conflits
	@docker network prune -f || true
	@echo " Tous les services arrêtés"

# Redémarrer seulement les conteneurs actuellement en cours d'exécution
restart: ## Redémarrer seulement les conteneurs actuellement actifs
	@echo " Redémarrage des services JobbingTrack actifs..."
	# Vérifier les conteneurs actifs
	@ACTIVE_CONTAINERS=$$(docker ps -q --filter "name=jobbingtrack-*" | wc -l); \
	if [ "$$ACTIVE_CONTAINERS" -eq 0 ]; then \
		echo "ℹ Aucun conteneur JobbingTrack en cours d'exécution"; \
		echo " Utilisez 'make up' pour démarrer les services essentiels"; \
		echo " Utilisez 'make restart-clean' pour un redémarrage complet"; \
		exit 0; \
	fi
	@echo " Redémarrage de $$ACTIVE_CONTAINERS conteneur(s) actif(s)..."
	# Redémarrer seulement les conteneurs actifs (sans nettoyage complet)
	$(call docker_compose, $(COMPOSE_FILES_FULL) restart)
	@echo " Attente que les services redémarrent..."
	@sleep 10
	# Vérifier l'état après redémarrage
	@echo " État des services après redémarrage:"
	@docker ps --filter "name=jobbingtrack-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || true
	@echo " Services redémarrés"

# Redémarrage complet avec nettoyage (équivalent à l'ancien restart)
restart-clean: ## Redémarrage complet avec nettoyage et redémarrage des services essentiels
	@echo " Redémarrage complet de JobbingTrack (avec nettoyage)..."
	# Nettoyage plus agressif pour éviter les conflits
	@echo " Nettoyage complet avant redémarrage..."
	$(call docker_compose, $(COMPOSE_FILES_FULL) down --remove-orphans --volumes --timeout 30) || true
	@docker ps -q --filter "name=jobbingtrack-*" | xargs -r docker stop --time 30 || true
	@docker ps -aq --filter "name=jobbingtrack-*" | xargs -r docker rm -f || true
	@docker network prune -f || true
	@echo " Attente de 5 secondes pour s'assurer que tout est bien arrêté..."
	@sleep 5
	# Démarrer avec les services essentiels (comme make up)
	$(MAKE) up
	@echo " Système redémarré (nettoyé et services essentiels)"

# Redémarrer avec nettoyage forcé (si le restart normal échoue)
restart-force: ## Redémarrer avec nettoyage forcé de tous les conteneurs et réseaux
	@echo " REDÉMARRAGE FORCÉ - Nettoyage complet avant redémarrage"
	$(MAKE) clean-force
	@echo " Attente de 5 secondes après nettoyage complet..."
	@sleep 5
	$(MAKE) up-full
	@echo " Système redémarré après nettoyage forcé"

# Démarrer un profil spécifique
up-profile: ## Démarrer un profil spécifique (PROFILE=nom)
	@if [ -z "$(PROFILE)" ]; then \
		echo "❌ Spécifiez le profil avec PROFILE=<nom>"; \
		echo " Exemples:"; \
		echo "   make up-profile PROFILE=auth         # Service d'authentification"; \
		echo "   make up-profile PROFILE=applications # Gestion des candidatures"; \
		echo "   make up-profile PROFILE=monitoring   # Métriques complètes"; \
		echo "   make up-profile PROFILE=full         # Tous les services"; \
		exit 1; \
	fi
	@echo " Démarrage du profil: $(PROFILE)"
	$(call check_docker)
	$(call docker_compose, $(COMPOSE_FILES_FULL) --profile $(PROFILE) up -d)
	@echo " Profil $(PROFILE) démarré"

# ============================================================================
# GESTION INDIVIDUELLE DES SERVICES
# ============================================================================

.PHONY: start-auth start-applications stop-service restart-service logs-service

# Démarrer le service d'authentification
start-auth: ## Démarrer le service d'authentification
	@echo " Démarrage du service d'authentification..."
	$(call check_docker)
	$(call docker_compose, $(COMPOSE_FILES_FULL) --profile auth up -d)
	@echo " Service d'authentification démarré"

# Démarrer le service d'applications
start-applications: ## Démarrer le service d'applications
	@echo " Démarrage du service d'applications..."
	$(call check_docker)
	$(call docker_compose, $(COMPOSE_FILES_FULL) --profile applications up -d)
	@echo " Service d'applications démarré"

# Arrêter un service spécifique
stop-service: ## Arrêter un service spécifique (SERVICE=nom)
	@if [ -z "$(SERVICE)" ]; then \
		echo "❌ Spécifiez le service avec SERVICE=<nom>"; \
		echo " Exemple: make stop-service SERVICE=api-gateway"; \
		exit 1; \
	fi
	@echo " Arrêt du service: $(SERVICE)"
	$(call docker_compose, $(COMPOSE_FILES_FULL) stop $(SERVICE))
	@echo " Service $(SERVICE) arrêté"

# Redémarrer un service spécifique
restart-service: ## Redémarrer un service spécifique (SERVICE=nom)
	@if [ -z "$(SERVICE)" ]; then \
		echo "❌ Spécifiez le service avec SERVICE=<nom>"; \
		echo " Exemple: make restart-service SERVICE=api-gateway"; \
		exit 1; \
	fi
	@echo " Redémarrage du service: $(SERVICE)"
	$(call docker_compose, $(COMPOSE_FILES_FULL) restart $(SERVICE))
	@echo " Service $(SERVICE) redémarré"

# Voir les logs d'un service spécifique
logs-service: ## Voir les logs d'un service spécifique (SERVICE=nom)
	@if [ -z "$(SERVICE)" ]; then \
		echo "❌ Spécifiez le service avec SERVICE=<nom>"; \
		echo " Exemple: make logs-service SERVICE=api-gateway"; \
		exit 1; \
	fi
	$(call docker_compose, $(COMPOSE_FILES_FULL) logs -f $(SERVICE))

# ============================================================================
# DIAGNOSTICS ET VÉRIFICATION
# ============================================================================

.PHONY: status logs health ps show-docker-info clean-docker-cache check-deps cors-fix cors-fix-auto diagnostic diagnostic-docker diagnostic-docker-compose diagnostic-cors diagnostic-network diagnostic-fix docker-compose-fix diag-services

# Statut détaillé de chaque service
status: ## Statut détaillé de chaque service
	@echo " Statut détaillé des services JobbingTrack"
	@echo "=========================================="
	@echo ""
	@echo "🔴 Services essentiels:"
	@docker ps --filter "name=jobbingtrack-*" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null | grep -E "postgres|redis|api-gateway|frontend|auth-service|dashboard-service" || echo "  Aucun service essentiel en cours d'exécution"
	@echo ""
	@echo "🟡 Services optionnels:"
	@docker ps --filter "name=jobbingtrack-*" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null | grep -v -E "postgres|redis|api-gateway|frontend|auth-service|dashboard-service" || echo "  Aucun service optionnel en cours d'exécution"

# Liste des conteneurs actifs
ps: ## Liste les conteneurs actifs
	@echo " Conteneurs actifs JobbingTrack"
	@echo "================================"
	$(call docker_compose, $(COMPOSE_FILES_FULL) ps)

# Logs en temps réel de tous les services
logs: ## Affiche tous les logs en temps réel
	@echo " Logs en temps réel de tous les services"
	@echo "========================================"
	$(call docker_compose, $(COMPOSE_FILES_FULL) logs -f)

# Vérification de santé complète
health: ## Vérifie la santé de tous les services
	@echo " Vérification complète de la santé du système"
	@echo "=============================================="
	./scripts/core/check.sh --detailed

# Nettoie le cache Docker Compose (force redétection)
clean-docker-cache: ## Nettoie le cache Docker Compose et force une redétection
	@echo " Nettoyage du cache Docker Compose..."
	$(call clean_docker_compose_cache)
	# Force la recréation du cache en relançant la détection
	@echo " Recréation du cache..."
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
	@echo " Cache nettoyé et recréé"

# Affiche les informations Docker détectées
show-docker-info: ## Affiche les informations Docker et Docker Compose détectées
	@echo " Informations Docker détectées"
	@echo "================================"
	@echo "Commande Docker Compose: $(DOCKER_COMPOSE_CMD)"
	@if [ -f "/tmp/jobbingtrack_docker_compose_cache" ]; then \
		echo "Cache: $$(cat /tmp/jobbingtrack_docker_compose_cache)"; \
	else \
		echo "Cache: Non encore créé (sera créé au premier make up)"; \
	fi
	@echo ""
	@echo " Test des commandes:"
	@if command -v docker &>/dev/null 2>&1; then \
		echo " docker: $(shell docker --version | head -1)"; \
	else \
		echo "❌ docker: Non installé"; \
	fi
	@if command -v docker-compose &>/dev/null 2>&1 && docker-compose version &>/dev/null 2>&1; then \
		echo " docker-compose: $(shell docker-compose --version)"; \
	else \
		echo "❌ docker-compose: Non fonctionnel"; \
	fi
	@if docker compose version &>/dev/null 2>&1; then \
		echo " docker compose: Plugin disponible"; \
	else \
		echo "❌ docker compose: Non disponible"; \
	fi

# Vérification complète des dépendances
check-deps: ## Vérifier que toutes les dépendances sont installées
	@echo " Vérification des dépendances..."
	@echo " Vérification de Docker..."
	@if ! command -v docker &>/dev/null 2>&1; then \
		echo "❌ Docker n'est pas installé ou pas dans le PATH"; \
		echo " Installez Docker: https://docs.docker.com/get-docker/"; \
		exit 1; \
	fi
	@echo " Docker trouvé: $$(docker --version)"
	@echo " Vérification de Docker Compose..."
	@if command -v docker-compose &>/dev/null 2>&1 && docker-compose version &>/dev/null 2>&1; then \
		echo " docker-compose standalone: $$(docker-compose --version)"; \
	elif docker compose version &>/dev/null 2>&1; then \
		echo " docker compose plugin: $$(docker compose version)"; \
	elif [ -x "/usr/bin/docker-compose" ] && /usr/bin/docker-compose version &>/dev/null 2>&1; then \
		echo " docker-compose dans /usr/bin: $$(/usr/bin/docker-compose --version)"; \
	elif [ -x "/usr/local/bin/docker-compose" ] && /usr/local/bin/docker-compose version &>/dev/null 2>&1; then \
		echo " docker-compose dans /usr/local/bin: $$(/usr/local/bin/docker-compose --version)"; \
	else \
		echo "❌ Docker Compose n'est pas disponible"; \
		echo ""; \
		echo " Installation recommandée :"; \
		echo ""; \
		echo " Option 1 - Installation standalone :"; \
		echo "   sudo curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$$(uname -s)-\$$(uname -m)\" -o /usr/local/bin/docker-compose"; \
		echo "   sudo chmod +x /usr/local/bin/docker-compose"; \
		echo ""; \
		echo " Option 2 - Installation via package manager :"; \
		echo "   # Ubuntu/Debian:"; \
		echo "   sudo apt-get update"; \
		echo "   sudo apt-get install docker-compose-plugin"; \
		echo ""; \
		echo "   # CentOS/RHEL/Fedora:"; \
		echo "   sudo dnf install docker-compose"; \
		echo ""; \
		echo " Option 3 - Utiliser Docker Desktop (recommandé):"; \
		echo "   https://docs.docker.com/desktop/"; \
		echo ""; \
		echo " Après installation, relancez la commande"; \
		exit 1; \
	fi
	@echo " Toutes les dépendances sont installées"

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
	@echo " DIAGNOSTIC DÉTAILLÉ DES SERVICES"
	@echo "==================================="
	@echo ""
	@echo " Services essentiels:"
	@docker ps --filter "name=jobbingtrack" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}" 2>/dev/null | grep -E "postgres|redis|api-gateway|frontend|auth-service|dashboard-service" || echo "  Aucun service essentiel en cours d'exécution"
	@echo ""
	@echo "🟡 Services optionnels:"
	@docker ps --filter "name=jobbingtrack" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}" 2>/dev/null | grep -v -E "postgres|redis|api-gateway|frontend|auth-service|dashboard-service" || echo "  Aucun service optionnel en cours d'exécution"
	@echo ""
	@echo " Vérification des logs d'erreur (dernières 10 lignes):"
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
	@echo " Application des migrations..."
	@echo " Les migrations ne sont pas encore implémentées"
	@echo " Cette commande sera implémentée avec Prisma ou un outil de migration"

# Seed de données de test
db-seed: ## Insérer des données de test
	@echo " Insertion de données de test..."
	./scripts/db/seed.sh

# Reset complet de la base de données
db-reset: ## Reset complet de la DB
	@echo " Reset complet de la base de données..."
	$(call docker_compose, $(COMPOSE_FILES_FULL) exec postgres psql -U jobbingtrack -d jobbingtrack -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
	@echo " Base de données réinitialisée"
	@echo " Relancez 'make db-seed' pour recréer les données"

# Sauvegarde de la base de données
db-backup: ## Créer une sauvegarde de la DB
	@echo " Création d'une sauvegarde..."
	./scripts/db/backup.sh

# Restauration de la base de données
db-restore: ## Restaurer depuis un fichier (file=nom_du_fichier.sql)
	@if [ -z "$(file)" ]; then \
		echo "❌ Spécifiez le fichier avec file=<nom_du_fichier.sql>"; \
		echo " Exemple: make db-restore file=backup_20231001.sql"; \
		exit 1; \
	fi
	@echo " Restauration depuis $(file)..."
	$(call docker_compose, $(COMPOSE_FILES_FULL) exec -T postgres psql -U jobbingtrack -d jobbingtrack < $(file))
	@echo " Base de données restaurée"

# ============================================================================
# BUILD ET DÉVELOPPEMENT
# ============================================================================

.PHONY: build rebuild clean

# Build de tous les services
build: ## Build tous les services
	@echo " Build de tous les services..."
	$(call check_docker)
	$(call docker_compose, $(COMPOSE_FILES_FULL) build)
	@echo " Tous les services construits"

# Rebuild sans cache
rebuild: ## Rebuild sans cache
	@echo " Rebuild complet sans cache..."
	$(call check_docker)
	$(call docker_compose, $(COMPOSE_FILES_FULL) build --no-cache)
	@echo " Rebuild terminé"

# Nettoyage complet
clean: ## Nettoyage complet
	@echo " Nettoyage complet..."
	$(call docker_compose, $(COMPOSE_FILES_FULL) down -v --remove-orphans)
	docker system prune -f
	# Nettoyer les réseaux orphelins
	docker network prune -f
	# Forcer le nettoyage des volumes
	docker volume prune -f
	@echo " Nettoyage terminé"

# Nettoyage d'urgence (force tout)
clean-force: ## Nettoyage d'urgence - force la suppression de TOUT
	@echo " NETTOYAGE D'URGENCE - SUPPRESSION COMPLÈTE"
	@echo " Cette commande va supprimer TOUS les conteneurs, images et volumes JobbingTrack"
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
	@echo " Nettoyage d'urgence terminé"
	@echo " Utilisez 'make up-full' pour redémarrer depuis zéro"

# ============================================================================
# ENVIRONNEMENTS ET BASES DE DONNÉES
# ============================================================================

.PHONY: up-dev up-test up-staging up-prod up-all-dbs db-dev db-test db-staging db-prod switch-db reset-db copy-prod-to-dev init-all-dbs

# Démarrer l'environnement de développement avec sa propre base de données
up-dev: ## Démarrer l'environnement de développement
	@echo " Démarrage de l'environnement de développement..."
	$(call check_docker)
	$(call docker_compose, -f docker-compose.yml -f docker-compose.test.yml up -d postgres-dev redis-dev)
	@echo " Environnement DEV démarré"
	@echo " PostgreSQL DEV: localhost:5433"
	@echo " Redis DEV: localhost:6380"

# Démarrer l'environnement de test
up-test: ## Démarrer l'environnement de test
	@echo " Démarrage de l'environnement de test..."
	$(call check_docker)
	$(call docker_compose, -f docker-compose.yml -f docker-compose.test.yml up -d postgres-test redis-test)
	@echo " Environnement TEST démarré"
	@echo " PostgreSQL TEST: localhost:5434"
	@echo " Redis TEST: localhost:6381"

# Démarrer l'environnement de staging
up-staging: ## Démarrer l'environnement de staging
	@echo " Démarrage de l'environnement de staging..."
	$(call check_docker)
	$(call docker_compose, -f docker-compose.yml -f docker-compose.test.yml up -d postgres-staging redis-staging)
	@echo " Environnement STAGING démarré"
	@echo " PostgreSQL STAGING: localhost:5435"
	@echo " Redis STAGING: localhost:6382"

# Démarrer l'environnement de production (simulation)
up-prod: ## Démarrer l'environnement de production (simulation)
	@echo " Démarrage de l'environnement de production (simulation)..."
	$(call check_docker)
	$(call docker_compose, -f docker-compose.yml -f docker-compose.test.yml up -d postgres-prod redis-prod)
	@echo " Environnement PROD démarré"
	@echo " PostgreSQL PROD: localhost:5436"
	@echo " Redis PROD: localhost:6383"

# Basculer vers la base de données de développement
switch-db: ## Basculer vers la base de données de développement
	@echo " Basculement vers la base de données de développement..."
	@echo "export DATABASE_URL=postgresql://jobbingtrack:jobbingtrack123@localhost:5433/jobbingtrack?schema=public" > /tmp/db_config.sh
	@echo "export REDIS_URL=redis://localhost:6380" >> /tmp/db_config.sh
	@echo " Basculé vers DEV DB"
	@echo " Sourcez le fichier: source /tmp/db_config.sh"

# Reset d'une base de données spécifique
reset-db: ## Reset d'une base de données (DB=dev|test|staging|prod)
	@if [ -z "$(DB)" ]; then \
		echo "❌ Spécifiez la DB avec DB=<nom>"; \
		echo " Exemples:"; \
		echo "   make reset-db DB=dev"; \
		echo "   make reset-db DB=test"; \
		echo "   make reset-db DB=staging"; \
		echo "   make reset-db DB=prod"; \
		exit 1; \
	fi
	@echo " Reset de la base de données $(DB)..."
	$(call docker_compose, -f docker-compose.test.yml stop postgres-$(DB))
	$(call docker_compose, -f docker-compose.test.yml rm -f postgres-$(DB))
	docker volume rm jobbingtrack_postgres_$(DB)_data 2>/dev/null || echo "Volume non trouvé"
	$(call docker_compose, -f docker-compose.test.yml up -d postgres-$(DB))
	@echo " Base de données $(DB) réinitialisée"

# Copier la production vers le développement
copy-prod-to-dev: ## Copier la base de prod vers dev
	@echo " Copie de PROD vers DEV..."
	$(call docker_compose, -f docker-compose.test.yml exec postgres-prod pg_dump -U jobbingtrack -d jobbingtrack_prod > /tmp/prod_dump.sql)
	$(call docker_compose, -f docker-compose.test.yml exec postgres-dev psql -U jobbingtrack -d jobbingtrack -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
	$(call docker_compose, -f docker-compose.test.yml exec -T postgres-dev psql -U jobbingtrack -d jobbingtrack < /tmp/prod_dump.sql)
	rm /tmp/prod_dump.sql
	@echo " Données de PROD copiées vers DEV"

# Démarrer tous les environnements de base de données
up-all-dbs: ## Démarrer toutes les bases de données (dev, test, staging, prod)
	@echo " Démarrage de tous les environnements de base de données..."
	$(call check_docker)
	$(call docker_compose, -f docker-compose.test.yml up -d postgres-dev redis-dev postgres-test redis-test postgres-staging redis-staging postgres-prod redis-prod)
	@echo " Tous les environnements démarrés"
	@echo " PostgreSQL DEV: localhost:5433"
	@echo " PostgreSQL TEST: localhost:5434"
	@echo " PostgreSQL STAGING: localhost:5435"
	@echo " PostgreSQL PROD: localhost:5436"
	@echo " Redis DEV: localhost:6380"
	@echo " Redis TEST: localhost:6381"
	@echo " Redis STAGING: localhost:6382"
	@echo " Redis PROD: localhost:6383"

# Initialiser toutes les bases de données avec le schéma
init-all-dbs: ## Initialiser toutes les bases de données avec le schéma
	@echo " Initialisation de toutes les bases de données..."
	$(call check_docker)
	@echo " Attente que toutes les bases soient prêtes..."
	@sleep 10
	$(call docker_compose, -f docker-compose.test.yml exec postgres-dev psql -U jobbingtrack -d jobbingtrack -f /docker-entrypoint-initdb.d/init-db.sql)
	$(call docker_compose, -f docker-compose.test.yml exec postgres-test psql -U jobbingtrack -d jobbingtrack_test -f /docker-entrypoint-initdb.d/init-db.sql)
	$(call docker_compose, -f docker-compose.test.yml exec postgres-staging psql -U jobbingtrack -d jobbingtrack_staging -f /docker-entrypoint-initdb.d/init-db.sql)
	$(call docker_compose, -f docker-compose.test.yml exec postgres-prod psql -U jobbingtrack -d jobbingtrack_prod -f /docker-entrypoint-initdb.d/init-db.sql)
	@echo " Toutes les bases de données initialisées"

# ============================================================================
# TESTS
# ============================================================================

.PHONY: test test-unit test-integration test-database test-api test-backend test-e2e test-e2e-ui test-mobile test-frontend test-performance test-security test-all test-report test-quick test-backend-only test-frontend-only test-coverage test-docker-images test-docker-clean test-system-verify test-hydration test-implementation test-secure-env

# Lancer tous les tests
test: ## Lancer tous les tests
	@echo " Exécution de tous les tests..."
	./scripts/testing/run-tests.sh --all

# Tests unitaires
test-unit: ## Tests unitaires
	@echo " Tests unitaires..."
	cd tests && npm run test:unit

# Tests d'intégration
test-integration: ## Tests d'intégration
	@echo " Tests d'intégration..."
	./scripts/testing/run-tests.sh --integration

# Tests de base de données
test-database: ## Tests de base de données
	@echo " Tests de base de données..."
	node tests/database/test-database.js

# Tests API
test-api: ## Tests API backend
	@echo " Tests API..."
	node tests/api/test-api.js

# Tests backend
test-backend: ## Tests des services backend
	@echo " Tests backend..."
	node tests/backend/test-services.js

# Tests E2E
test-e2e: ## Tests E2E (Playwright)
	@echo " Tests E2E..."
	cd tests && npx playwright test

# Tests E2E avec interface
test-e2e-ui: ## Tests E2E avec interface graphique
	@echo " Tests E2E avec UI..."
	cd tests && npx playwright test --ui

# Tests mobile
test-mobile: ## Tests mobile
	@echo " Tests mobile..."
	node tests/mobile/test-mobile.js

# Tests frontend
test-frontend: ## Tests frontend
	@echo " Tests frontend..."
	cd frontend && npm run test

# Tests de performance adaptatifs
test-performance: ## Tests de performance adaptatifs (détection automatique des services)
	@echo "⚡ Tests de performance adaptatifs..."
	@echo " Détection automatique des services disponibles"
	@echo " Démarrage intelligent des services nécessaires"
	@echo " Arrêt automatique des services temporaires"
	node tests/performance/test-performance.js

# Tests de sécurité
test-security: ## Tests de sécurité
	@echo " Tests de sécurité..."
	node tests/security/test-security.js

# Tests complets (tous les types)
test-all: ## Tests complets (tous types)
	@echo " Tests complets - Suite complète..."
	node tests/run-tests.js

# Tests avec rapport
test-report: ## Tests avec génération de rapport
	@echo " Tests avec rapport..."
	node tests/run-tests.js --report

# Tests rapides (sans E2E)
test-quick: ## Tests rapides (sans E2E)
	@echo "⚡ Tests rapides..."
	node tests/run-tests.js --no-e2e

# Tests backend uniquement
test-backend-only: ## Tests backend uniquement
	@echo " Tests backend uniquement..."
	node tests/run-tests.js --no-frontend --no-mobile --no-e2e

# Tests frontend uniquement
test-frontend-only: ## Tests frontend uniquement
	@echo " Tests frontend uniquement..."
	node tests/run-tests.js --no-backend --no-api --no-database --no-mobile --no-e2e

# Tests avec coverage
test-coverage: ## Tests avec coverage
	@echo " Tests avec coverage..."
	cd tests && npx jest --config jest.config.js --coverage

# ============================================================================
# QUALITÉ DU CODE
# ============================================================================

.PHONY: lint format format-check

# Linting de tout le projet
lint: ## Linting de tout le projet (ESLint)
	@echo " Linting du projet..."
	@echo " Backend services..."
	@for service in backend/*/; do \
		if [ -f "$$service/package.json" ]; then \
			echo "Linting $$service..."; \
			cd "$$service" && npm run lint 2>/dev/null || echo " Linting échoué pour $$service"; \
			cd - > /dev/null; \
		fi; \
	done
	@echo " Frontend..."
	@cd frontend && npm run lint 2>/dev/null || echo " Linting frontend échoué"
	@echo " Tests..."
	@cd tests && npm run lint 2>/dev/null || echo " Linting tests échoué"
	@echo " Linting terminé"

# Formatage du code
format: ## Formatage automatique du code (Prettier)
	@echo " Formatage du code..."
	@for service in backend/*/; do \
		if [ -f "$$service/package.json" ]; then \
			echo "Formatage $$service..."; \
			cd "$$service" && npm run format 2>/dev/null || echo " Formatage échoué pour $$service"; \
			cd - > /dev/null; \
		fi; \
	done
	@cd frontend && npm run format 2>/dev/null || echo " Formatage frontend échoué"
	@cd tests && npm run format 2>/dev/null || echo " Formatage tests échoué"
	@echo " Formatage terminé"

# Vérification du formatage
format-check: ## Vérification du formatage (Prettier --check)
	@echo " Vérification du formatage..."
	@for service in backend/*/; do \
		if [ -f "$$service/package.json" ]; then \
			echo "Vérification formatage $$service..."; \
			cd "$$service" && npm run format:check 2>/dev/null || echo " Formatage incorrect pour $$service"; \
			cd - > /dev/null; \
		fi; \
	done
	@cd frontend && npm run format:check 2>/dev/null || echo " Formatage frontend incorrect"
	@cd tests && npm run format:check 2>/dev/null || echo " Formatage tests incorrect"
	@echo " Vérification formatage terminée"

# Setup des tests
test-setup: ## Configuration complète de l'environnement de test
	@echo " Configuration de l'environnement de test..."
	node tests/setup.js

# Nettoyage des tests
test-clean: ## Nettoyage complet de l'environnement de test
	@echo " Nettoyage des tests..."
	./tests/cleanup.sh 2>/dev/null || echo "Script cleanup.sh non trouvé, nettoyage manuel..."
	rm -rf tests/reports/*
	rm -rf tests/coverage/*
	rm -rf tests/e2e/results/*
	rm -rf tests/temp/*
	rm -rf tests/node_modules/.cache
	rm -rf tests/.nyc_output
	docker-compose -f tests/docker-compose.test.yml down -v 2>/dev/null || true
	docker volume rm jobbingtrack_postgres_test_data 2>/dev/null || true
	@echo " Nettoyage terminé"

# Vérification de la configuration des tests
test-verify: ## Vérification de la configuration des tests
	@echo " Vérification de la configuration..."
	node tests/verify.js

# Tests Docker et déploiement (réorganisés)
test-docker-images: ## Tests des noms d'images Docker
	@echo " Tests des images Docker..."
	node tests/docker/test-docker-images.js

test-docker-clean: ## Tests de la commande make down
	@echo " Tests de make down..."
	node tests/docker/test-make-down-clean.js

# Tests système et vérification (réorganisés)
test-system-verify: ## Vérification complète du système de test
	@echo " Vérification système..."
	node tests/system/verify-test-system.js

# Tests d'intégration étendus (réorganisés)
test-hydration: ## Tests des corrections d'hydratation
	@echo " Tests d'hydratation..."
	node tests/integration/test-hydration-fixes.js

test-implementation: ## Tests de l'implémentation complète
	@echo " Tests d'implémentation..."
	node tests/integration/test-implementation.js

# Tests de sécurité (réorganisés)
test-secure-env: ## Tests de sécurité des variables d'environnement
	@echo " Tests de sécurité des variables d'environnement..."
	node tests/security/test-secure-env-vars.js

# Initialisation complète avec données de test
init-with-tests: ## Initialisation complète avec génération de données de test
	@echo " Initialisation complète avec données de test..."
	./scripts/testing/init-with-test-data.sh

# Génération de données de test par défaut
generate-test-data: ## Générer des données de test par défaut
	@echo " Génération de données de test..."
	node scripts/testing/generate-simple-test-data.js e2e

# Nettoyage et régénération des données de test
refresh-test-data: ## Nettoyer et régénérer les données de test
	@echo " Nettoyage et régénération des données de test..."
	node scripts/testing/generate-simple-test-data.js e2e --clean
	@echo " Données de test régénérées"

# Amélioration des tests existants
enhance-tests: ## Améliorer les tests existants
	@echo " Amélioration des tests existants..."
	node scripts/testing/enhance-existing-tests.js

# Service de test runner
start-test-runner: ## Démarrer le service de test runner
	@echo " Démarrage du service de test runner..."
	cd backend && node test-runner-service.js

# Setup complet avec tests (script automatique)
full-setup: ## Setup complet automatique avec tests
	@echo " Setup complet automatique JobbingTrack + Tests..."
	./scripts/testing/full-setup.sh

# ============================================================================
# MONITORING
# ============================================================================

.PHONY: metrics cadvisor logs-metrics

# Ouvrir Prometheus
metrics: ## Ouvrir Prometheus
	@echo " Ouverture de Prometheus..."
	@echo " URL: http://localhost:9090"
	@if command -v xdg-open >/dev/null 2>&1; then \
		xdg-open http://localhost:9090 2>/dev/null & \
	else \
		echo " Ouvrez votre navigateur à l'adresse ci-dessus"; \
	fi

# Ouvrir cAdvisor
cadvisor: ## Ouvrir cAdvisor
	@echo " Ouverture de cAdvisor..."
	@echo " URL: http://localhost:8080"
	@if command -v xdg-open >/dev/null 2>&1; then \
		xdg-open http://localhost:8080 2>/dev/null & \
	else \
		echo " Ouvrez votre navigateur à l'adresse ci-dessus"; \
	fi

# Logs du système de métriques
logs-metrics: ## Logs du système de métriques
	@echo " Logs du système de métriques..."
	$(call docker_compose, $(COMPOSE_FILES_FULL) logs -f jobbingtrack-metrics-aggregator)

# Aide complète avec organisation par catégories
help: ## Afficher l'aide organisée par catégories
	@echo "================================================================"
	@echo " JOBBINGTRACK - PLATEFORME DE GESTION DE CANDIDATURES"
	@echo "================================================================"
	@echo ""
	@echo " DEMARRAGE RAPIDE:"
	@echo "  make up              - Démarrer services essentiels uniquement"
	@echo "  make up-no-check     - Démarrer SANS vérification Docker (officiel)"
	@echo "  make up-mickdevil    - Alias MickDevil de up-no-check (pour rigoler) "
	@echo "  make up-full         - Démarrer TOUS les services"
	@echo "  make down            - Arrêter tous les services"
	@echo "  make restart         - Redémarrer SEULEMENT les conteneurs actifs"
	@echo "  make restart-clean   - Redémarrage COMPLET avec nettoyage + services essentiels"
	@echo "  make restart-force   - Redémarrer avec nettoyage forcé (si restart échoue)"
	@echo ""
	@echo " GESTION INDIVIDUELLE:"
	@echo "  make start-auth      - Démarrer le service d'authentification"
	@echo "  make start-applications - Démarrer le service d'applications"
	@echo "  make stop-service SERVICE=nom - Arrêter un service spécifique"
	@echo "  make restart-service SERVICE=nom - Redémarrer un service"
	@echo "  make logs-service SERVICE=nom - Voir les logs d'un service"
	@echo ""
	@echo " PROFILES ET PROFILS:"
	@echo "  make up-profile PROFILE=auth - Démarrer un profil spécifique"
	@echo "  make up-profile PROFILE=monitoring - Démarrer les métriques"
	@echo "  make up-profile PROFILE=full - Démarrer tous les services"
	@echo ""
	@echo " DIAGNOSTICS:"
	@echo "  make health          - Vérifier la santé de tous les services"
	@echo "  make ps             - Lister les conteneurs actifs"
	@echo "  make logs           - Afficher tous les logs"
	@echo "  make status         - Statut détaillé de chaque service"
	@echo "  make diag-services  - Diagnostic détaillé des services avec logs"
	@echo "  make show-docker-info - Informations Docker/Docker Compose détectées"
	@echo "  make clean-docker-cache - Nettoyer le cache Docker Compose"
	@echo "  make check-deps     - Vérifier que toutes les dépendances sont installées"
	@echo ""
	@echo " DIAGNOSTICS SPÉCIALISÉS:"
	@echo "  make diagnostic     - Diagnostic complet et interactif"
	@echo "  make diagnostic-docker - Docker uniquement"
	@echo "  make diagnostic-cors  - CORS uniquement"
	@echo "  make diagnostic-network - Réseau et ports uniquement"
	@echo "  make diagnostic-fix - Correction automatique complète"
	@echo ""
	@echo " CORRECTIONS:"
	@echo "  make cors-fix       - Diagnostiquer et corriger les problèmes CORS"
	@echo "  make cors-fix-auto  - Corriger automatiquement les problèmes CORS"
	@echo "  make docker-compose-fix - Diagnostiquer et corriger Docker Compose"
	@echo ""
	@echo " MODE SANS VÉRIFICATION (si vérifications Docker échouent):"
	@echo "  make up-no-check    - Démarrer SANS vérification Docker (officiel)"
	@echo "  make up-mickdevil   - Alias MickDevil de up-no-check (pour rigoler) "
	@echo "  make clean-docker-cache - Recréer le cache Docker Compose"
	@echo ""
	@echo " BASE DE DONNÉES:"
	@echo "  make db-migrate     - Migrations de base de données"
	@echo "  make db-seed        - Insérer des données de test"
	@echo "  make db-reset       - Reset complet de la DB"
	@echo "  make db-backup      - Sauvegarde de la DB"
	@echo "  make db-restore     - Restauration de la DB"
	@echo ""
	@echo " BUILD ET DÉVELOPPEMENT:"
	@echo "  make build          - Build tous les services"
	@echo "  make rebuild        - Rebuild sans cache"
	@echo "  make clean          - Nettoyage complet"
	@echo ""
	@echo " TESTS:"
	@echo "  make test           - Lancer tous les tests"
	@echo "  make test-all       - Tests complets (tous types)"
	@echo "  make test-quick     - Tests rapides (sans E2E)"
	@echo "  make test-backend-only - Tests backend uniquement"
	@echo "  make test-frontend-only - Tests frontend uniquement"
	@echo ""
	@echo " TESTS PAR CATEGORIE:"
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
	@echo " TESTS RÉORGANISÉS (migration racine):"
	@echo "  make test-docker-images - Tests des noms d'images Docker"
	@echo "  make test-docker-clean  - Tests de la commande make down"
	@echo "  make test-system-verify - Vérification complète du système"
	@echo "  make test-hydration     - Tests des corrections d'hydratation"
	@echo "  make test-implementation - Tests de l'implémentation complète"
	@echo "  make test-secure-env    - Tests de sécurité des variables d'environnement"
	@echo ""
	@echo " MONITORING:"
	@echo "  make metrics        - Ouvrir Prometheus"
	@echo "  make cadvisor       - Ouvrir cAdvisor"
	@echo "  make logs-metrics   - Logs du système de métriques"
	@echo ""
	@echo " AIDE DÉTAILLÉE:"
	@echo "  make help-up        - Aide détaillée pour 'make up'"
	@echo "  make help-status    - Aide détaillée pour 'make status'"
	@echo "  make help-logs      - Aide détaillée pour 'make logs'"
	@echo "  make help-*         - Aide pour n'importe quelle commande"
	@echo ""
	@echo " ASTUCES:"
	@echo "  • Utilisez 'make help-<commande>' pour l'aide détaillée d'une commande"
	@echo "  • Ex: 'make help-health' pour l'aide de la commande health"
	@echo "  • Toutes les commandes supportent les variables d'environnement"

# Réparer rôle/db Postgres si manquants (idempotent)
.PHONY: db-fix-role

db-fix-role: ## Crée le rôle et la base 'jobbingtrack' si manquants
	@echo "🔧 Vérification/Création du rôle et de la DB 'jobbingtrack'..."
	@docker exec -i jobbingtrack-postgres sh -c 'psql -U postgres -v ON_ERROR_STOP=1 <<SQL\nDO $$\nBEGIN\n  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ''jobbingtrack'') THEN\n    CREATE ROLE jobbingtrack LOGIN PASSWORD ''jobbingtrack123'';\n  END IF;\nEND$$;\nDO $$\nBEGIN\n  IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = ''jobbingtrack'') THEN\n    CREATE DATABASE jobbingtrack OWNER jobbingtrack;\n  END IF;\nEND$$;\nSQL' 2>/dev/null || true
	@echo "✅ Rôle/DB vérifiés"
