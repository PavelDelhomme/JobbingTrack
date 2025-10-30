# ============================================================================
# Makefile Services - JobbingTrack
# ============================================================================
# Gestion du démarrage, arrêt, restart des services Docker
# ============================================================================

.PHONY: up down up-full up-no-check up-mickdevil restart restart-clean restart-force up-profile start-auth start-applications stop-service restart-service logs-service status logs ps help-services

# ============================================================================
# AIDE
# ============================================================================

help-services: ## Afficher l'aide services
	@echo "================================================================"
	@echo "🚀 SERVICES - Commandes disponibles"
	@echo "================================================================"
	@echo ""
	@echo "🚀 DÉMARRAGE:"
	@echo "  make up                    - Services essentiels (postgres, redis, gateway, frontend, auth)"
	@echo "  make up-no-check           - Sans vérification Docker"
	@echo "  make up-full               - TOUS les services"
	@echo "  make up-profile PROFILE=x  - Par profil (auth, applications, companies, etc.)"
	@echo ""
	@echo "🛑 ARRÊT:"
	@echo "  make down                  - Arrêter tous les services"
	@echo "  make stop-service SERVICE=x - Arrêter un service"
	@echo ""
	@echo "🔄 RESTART:"
	@echo "  make restart               - Redémarrer services actifs"
	@echo "  make restart-clean         - Redémarrage + nettoyage"
	@echo "  make restart-service SERVICE=x - Redémarrer un service"
	@echo ""
	@echo "📊 STATUS & LOGS:"
	@echo "  make status                - Statut détaillé des services"
	@echo "  make ps                    - Liste conteneurs actifs"
	@echo "  make logs                  - Tous les logs"
	@echo "  make logs-service SERVICE=x - Logs d'un service"
	@echo ""
	@echo "🎯 PROFILS DISPONIBLES:"
	@echo "  auth, applications, companies, contacts, interviews"
	@echo "  calls, events, followups, profiles, notifications"
	@echo "  workflows, dashboard, security, monitoring, full"
	@echo ""
	@echo "💡 EXEMPLES:"
	@echo "  make up                              # Essentiels"
	@echo "  make up-profile PROFILE=applications # + Candidatures"
	@echo "  make logs-service SERVICE=api-gateway # Logs gateway"
	@echo ""
	@echo "📖 Documentation: docs/development/makefile/README.md"
	@echo ""

# ============================================================================
# DÉMARRAGE DES SERVICES
# ============================================================================

# Démarrer services essentiels
up: ## Démarrer services essentiels (postgres, redis, api-gateway, frontend, auth, dashboard, metrics)
	@echo "🚀 Démarrage des services essentiels JobbingTrack..."
	@echo "📦 Services: postgres, redis, api-gateway, frontend, auth-service, dashboard-service, metrics-aggregator"
	$(call check_docker)
	$(call check_and_free_ports)
	$(call ensure_docker_network)
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) up -d postgres redis api-gateway frontend auth-service dashboard-service jobbingtrack-metrics-aggregator cadvisor)
	@echo ""
	@echo "✅ Services essentiels démarrés avec succès !"
	@echo ""
	@echo "🌐 Interfaces disponibles :"
	@echo "   Frontend:           http://localhost:8080"
	@echo "   API Gateway:        http://localhost:3000"
	@echo "   Auth Service:       http://localhost:8001"
	@echo "   Dashboard Service:  http://localhost:8012"
	@echo "   Metrics:            http://localhost:8014"
	@echo "   cAdvisor:           http://localhost:8081"
	@echo ""
	@echo "🔑 Identifiants de connexion :"
	@echo "   Email:    ${ADMIN_EMAIL:-admin@jobbingtrack.com}"
	@echo "   Password: ${ADMIN_PASSWORD:-password123}"
	@echo ""
	@echo "💡 Utilisez 'make up-full' pour démarrer tous les services"

# Démarrer SANS vérification Docker
up-no-check: ## Démarrer services essentiels SANS vérification Docker (mode contournement)
	@echo "🚀 Démarrage services essentiels (mode NO-CHECK)..."
	@echo "⚠️  ATTENTION: Vérifications Docker ignorées"
	$(call check_and_free_ports)
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) up -d postgres redis api-gateway frontend auth-service dashboard-service jobbingtrack-metrics-aggregator cadvisor)
	@echo ""
	@echo "✅ Services démarrés (mode NO-CHECK)!"
	@echo ""
	@echo "🌐 Interfaces disponibles :"
	@echo "   Frontend:    http://localhost:8080"
	@echo "   API Gateway: http://localhost:3000"
	@echo ""
	@echo "💡 Utilisez 'make up' si les vérifications Docker fonctionnent"

# Alias MickDevil
up-mickdevil: up-no-check ## Alias de up-no-check (MickDevil approuve!)
	@echo ""
	@echo "😎 MickDevil approuve cette commande !"

