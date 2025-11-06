# ============================================================================
# Makefile Services - JobbingTrack
# ============================================================================
# Gestion du démarrage, arrêt, restart des services Docker
# ============================================================================

.PHONY: up down up-full up-no-check up-mickdevil up-with-mobile up-for-tests restart restart-clean restart-force up-profile start-auth start-applications stop-service restart-service logs-service status logs ps help-services

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
	$(call check_help_read,up)
	@echo "🚀 Démarrage des services essentiels JobbingTrack..."
	@echo "📦 Services: postgres, redis, api-gateway, frontend, auth-service, dashboard-service, metrics-aggregator"
	$(call check_docker)
	$(call check_and_free_ports)
	$(call ensure_docker_network)
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) up -d postgres redis api-gateway frontend auth-service dashboard-service jobbingtrack-metrics-aggregator)
	@echo ""
	@echo "✅ Services essentiels démarrés avec succès !"
	@echo ""
	@echo "🌐 Interfaces disponibles :"
	@echo "   Frontend:           http://localhost:8080"
	@echo "   API Gateway:        http://localhost:3000"
	@echo "   Auth Service:       http://localhost:8001"
	@echo "   Dashboard Service:  http://localhost:8012"
	@echo "   Metrics:            http://localhost:8014"
	@echo ""
	@echo "🔑 Identifiants de connexion :"
	@echo "   Email:    ${ADMIN_EMAIL:-admin@jobbingtrack.test}"
	@echo "   Password: ${ADMIN_PASSWORD:-password123}"
	@echo ""
	@echo "💡 Utilisez 'make up-full' pour démarrer tous les services"

# Démarrer SANS vérification Docker
up-no-check: ## Démarrer services essentiels SANS vérification Docker (mode contournement)
	@echo "🚀 Démarrage services essentiels (mode NO-CHECK)..."
	@echo "⚠️  ATTENTION: Vérifications Docker ignorées"
	$(call check_and_free_ports)
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) up -d postgres redis api-gateway frontend auth-service dashboard-service jobbingtrack-metrics-aggregator)
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

# Démarrer services pour TESTS de parcours
up-for-tests: ## Démarrer UNIQUEMENT les services nécessaires pour les tests de parcours utilisateur
	@echo "================================================================"
	@echo "🧪 DÉMARRAGE - Services pour Tests de Parcours"
	@echo "================================================================"
	@echo ""
	@echo "📦 Démarrage des services essentiels pour les tests..."
	@echo ""
	$(call check_and_free_ports)
	@echo "🗄️  1/3 - Base de données..."
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) up -d postgres redis)
	@sleep 3
	@echo ""
	@echo "🌐 2/3 - API Gateway et Services Core..."
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) up -d api-gateway auth-service dashboard-service)
	@sleep 2
	@echo ""
	@echo "📦 3/3 - Services Métier..."
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) up -d application-service company-service contact-service interview-service event-service followup-service call-service)
	@sleep 2
	@echo ""
	@echo "🌐 4/5 - Frontend (interface web de test)..."
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) up -d frontend)
	@sleep 3
	@echo ""
	@echo "📊 5/5 - Metrics Aggregator (monitoring temps réel)..."
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) up -d jobbingtrack-metrics-aggregator)
	@sleep 2
	@echo ""
	@echo "================================================================"
	@echo "✅ SERVICES DE TEST DÉMARRÉS !"
	@echo "================================================================"
	@echo ""
	@echo "🌐 Services Actifs :"
	@echo "   ✅ PostgreSQL       - Base de données"
	@echo "   ✅ Redis            - Cache"
	@echo "   ✅ API Gateway      - http://localhost:3000"
	@echo "   ✅ Auth Service     - Authentification"
	@echo "   ✅ Dashboard        - Statistiques"
	@echo "   ✅ Applications     - Candidatures"
	@echo "   ✅ Contacts         - Gestion contacts"
	@echo "   ✅ Interviews       - Entretiens"
	@echo "   ✅ Events           - Événements calendrier"
	@echo "   ✅ Followups        - Relances"
	@echo "   ✅ Calls            - Appels téléphoniques"
	@echo "   ✅ Frontend         - http://localhost:8080"
	@echo "   ✅ Metrics Aggreg.  - http://localhost:8014 (monitoring)"
	@echo ""
	@echo "🧪 Pages de Test :"
	@echo "   📋 User Journey  : http://localhost:8080/backoffice/user-journey"
	@echo "   📊 Statistiques  : http://localhost:8080/backoffice"
	@echo ""
	@echo "🔑 Identifiants :"
	@echo "   Email:    admin@jobbingtrack.test"
	@echo "   Password: password123"
	@echo ""
	@echo "⏱️  Attendez 10-15 secondes que tous les services soient prêts..."
	@echo ""
	@echo "💡 Commandes utiles :"
	@echo "   make logs              # Voir les logs de tous les services"
	@echo "   make health            # Vérifier l'état des services"
	@echo "   make down              # Arrêter tous les services"
	@echo ""

# Démarrer projet COMPLET avec Mobile
up-with-mobile: ## Démarrer TOUT le projet (Backend + Frontend + Mobile sur smartphone)
	@echo "================================================================"
	@echo "🚀 DÉMARRAGE COMPLET - JobbingTrack + Mobile"
	@echo "================================================================"
	@echo ""
	@echo "📦 Phase 1/4 - Services Backend..."
	$(call check_and_free_ports)
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) up -d postgres redis)
	@sleep 3
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) up -d api-gateway auth-service dashboard-service)
	@sleep 2
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) up -d application-service company-service contact-service interview-service)
	@sleep 2
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) up -d call-service event-service followup-service notification-service)
	@echo "✅ Backend démarré !"
	@echo ""
	@echo "📦 Phase 2/4 - Frontend..."
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) up -d frontend)
	@echo "✅ Frontend démarré !"
	@echo ""
	@echo "📦 Phase 3/4 - Monitoring..."
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) up -d jobbingtrack-metrics-aggregator cadvisor)
	@echo "✅ Monitoring démarré !"
	@echo ""
	@echo "📱 Phase 4/4 - Application Mobile Flutter..."
	@echo ""
	@echo "🔧 Configuration de l'application mobile :"
	@echo "   1. Connectez votre smartphone en USB"
	@echo "   2. Activez le mode développeur sur votre téléphone"
	@echo "   3. Activez le débogage USB"
	@echo ""
	@echo "📲 Pour démarrer l'app Flutter sur votre smartphone :"
	@echo ""
	@echo "   cd mobile && flutter devices"
	@echo "   # Listez les appareils connectés et notez l'ID"
	@echo ""
	@echo "   flutter run -d <DEVICE_ID>"
	@echo "   # Exemple: flutter run -d emulator-5554"
	@echo "   # Exemple: flutter run -d RZ8N41234AB (Android physique)"
	@echo ""
	@echo "🌐 Ou utilisez l'émulateur mobile intégré :"
	@echo "   http://localhost:8080/backoffice/mobile-emulator"
	@echo ""
	@echo "================================================================"
	@echo "✅ PROJET COMPLET DÉMARRÉ !"
	@echo "================================================================"
	@echo ""
	@echo "🌐 Interfaces disponibles :"
	@echo "   Frontend/Backoffice:  http://localhost:8080"
	@echo "   API Gateway:          http://localhost:3000"
	@echo "   Auth Service:         http://localhost:8001"
	@echo "   Dashboard Service:    http://localhost:8012"
	@echo "   Metrics:              http://localhost:8014"
	@echo "   Émulateur Mobile:     http://localhost:8080/backoffice/mobile-emulator"
	@echo "   Parcours Utilisateur: http://localhost:8080/backoffice/user-journey"
	@echo ""
	@echo "📱 Application Mobile Flutter :"
	@echo "   - Connectez votre smartphone et lancez: cd mobile && flutter run"
	@echo "   - OU utilisez l'émulateur intégré dans le backoffice"
	@echo ""
	@echo "🔑 Identifiants de connexion :"
	@echo "   Email:    admin@jobbingtrack.test"
	@echo "   Password: password123"
	@echo ""
	@echo "🧪 Tests disponibles :"
	@echo "   make test                  # Tous les tests"
	@echo "   make test-mobile           # Tests mobile spécifiques"
	@echo ""
	@echo "📖 Documentation :"
	@echo "   GUIDE_TESTS_PARCOURS.md    # Guide utilisation des tests"
	@echo "   RECAPITULATIF_FINAL.md     # Vue d'ensemble complète"
	@echo ""