# Démarrer TOUS les services
up-full: ## Démarrer TOUS les services avec tous les profils
	@echo "🔄 Démarrage complet de JobbingTrack avec nettoyage en profondeur..."
	@echo "🚀 Tous les services avec métriques complètes"
	
	# Vérification prérequis
	$(call check_docker)
	
	# Nettoyage complet
	@echo "🧹 Nettoyage complet de l'environnement Docker..."
	@echo "  1/4 Arrêt et suppression des conteneurs..."
	@docker-compose -f docker-compose.yml down --remove-orphans --volumes --timeout 30 2>/dev/null || true
	
	@echo "  2/4 Suppression des conteneurs orphelins..."
	@docker ps -aq --filter "name=jobbingtrack-" | xargs -r docker rm -f 2>/dev/null || true
	
	@echo "  3/4 Nettoyage des réseaux..."
	@docker network rm backend_jobbingtrack-network jobbingtrack_jobbingtrack-network 2>/dev/null || true
	
	@echo "  4/4 Nettoyage des volumes orphelins..."
	@docker volume ls -q --filter "name=jobbingtrack" | xargs -r docker volume rm -f 2>/dev/null || true
	
	# Création réseau
	@echo "🌐 Vérification du réseau Docker..."
	@if ! docker network inspect backend_jobbingtrack-network >/dev/null 2>&1; then \
		echo "  ✓ Création du réseau 'backend_jobbingtrack-network'..."; \
		docker network create backend_jobbingtrack-network; \
	else \
		echo "  ✓ Réseau 'backend_jobbingtrack-network' existe déjà"; \
	fi
	
	# Démarrer services de base
	@echo "🚀 Démarrage des services de base (PostgreSQL, Redis)..."
	@docker-compose -f docker-compose.yml up -d postgres redis
	
	# Attendre PostgreSQL
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
	
	# Démarrer services principaux
	@echo "🚀 Démarrage des services principaux..."
	@docker-compose -f docker-compose.yml up -d api-gateway auth-service
	
	# Correction DB
	$(MAKE) db-fix-role
	
	# Démarrer frontend
	@echo "🚀 Démarrage du frontend..."
	@docker-compose -f docker-compose.yml up -d frontend
	
	# Démarrer monitoring
	@echo "📊 Démarrage du service de métriques..."
	@docker-compose -f docker-compose.yml up -d jobbingtrack-metrics-aggregator
	
	# Services monitoring supplémentaires
	# ⚠️ DÉSACTIVÉ - Utilisez 'make monitoring-up' pour démarrer Prometheus, cAdvisor, etc.
	# docker-compose.metrics.yml est obsolète, utilisez monitoring/docker-compose.monitoring.yml
	# @if [ -f "docker-compose.metrics.yml" ]; then \
	# 	echo "📊 Démarrage des services de monitoring supplémentaires..."; \
	# 	docker-compose -f docker-compose.metrics.yml up -d; \
	# fi
	
	# Vérification
	@echo "✅ Tous les services ont été démarrés"
	@echo ""
	@echo "🌐 Accès aux services :"
	@echo "  - Frontend:           http://localhost:8080"
	@echo "  - API Gateway:        http://localhost:3000"
	@echo "  - Metrics Aggregator: http://localhost:8014"
	@echo ""
	@echo "📊 Pour démarrer le monitoring complet (Prometheus, cAdvisor, Grafana):"
	@echo "    make monitoring-full"
	@echo ""
	@echo "🔍 Pour voir les logs : make logs"
	@echo "🔍 Pour vérifier l'état : make status"

# ============================================================================
# ARRÊT DES SERVICES
# ============================================================================

# Arrêter tous les services
down: ## Arrêter tous les services
	@echo "🛑 Arrêt de tous les services JobbingTrack..."
	$(call docker_compose, $(COMPOSE_FILES_FULL) down --remove-orphans --volumes)
	# Arrêter conteneurs restants
	@docker ps -q --filter "name=jobbingtrack-*" | xargs -r docker stop || true
	@docker ps -aq --filter "name=jobbingtrack-*" | xargs -r docker rm || true
	# Nettoyer réseaux orphelins
	@docker network prune -f || true
	@echo "✅ Tous les services arrêtés"

# ============================================================================
# REDÉMARRAGE DES SERVICES
# ============================================================================

# Redémarrer conteneurs actifs
restart: ## Redémarrer seulement les conteneurs actuellement actifs
	@echo "🔄 Redémarrage des services JobbingTrack actifs..."
	@ACTIVE_CONTAINERS=$$(docker ps -q --filter "name=jobbingtrack-*" | wc -l); \
	if [ "$$ACTIVE_CONTAINERS" -eq 0 ]; then \
		echo "ℹ️  Aucun conteneur JobbingTrack en cours d'exécution"; \
		echo "💡 Utilisez 'make up' pour démarrer les services essentiels"; \
		echo "💡 Utilisez 'make restart-clean' pour un redémarrage complet"; \
		exit 0; \
	fi
	@echo "🔄 Redémarrage de $$ACTIVE_CONTAINERS conteneur(s)..."
	$(call docker_compose, $(COMPOSE_FILES_FULL) restart)
	@echo "⏳ Attente que les services redémarrent..."
	@sleep 10
	@echo "📊 État des services après redémarrage:"
	@docker ps --filter "name=jobbingtrack-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || true
	@echo "✅ Services redémarrés"