# Démarrer TOUS les services
up-full: ## Démarrer TOUS les services avec tous les profils
	@echo "🔄 Démarrage complet de JobbingTrack avec nettoyage en profondeur..."
	@echo "🚀 Tous les services avec métriques complètes"
	@echo "⚠️  Mode sans vérification Docker"
	
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
	
	# Démarrer TOUS les autres services avec le profil 'full'
	@echo "🚀 Démarrage de tous les microservices (profil full)..."
	@docker-compose -f docker-compose.yml --profile full up -d
	
	# Services monitoring supplémentaires
	# ⚠️ DÉSACTIVÉ - Utilisez 'make monitoring-up' pour démarrer Prometheus, etc.
	# docker-compose.metrics.yml est obsolète, utilisez monitoring/docker-compose.monitoring.yml
	# @if [ -f "docker-compose.metrics.yml" ]; then \
	# 	echo "📊 Démarrage des services de monitoring supplémentaires..."; \
	# 	docker-compose -f docker-compose.metrics.yml up -d; \
	# fi
	
	# Attendre que les services soient prêts
	@echo "⏳ Attente que les services soient prêts (5s)..."
	@sleep 5
	
	# Vérification
	@echo "✅ Tous les services ont été démarrés"
	@echo ""
	@echo "🌐 Accès aux services :"
	@echo "  - Frontend:           http://localhost:8080"
	@echo "  - API Gateway:        http://localhost:3000"
	@echo "  - Metrics Aggregator: http://localhost:8014"
	@echo ""
	
	# Vérification Prisma migrations
	@echo "🔍 Vérification des migrations Prisma..."
	@if docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c "\dt \"User\"" 2>&1 | grep -q "Did not find any relation"; then \
		echo "⚠️  ATTENTION: Les migrations Prisma ne sont pas appliquées !"; \
		echo ""; \
		echo "💡 Pour appliquer les migrations, lancez:"; \
		echo "    make db-migrate"; \
		echo ""; \
	else \
		echo "✅ Migrations Prisma appliquées"; \
	fi
	
	# Vérification utilisateur admin
	@echo "🔍 Vérification de l'utilisateur administrateur..."
	@if docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -t -c "SELECT COUNT(*) FROM \"User\" WHERE email = 'admin@jobbingtrack.test';" 2>/dev/null | grep -q "^\\s*0"; then \
		echo "⚠️  ATTENTION: L'utilisateur administrateur n'existe pas !"; \
		echo ""; \
		echo "💡 Pour créer l'utilisateur admin, lancez:"; \
		echo "    make create-admin-user"; \
		echo ""; \
		echo "🔑 Identifiants qui seront créés:"; \
		echo "    Email:    admin@jobbingtrack.test"; \
		echo "    Password: password123"; \
		echo ""; \
	else \
		echo "✅ Utilisateur administrateur existe"; \
		echo ""; \
		echo "🔑 Identifiants Admin:"; \
		echo "    Email:    admin@jobbingtrack.test"; \
		echo "    Password: password123"; \
		echo ""; \
	fi
	
	@echo "📊 Pour démarrer le monitoring complet (Prometheus, Grafana):"
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

# Rebuild de toutes les images
rebuild: ## Reconstruire toutes les images Docker (sans cache)
	@echo "🔨 Reconstruction de toutes les images Docker..."
	@echo ""
	@echo "🛑 Arrêt des services..."
	@$(MAKE) down
	@echo ""
	@echo "🗑️  Suppression des anciennes images JobbingTrack..."
	@docker images | grep "jobbingtrack-" | awk '{print $$3}' | xargs -r docker rmi -f 2>/dev/null || true
	@echo ""
	@echo "🔨 Rebuild avec --no-cache..."
	@docker-compose -f docker-compose.yml --profile full build --no-cache
	@echo ""
	@echo "✅ Rebuild terminé !"
	@echo ""
	@echo "💡 Pour démarrer: make up-full"

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
status: ## Statut détaillé de chaque service (avec couleurs UP/DOWN)
	@echo "📊 Statut détaillé des services JobbingTrack"
	@echo "=========================================="
	@echo ""
	@echo "🔴 Services essentiels:"
	@echo ""
	@services="postgres redis api-gateway frontend auth-service dashboard-service"; \
	for service in $$services; do \
		container="jobbingtrack-$$service"; \
		if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^$$container$$"; then \
			status=$$(docker ps --filter "name=$$container" --format "{{.Status}}" 2>/dev/null); \
			ports=$$(docker ps --filter "name=$$container" --format "{{.Ports}}" 2>/dev/null | head -c 40); \
			printf "  \033[1;32m✅ UP\033[0m   %-30s %s\n" "$$service" "$$ports"; \
		else \
			printf "  \033[1;31m❌ DOWN\033[0m %-30s\n" "$$service"; \
		fi; \
	done
	@echo ""
	@echo "🟡 Services optionnels:"
	@echo ""
	@services="application-service company-service contact-service interview-service event-service followup-service call-service metrics-aggregator mailhog"; \
	for service in $$services; do \
		container="jobbingtrack-$$service"; \
		if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^$$container$$"; then \
			status=$$(docker ps --filter "name=$$container" --format "{{.Status}}" 2>/dev/null); \
			ports=$$(docker ps --filter "name=$$container" --format "{{.Ports}}" 2>/dev/null | head -c 40); \
			printf "  \033[1;32m✅ UP\033[0m   %-30s %s\n" "$$service" "$$ports"; \
		else \
			printf "  \033[1;90m⚪ DOWN\033[0m %-30s\n" "$$service"; \
		fi; \
	done
	@echo ""
	@up_count=$$(docker ps --filter "name=jobbingtrack-*" --format '{{.Names}}' 2>/dev/null | wc -l); \
	all_count=15; \
	if [ $$up_count -eq 0 ]; then \
		echo "📊 Résumé : \033[1;31m$$up_count/$$all_count services actifs\033[0m"; \
	elif [ $$up_count -lt 6 ]; then \
		echo "📊 Résumé : \033[1;33m$$up_count/$$all_count services actifs\033[0m"; \
	else \
		echo "📊 Résumé : \033[1;32m$$up_count/$$all_count services actifs\033[0m"; \
	fi

# Liste conteneurs actifs
ps: ## Liste les conteneurs actifs
	@echo "📦 Conteneurs actifs JobbingTrack"
	@echo "================================"
	$(call docker_compose, $(COMPOSE_FILES_FULL) ps)

# Logs en temps réel (sans metrics-aggregator)
logs: ## Affiche tous les logs en temps réel (sauf metrics-aggregator)
	@echo "📋 Logs en temps réel de tous les services (sauf metrics-aggregator)"
	@echo "========================================================================"
	@echo "💡 Pour voir les logs de metrics-aggregator: make logs-metrics"
	@echo ""
	@docker logs jobbingtrack-api-gateway -f 2>&1 & \
	docker logs jobbingtrack-frontend -f 2>&1 & \
	docker logs jobbingtrack-auth-service -f 2>&1 & \
	docker logs jobbingtrack-dashboard-service -f 2>&1 & \
	docker logs jobbingtrack-application-service -f 2>&1 & \
	docker logs jobbingtrack-company-service -f 2>&1 & \
	docker logs jobbingtrack-contact-service -f 2>&1 & \
	docker logs jobbingtrack-interview-service -f 2>&1 & \
	docker logs jobbingtrack-event-service -f 2>&1 & \
	docker logs jobbingtrack-call-service -f 2>&1 & \
	docker logs jobbingtrack-followup-service -f 2>&1 & \
	docker logs jobbingtrack-notification-service -f 2>&1 & \
	docker logs jobbingtrack-profile-service -f 2>&1 & \
	docker logs jobbingtrack-workflow-service -f 2>&1 & \
	docker logs jobbingtrack-security-service -f 2>&1 & \
	docker logs jobbingtrack-deployment-service -f 2>&1 & \
	wait

# Logs de metrics-aggregator uniquement
logs-metrics: ## Affiche les logs du service metrics-aggregator
	@echo "📊 Logs de metrics-aggregator"
	@echo "=============================="
	@docker logs jobbingtrack-metrics-aggregator -f