# Redémarrage complet avec nettoyage
restart-clean: ## Redémarrage complet avec nettoyage
	@echo "🔄 Redémarrage complet de JobbingTrack (avec nettoyage)..."
	@echo "🧹 Nettoyage complet avant redémarrage..."
	$(call docker_compose, $(COMPOSE_FILES_FULL) down --remove-orphans --volumes --timeout 30) || true
	@docker ps -q --filter "name=jobbingtrack-*" | xargs -r docker stop --time 30 || true
	@docker ps -aq --filter "name=jobbingtrack-*" | xargs -r docker rm -f || true
	@docker network prune -f || true
	@echo "⏳ Attente de 5 secondes..."
	@sleep 5
	$(MAKE) up
	@echo "✅ Système redémarré (nettoyé et services essentiels)"

# Redémarrage forcé
restart-force: ## Redémarrer avec nettoyage forcé complet
	@echo "⚠️  REDÉMARRAGE FORCÉ - Nettoyage complet"
	$(MAKE) clean-force
	@echo "⏳ Attente de 5 secondes après nettoyage..."
	@sleep 5
	$(MAKE) up-full
	@echo "✅ Système redémarré après nettoyage forcé"

# ============================================================================
# PROFILS ET SERVICES INDIVIDUELS
# ============================================================================

# Démarrer un profil spécifique
up-profile: ## Démarrer un profil spécifique (PROFILE=nom)
	@if [ -z "$(PROFILE)" ]; then \
		echo "❌ Spécifiez le profil avec PROFILE=<nom>"; \
		echo ""; \
		echo "📋 Exemples:"; \
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

# Démarrer service d'authentification
start-auth: ## Démarrer le service d'authentification
	@echo "🔐 Démarrage du service d'authentification..."
	$(call check_docker)
	$(call docker_compose, $(COMPOSE_FILES_FULL) --profile auth up -d)
	@echo "✅ Service d'authentification démarré"

# Démarrer service d'applications
start-applications: ## Démarrer le service d'applications
	@echo "📋 Démarrage du service d'applications..."
	$(call check_docker)
	$(call docker_compose, $(COMPOSE_FILES_FULL) --profile applications up -d)
	@echo "✅ Service d'applications démarré"

# Arrêter un service spécifique
stop-service: ## Arrêter un service spécifique (SERVICE=nom)
	@if [ -z "$(SERVICE)" ]; then \
		echo "❌ Spécifiez le service avec SERVICE=<nom>"; \
		echo "📋 Exemple: make stop-service SERVICE=api-gateway"; \
		exit 1; \
	fi
	@echo "🛑 Arrêt du service: $(SERVICE)"
	$(call docker_compose, $(COMPOSE_FILES_FULL) stop $(SERVICE))
	@echo "✅ Service $(SERVICE) arrêté"

# Redémarrer un service spécifique
restart-service: ## Redémarrer un service spécifique (SERVICE=nom)
	@if [ -z "$(SERVICE)" ]; then \
		echo "❌ Spécifiez le service avec SERVICE=<nom>"; \
		echo "📋 Exemple: make restart-service SERVICE=api-gateway"; \
		exit 1; \
	fi
	@echo "🔄 Redémarrage du service: $(SERVICE)"
	$(call docker_compose, $(COMPOSE_FILES_FULL) restart $(SERVICE))
	@echo "✅ Service $(SERVICE) redémarré"

# Logs d'un service spécifique
logs-service: ## Voir les logs d'un service spécifique (SERVICE=nom)
	@if [ -z "$(SERVICE)" ]; then \
		echo "❌ Spécifiez le service avec SERVICE=<nom>"; \
		echo "📋 Exemple: make logs-service SERVICE=api-gateway"; \
		exit 1; \
	fi
	$(call docker_compose, $(COMPOSE_FILES_FULL) logs -f $(SERVICE))

# ============================================================================
# STATUS ET LOGS
# ============================================================================

# Statut détaillé
status: ## Statut détaillé de chaque service
	@echo "📊 Statut détaillé des services JobbingTrack"
	@echo "=========================================="
	@echo ""
	@echo "🔴 Services essentiels:"
	@docker ps --filter "name=jobbingtrack-*" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null | grep -E "postgres|redis|api-gateway|frontend|auth-service|dashboard-service" || echo "  Aucun service essentiel en cours"
	@echo ""
	@echo "🟡 Services optionnels:"
	@docker ps --filter "name=jobbingtrack-*" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null | grep -v -E "postgres|redis|api-gateway|frontend|auth-service|dashboard-service" || echo "  Aucun service optionnel en cours"

# Liste conteneurs actifs
ps: ## Liste les conteneurs actifs
	@echo "📦 Conteneurs actifs JobbingTrack"
	@echo "================================"
	$(call docker_compose, $(COMPOSE_FILES_FULL) ps)

# Logs en temps réel
logs: ## Affiche tous les logs en temps réel
	@echo "📋 Logs en temps réel de tous les services"
	@echo "========================================"
	$(call docker_compose, $(COMPOSE_FILES_FULL) logs -f)
