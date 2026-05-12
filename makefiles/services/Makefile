# ============================================================================
# Makefile Services - JobbingTrack
# ============================================================================
# Gestion du démarrage, arrêt, restart des services Docker
# ============================================================================

.PHONY: setup install-docker install-emojis fix-frontend dev-https-certs dev-https-install-ca dev-https-up dev-https-down dev-https-status _up-full-internal up down down-keep-data down-clean up-full up-full-mickdevil up-no-check up-mickdevil up-with-mobile up-for-tests up-monitoring restart restart-metrics-recreate monitoring-clock-refresh restart-tests-api-services restart-clean restart-force restart-full fix-unhealthy-healthchecks up-profile start-auth start-applications stop-service restart-service build-full rebuild rebuild-service rebuild-metrics-aggregator rebuild-monitoring-c start-service up-service logs-service status status-watch status-live logs logs-watch ps help-services

# ============================================================================
# INSTALLATION
# ============================================================================

# Setup complet du projet (première installation)
setup: ## Setup complet du projet (installation initiale)
	@echo "🚀 Setup Complet - JobbingTrack"
	@echo "================================================================"
	@echo ""
	@echo "📋 Étapes du setup :"
	@echo "  1. Vérification Docker"
	@echo "  2. Installation Docker (si nécessaire)"
	@echo "  3. Configuration permissions"
	@echo "  4. Démarrage services"
	@echo "  5. Migrations base de données"
	@echo "  6. Création utilisateur admin"
	@echo ""
	@echo "⏳ Démarrage du setup..."
	@echo ""
	
	# Vérifier Docker
	@if ! command -v docker &>/dev/null 2>&1; then \
		echo "⚠️  Docker n'est pas installé"; \
		echo ""; \
		echo "💡 Installation Docker..."; \
		$(MAKE) install-docker; \
		echo ""; \
		echo "⚠️  IMPORTANT: Redémarrer la session ou exécuter: newgrp docker"; \
		echo ""; \
		read -p "Appuyez sur Entrée après avoir redémarré la session Docker..."; \
	fi
	
	# Proposer installation emojis (optionnel)
	@echo ""
	@echo "😀 Voulez-vous installer les polices d'emojis ? (recommandé pour voir tous les emojis)"
	@echo "   Tapez 'o' pour installer maintenant, ou Entrée pour ignorer"
	@read -t 5 -p "   Votre choix: " emoji_choice || emoji_choice=""; \
	if [ "$$emoji_choice" = "o" ] || [ "$$emoji_choice" = "O" ]; then \
		echo ""; \
		$(MAKE) install-emojis || echo "⚠️  Installation emojis ignorée"; \
	fi
	@echo ""
	
	# Vérifier permissions Docker
	@if ! docker ps &>/dev/null 2>&1; then \
		echo "⚠️  Problème de permissions Docker"; \
		echo ""; \
		echo "💡 Solution:"; \
		echo "   sudo usermod -aG docker $$USER"; \
		echo "   newgrp docker"; \
		echo ""; \
		exit 1; \
	fi
	
	@echo "✅ Docker OK"
	@echo ""
	
	# Démarrer les services
	@echo "🚀 Démarrage des services..."
	$(MAKE) up-full
	
	@echo ""
	@echo "⏳ Attente de l'initialisation (30s)..."
	@sleep 30
	
	# Migrations
	@echo ""
	@echo "📊 Application des migrations Prisma..."
	@echo "⏳ Cela peut prendre quelques secondes..."
	$(MAKE) db-push-all || echo "⚠️  Migrations déjà appliquées ou erreur"
	@echo ""
	@echo "⏳ Attente supplémentaire pour que les tables soient créées (5s)..."
	@sleep 5
	
	# Créer admin
	@echo ""
	@echo "👤 Création de l'utilisateur administrateur..."
	$(MAKE) create-admin-user || echo "⚠️  Utilisateur admin existe déjà"
	
	@echo ""
	@echo "✅ Setup terminé !"
	@echo ""
	@echo "🌐 Accès aux services :"
	@echo "  - Frontend:    http://localhost:5003"
	@echo "  - API Gateway: http://localhost:5002"
	@echo ""
	@echo "🔑 Identifiants Admin :"
	@echo "  Email:    admin@jobbingtrack.test"
	@echo "  Password: password123"
	@echo ""
	@echo "📖 Documentation: docs/getting-started/GUIDE_SETUP_COMPLET.md"

# Installer Docker et Docker Compose automatiquement
install-docker: ## Installer Docker et Docker Compose automatiquement
	@echo "🐳 Installation Docker et Docker Compose pour JobbingTrack"
	@echo "================================================================"
	@if [ ! -f "$(ROOT_DIR)/scripts/setup/install-docker.sh" ]; then \
		echo "❌ Script d'installation non trouvé: scripts/setup/install-docker.sh"; \
		exit 1; \
	fi
	@echo "🚀 Lancement du script d'installation..."
	@echo ""
	@bash "$(ROOT_DIR)/scripts/setup/install-docker.sh"

# Installer les emojis sur le système
install-emojis: ## Installer les polices d'emojis sur le système
	@echo "😀 Installation des Emojis pour JobbingTrack"
	@echo "================================================================"
	@if [ ! -f "$(ROOT_DIR)/scripts/setup/install-emojis.sh" ]; then \
		echo "❌ Script d'installation non trouvé: scripts/setup/install-emojis.sh"; \
		exit 1; \
	fi
	@echo "🚀 Lancement du script d'installation..."
	@echo ""
	@bash "$(ROOT_DIR)/scripts/setup/install-emojis.sh"

# Fixer le frontend (rebuild + restart)
fix-frontend: ## Rebuild et redémarrer le frontend (fix erreurs JavaScript)
	@echo "🔧 Fix Frontend - Rebuild et redémarrage"
	@echo "================================================================"
	@echo ""
	@echo "1️⃣ Arrêt du frontend..."
	@docker stop jobbingtrack-frontend 2>/dev/null || true
	@docker rm jobbingtrack-frontend 2>/dev/null || true
	@echo ""
	@echo "2️⃣ Nettoyage du cache Next.js..."
	@rm -rf frontend/.next 2>/dev/null || true
	@docker volume rm jobbingtrack_frontend-next 2>/dev/null || true
	@echo ""
	@echo "3️⃣ Rebuild du frontend..."
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) build --no-cache frontend)
	@echo ""
	@echo "4️⃣ Redémarrage du frontend..."
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) up -d frontend)
	@echo ""
	@echo "⏳ Attente du démarrage (15s)..."
	@sleep 15
	@echo ""
	@echo "✅ Frontend fixé !"
	@echo ""
	@echo "🌐 Accès: http://localhost:5003"
	@echo ""
	@echo "📋 Vérifier les logs: make logs-service SERVICE=frontend"

dev-https-certs: ## Générer les certificats HTTPS locaux (hors Git)
	@bash "$(ROOT_DIR)/scripts/ops/dev-https-certs.sh"

dev-https-install-ca: ## Générer les certificats et installer la CA locale si l'outil système le permet
	@DEV_HTTPS_INSTALL_CA=1 bash "$(ROOT_DIR)/scripts/ops/dev-https-certs.sh"

dev-https-up: dev-https-certs ## Démarrer le proxy HTTPS dev (https://jobbingtrack.localhost:5443)
	@echo "🔐 Démarrage du proxy HTTPS dev..."
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) -f docker-compose.https.yml --profile https up -d dev-https-proxy)
	@printf '%s\n' up-https > "$(ROOT_DIR)/.jobbingtrack-stack-mode"
	@echo ""
	@echo "✅ HTTPS dev disponible :"
	@echo "   Frontend:    https://jobbingtrack.localhost:$${DEV_HTTPS_PORT:-5443}"
	@echo "   API Gateway: https://api.jobbingtrack.localhost:$${DEV_HTTPS_PORT:-5443}"
	@echo ""
	@echo "Si le navigateur affiche une erreur certificat, lancez : make dev-https-install-ca"

dev-https-down: ## Arrêter uniquement le proxy HTTPS dev
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) -f docker-compose.https.yml --profile https stop dev-https-proxy)

dev-https-status: ## Vérifier les certificats et le proxy HTTPS dev
	@bash "$(ROOT_DIR)/scripts/ops/dev-https-certs.sh" >/dev/null
	@if docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^jobbingtrack-dev-https-proxy$$'; then \
		echo "✅ Proxy HTTPS dev actif"; \
	else \
		echo "⚠️  Proxy HTTPS dev arrêté. Lancez: make dev-https-up"; \
	fi
	@echo "Frontend:    https://jobbingtrack.localhost:$${DEV_HTTPS_PORT:-5443}"
	@echo "API Gateway: https://api.jobbingtrack.localhost:$${DEV_HTTPS_PORT:-5443}"

# ============================================================================
# AIDE
# ============================================================================

help-services: ## Afficher l'aide services
	@echo "================================================================"
	@echo "🚀 SERVICES - Commandes disponibles"
	@echo "================================================================"
	@echo ""
	@echo "🔧 INSTALLATION & SETUP:"
	@echo "  make setup                  - Setup complet du projet (première installation)"
	@echo "  make install-docker        - Installer Docker et Docker Compose automatiquement"
	@echo "  make install-emojis        - Installer les polices d'emojis sur le système"
	@echo "  make fix-frontend          - Rebuild et redémarrer le frontend (fix erreurs JS)"
	@echo ""
	@echo "🚀 DÉMARRAGE:"
	@echo "  make start                 - Alias de up-full (démarrer sans rebuild)"
	@echo "  make fresh-start           - down + build + up-full + status (rebuild complet)"
	@echo "  make up                    - Services essentiels (postgres, redis, gateway, frontend, auth)"
	@echo "  make dev-https-up          - Proxy HTTPS local fiable (https://jobbingtrack.localhost:5443)"
	@echo "  make dev-https-certs       - Générer les certificats HTTPS dev locaux"
	@echo "  make dev-https-install-ca  - Générer + installer la CA locale si possible"
	@echo "  make up-no-check           - Sans vérification Docker"
	@echo "  make up-full               - TOUS les services (avec vérification Docker)"
	@echo "  make up-full-mickdevil    - TOUS les services (SANS vérification Docker)"
	@echo "  make up-profile PROFILE=x  - Par profil (auth, applications, companies, etc.)"
	@echo "  make up-monitoring         - Postgres + monitoring-c + metrics-aggregator (stack monitoring seul)"
	@echo ""
	@echo "🛑 ARRÊT:"
	@echo "  make down                  - Arrêter tous les services (données conservées)"
	@echo "  make down-clean           - Arrêter + supprimer les volumes (tout effacer)"
	@echo "  make stop-service SERVICE=x - Arrêter un service"
	@echo ""
	@echo "🔄 RESTART:"
	@echo "  make restart               - Redémarrer les conteneurs actifs (sans recréation : env compose inchangées)"
	@echo "  make restart-metrics-recreate - Recrée monitoring-c + metrics-aggregator (TZ / env / image)"
	@echo "  make monitoring-clock-refresh - Recrée postgres + monitoring-c + agrégateur (applique .env fuseaux, volumes OK)"
	@echo "  make restart-tests-api-services - Redémarrer application, interview, call, followup (fix tests API isArchived)"
	@echo "  make restart-clean         - Redémarrage + nettoyage"
	@echo "  make restart-full          - Redémarrage complet en conservant la DB (ex. après setup-ports)"
	@echo "  make restart-service SERVICE=nom - Redémarrer un service (nom = comme dans make status)"
	@echo "      Ex: make restart-service SERVICE=metrics-aggregator"
	@echo ""
	@echo "📊 STATUS & LOGS:"
	@echo "  make status                - Statut détaillé des services"
	@echo "  make status-watch          - Statut en boucle (INTERVAL=5) : ALTSCREEN=1 défaut = buffer terminal alternatif (remplace l’affichage sans polluer le scrollback) ; ALTSCREEN=0 + CLEAR=1 = clear classique ; STATUS_FOLD=0 pour désactiver le retour à la ligne selon largeur terminal"
	@echo "  make status-live           - Idem, INTERVAL=2s par défaut (même options ALTSCREEN / CLEAR / STATUS_FOLD)"
	@echo "  STATUS_LEGEND=1 make status — affiche la légende longue des ports (désactivée par défaut)"
	@echo "  make ps                    - Liste conteneurs actifs"
	@echo "  make logs                  - Tous les logs"
	@echo "  make logs-service SERVICE=x - Logs d'un service"
	@echo ""
	@echo "🎯 PROFILS DISPONIBLES:"
	@echo "  auth, applications, companies, contacts, interviews"
	@echo "  calls, events, followups, profiles, notifications"
	@echo "  workflows, dashboard, security, monitoring, full"
	@echo ""
	@echo "🔨 REBUILD (depuis la racine):"
	@echo "  make rebuild-metrics-aggregator   - Reconstruire l'agrégateur de métriques"
	@echo "  make rebuild-monitoring-c        - Reconstruire le collecteur C"
	@echo "  make rebuild-service SERVICE=nom - Reconstruire un service (ex: auth-service)"
	@echo ""
	@echo "💡 EXEMPLES:"
	@echo "  make up                              # Essentiels"
	@echo "  make up-full                         # Tous les services + monitoring"
	@echo "  make up-profile PROFILE=applications # + Candidatures"
	@echo "  make logs-service SERVICE=api-gateway # Logs gateway"
	@echo ""
	@echo "📖 Documentation: docs/development/makefile/README.md"
	@echo ""

# ============================================================================
# DÉMARRAGE DES SERVICES
# ============================================================================

# Démarrer services essentiels
up: ## Démarrer services essentiels (postgres, redis, api-gateway, frontend, auth, dashboard) + monitoring
	$(call check_help_read,up)
	@echo "🚀 Démarrage des services essentiels JobbingTrack..."
	$(call check_docker)
	$(call check_and_free_ports)
	$(call ensure_docker_network)
	@echo "🚀 Démarrage des services essentiels..."
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) up -d postgres redis api-gateway frontend auth-service dashboard-service)
	@echo ""
	@echo "🚀 Démarrage des services optionnels (profil full)..."
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) --profile full up -d)
	@echo ""
	@echo "📊 Démarrage du monitoring (monitoring-c + metrics-aggregator)..."
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) --profile monitoring up -d monitoring-c jobbingtrack-metrics-aggregator)
	@echo ""
	@echo "✅ Services essentiels démarrés avec succès !"
	@echo ""
	@echo "🌐 Interfaces disponibles :"
	@echo "   Frontend:           http://localhost:5003"
	@echo "   API Gateway:        http://localhost:5002"
	@echo "   Auth Service:       http://localhost:5005"
	@echo "   Dashboard Service:  http://localhost:5015"
	@echo "   Metrics:            http://localhost:5004"
	@echo ""
	@echo "🔑 Identifiants de connexion :"
	@echo "   Email:    ${ADMIN_EMAIL:-admin@jobbingtrack.test}"
	@echo "   Password: ${ADMIN_PASSWORD:-password123}"
	@echo ""
	@echo "💡 Utilisez 'make up-full' pour démarrer tous les services"
	@printf '%s\n' up-essential > "$(ROOT_DIR)/.jobbingtrack-stack-mode"

# Démarrer SANS vérification Docker
up-no-check: ## Démarrer services essentiels SANS vérification Docker (mode contournement)
	@echo "🚀 Démarrage services essentiels (mode NO-CHECK)..."
	@echo "⚠️  ATTENTION: Vérifications Docker ignorées"
	$(call check_and_free_ports)
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) up -d postgres redis api-gateway frontend auth-service dashboard-service)
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) --profile full up -d)
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) --profile monitoring up -d monitoring-c jobbingtrack-metrics-aggregator)
	@echo ""
	@echo "✅ Services démarrés (mode NO-CHECK)!"
	@printf '%s\n' up-essential > "$(ROOT_DIR)/.jobbingtrack-stack-mode"

# Démarrer uniquement la stack monitoring (Postgres + monitoring-c + metrics-aggregator)
up-monitoring: ## Démarrer uniquement le monitoring (postgres, monitoring-c, metrics-aggregator)
	@echo "📊 Démarrage de la stack monitoring..."
	$(call ensure_docker_network)
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) up -d postgres)
	@echo "⏳ Attente PostgreSQL (10s)..."
	@sleep 10
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) --profile monitoring up -d --build monitoring-c jobbingtrack-metrics-aggregator)
	@echo ""
	@echo "✅ Stack monitoring démarrée."
	@echo "  - monitoring-c:       http://localhost:5098"
	@echo "  - metrics-aggregator: http://localhost:5004"
	@echo "  - Postgres:           prêt pour persistance"
	@echo ""
	@echo "🌐 Interfaces disponibles :"
	@echo "   Frontend:    http://localhost:5003"
	@echo "   API Gateway: http://localhost:5002"
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
	@echo "📊 5/5 - Monitoring (monitoring-c + metrics-aggregator)..."
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) --profile monitoring up -d monitoring-c jobbingtrack-metrics-aggregator)
	@sleep 2
	@echo ""
	@echo "================================================================"
	@echo "✅ SERVICES DE TEST DÉMARRÉS !"
	@echo "================================================================"
	@echo ""
	@echo "🌐 Services Actifs :"
	@echo "   ✅ PostgreSQL       - Base de données"
	@echo "   ✅ Redis            - Cache"
	@echo "   ✅ API Gateway      - http://localhost:5002"
	@echo "   ✅ Auth Service     - Authentification"
	@echo "   ✅ Dashboard        - Statistiques"
	@echo "   ✅ Applications     - Candidatures"
	@echo "   ✅ Contacts         - Gestion contacts"
	@echo "   ✅ Interviews       - Entretiens"
	@echo "   ✅ Events           - Événements calendrier"
	@echo "   ✅ Followups        - Relances"
	@echo "   ✅ Calls            - Appels téléphoniques"
	@echo "   ✅ Frontend         - http://localhost:5003"
	@echo "   ✅ Metrics Aggreg.  - http://localhost:5004 (monitoring)"
	@echo ""
	@echo "🧪 Pages de Test :"
	@echo "   📋 User Journey  : http://localhost:5003/backoffice/user-journey"
	@echo "   📊 Statistiques  : http://localhost:5003/backoffice"
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
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) --profile monitoring up -d monitoring-c jobbingtrack-metrics-aggregator)
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
	@echo "🌐 Émulateur mobile (rendu en direct comme Android Studio) :"
	@echo "   Le contrôleur démarre automatiquement avec make up-full."
	@echo "   Puis ouvrez : http://localhost:5003/backoffice/mobile-emulator"
	@echo "   → Sélectionnez un AVD ou un téléphone déjà connecté (adb), build APK, voyez l'écran en direct"
	@echo ""
	@echo "================================================================"
	@echo "✅ PROJET COMPLET DÉMARRÉ !"
	@echo "================================================================"
	@echo ""
	@echo "🌐 Interfaces disponibles :"
	@echo "   Frontend/Backoffice:  http://localhost:5003"
	@echo "   API Gateway:          http://localhost:5002"
	@echo "   Auth Service:         http://localhost:5005"
	@echo "   Dashboard Service:    http://localhost:5015"
	@echo "   Metrics:              http://localhost:5004"
	@echo "   Émulateur Mobile:     http://localhost:5003/backoffice/mobile-emulator"
	@echo "   Parcours Utilisateur: http://localhost:5003/backoffice/user-journey"
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

# Fonction interne pour démarrer tous les services (sans message MickDevil)
_up-full-internal:
	# Nettoyage complet (en préservant les volumes de données)
	@echo "🧹 Nettoyage complet de l'environnement Docker..."
	@echo "  ⚠️  Les volumes de données (PostgreSQL, métriques) seront préservés"
	@echo "  1/4 Arrêt et suppression des conteneurs..."
	$(call docker_compose, -f docker-compose.yml down --remove-orphans --timeout 30) 2>/dev/null || true
	
	@echo "  2/4 Suppression des conteneurs orphelins..."
	@if command -v docker &>/dev/null 2>&1; then \
		docker ps -aq --filter "name=jobbingtrack-" 2>/dev/null | xargs -r docker rm -f 2>/dev/null || true; \
	fi
	
	@echo "  3/4 Nettoyage des réseaux..."
	@if command -v docker &>/dev/null 2>&1; then \
		docker network rm backend_jobbingtrack-network jobbingtrack_jobbingtrack-network 2>/dev/null || true; \
	fi
	
	@echo "  4/4 Nettoyage des volumes orphelins (en préservant les données de métriques)..."
	@if command -v docker &>/dev/null 2>&1; then \
		echo "  ⚠️  Préservation du volume PostgreSQL (contient les métriques historiques)"; \
		docker volume ls -q --filter "name=jobbingtrack" 2>/dev/null | grep -v "postgres_data" | xargs -r docker volume rm -f 2>/dev/null || true; \
	fi
	
	# Création réseau
	$(call ensure_docker_network)
	
	# Démarrer services de base
	@echo "🚀 Démarrage des services de base (PostgreSQL, Redis)..."
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) up -d postgres redis)
	
	# Attendre PostgreSQL
	$(call wait_for_postgres)
	
	# Attendre un peu plus pour que PostgreSQL soit complètement prêt
	@echo "⏳ Attente supplémentaire pour que PostgreSQL soit complètement prêt (3s)..."
	@sleep 3
	
	# Avant la gateway : DNS joignable pour les proxys /api/v1/security/* et /api/v1/metrics (évite ENOTFOUND au boot)
	@echo "🚀 Pré-démarrage security-service + monitoring-c + metrics-aggregator..."
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) --profile full up -d security-service)
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) --profile monitoring up -d monitoring-c jobbingtrack-metrics-aggregator)
	@echo "⏳ Attente résolution des noms security / metrics (6s)..."
	@sleep 6
	
	# Démarrer services principaux
	@echo "🚀 Démarrage des services principaux..."
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) up -d api-gateway auth-service)
	
	# Attendre que auth-service soit prêt avant de continuer
	@echo "⏳ Attente que auth-service soit prêt (5s)..."
	@sleep 5
	
	# Correction DB
	$(MAKE) db-fix-role
	
	# ✅ db-push-all AVANT de démarrer les services "full" (deployment-service, etc.) pour que la table deployments existe
	@echo "📊 Création/synchronisation des tables Prisma (db-push-all)..."
	@$(MAKE) db-push-all || echo "⚠️  db-push-all a échoué ou partiel, vérifiez les logs"
	
	# Démarrer frontend
	@echo "🚀 Démarrage du frontend..."
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) up -d frontend)
	
	# Démarrer TOUS les autres services avec le profil 'full' (table deployments déjà créée ci-dessus)
	@echo "🚀 Démarrage de tous les microservices (profil full)..."
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) --profile full up -d)
	
	# Attendre que tous les conteneurs soient démarrés
	@echo "⏳ Attente que tous les services soient démarrés (8s)..."
	@sleep 8
	
	# Démarrer monitoring APRÈS db-push-all (évite « Table container_metrics_snapshots absente »)
	@echo "📊 Démarrage du monitoring (monitoring-c + metrics-aggregator)..."
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) --profile monitoring up -d monitoring-c jobbingtrack-metrics-aggregator)
	@echo "✅ Monitoring démarré (collecteur C + API agrégateur)"

	# Optionnel : log-collector-c
	@echo "📋 Démarrage du collecteur de logs (optionnel)..."
	@$(call docker_compose, $(COMPOSE_FILES_FULL) --profile monitoring-c up -d --build --no-deps log-collector-c 2>/dev/null) || echo "   ⏭️  log-collector-c ignoré (fichier monitoring absent ou erreur)"
	
	@echo "⏳ Attente finalisation (3s)..."
	@sleep 3
	
	# Vérification
	@echo "✅ Tous les services ont été démarrés"
	@echo ""
	@echo "🌐 Accès aux services :"
	@echo "  - Frontend:           http://localhost:5003"
	@echo "  - API Gateway:        http://localhost:5002"
	@echo "  - Monitoring C:       http://localhost:5098 (collecteur C)"
	@echo "  - Metrics Aggregator: http://localhost:5004 (API backoffice)"
	@echo "  - Log Collector C:    http://localhost:5099 (optionnel)"
	@echo ""
	
	# Note: La vérification Prisma est faite après le démarrage complet dans up-full
	
	# Vérification utilisateur admin (résultat trimmé pour éviter faux négatifs)
	@echo "🔍 Vérification de l'utilisateur administrateur..."
	@POSTGRES_CONTAINER=$$(docker ps -q -f name=jobbingtrack-postgres 2>/dev/null | head -1); \
	if [ -n "$$POSTGRES_CONTAINER" ]; then \
		ADMIN_COUNT=$$(docker exec $$POSTGRES_CONTAINER psql -U jobbingtrack -d jobbingtrack -t -A -c "SELECT COUNT(*) FROM \"User\" WHERE email = 'admin@jobbingtrack.test';" 2>/dev/null | tr -d ' \n\r\t' || echo ""); \
		if [ -z "$$ADMIN_COUNT" ]; then \
			echo "⚠️  Impossible de vérifier l'admin (table User ou PostgreSQL non prêt)"; \
			echo "   💡 Si besoin: make create-admin-user"; \
		elif [ "$$ADMIN_COUNT" = "0" ]; then \
			echo "⚠️  L'utilisateur administrateur n'existe pas."; \
			if [ "$${CREATE_ADMIN_IF_MISSING:-1}" = "1" ]; then \
				echo "   🔧 Création automatique de l'admin..."; \
				$(MAKE) create-admin-user || true; \
			else \
				echo ""; \
				echo "💡 Pour créer l'admin: make create-admin-user"; \
				echo "   (désactiver auto-création: CREATE_ADMIN_IF_MISSING=0 make up-full)"; \
				echo "🔑 Identifiants: admin@jobbingtrack.test / password123"; \
			fi; \
		else \
			echo "✅ Utilisateur administrateur existe"; \
			echo "   🔑 admin@jobbingtrack.test / password123"; \
		fi; \
	else \
		echo "⚠️  Conteneur PostgreSQL non trouvé"; \
	fi
	
	@echo "🔍 Pour voir les logs : make logs"
	@echo "🔍 Pour vérifier l'état : make status"
	@printf '%s\n' up-full > "$(ROOT_DIR)/.jobbingtrack-stack-mode"

# Démarrer TOUS les services (AVEC vérification Docker)
up-full: ## Démarrer TOUS les services avec tous les profils (avec vérification Docker)
	@echo "🔄 Démarrage complet de JobbingTrack avec nettoyage en profondeur..."
	@echo "🚀 Tous les services avec métriques complètes"
	
	# Vérification Docker
	$(call check_docker)
	
	# Appeler la fonction interne
	@$(MAKE) _up-full-internal
	
	# Vérifier les tables Prisma APRÈS démarrage des services
	@echo ""
	@echo "🔍 Vérification des tables Prisma..."
	@echo "⏳ Attente que PostgreSQL soit complètement prêt (10s)..."
	@sleep 10
	@if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^jobbingtrack-postgres$$"; then \
		TABLE_COUNT=$$(docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -t -A -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';" 2>/dev/null | tr -d ' \n\r' || echo "0"); \
		if [ -z "$$TABLE_COUNT" ] || [ "$$TABLE_COUNT" = "0" ] || [ "$$TABLE_COUNT" = "" ] 2>/dev/null; then \
			echo -e "\033[1;33m⚠️  Base de données vide ($$TABLE_COUNT tables détectées)\033[0m"; \
			echo -e "\033[1;33m💡 Si vous avez besoin des tables Prisma, exécutez: make db-push-all\033[0m"; \
			echo ""; \
		elif [ "$$TABLE_COUNT" -lt "5" ] 2>/dev/null; then \
			echo -e "\033[1;33m⚠️  Base de données incomplète ($$TABLE_COUNT tables, minimum 5 attendues)\033[0m"; \
			echo -e "\033[1;33m💡 Si vous avez besoin de toutes les tables, exécutez: make db-push-all\033[0m"; \
			echo ""; \
		else \
			echo -e "\033[0;32m✅ Base de données OK ($$TABLE_COUNT tables)\033[0m"; \
		fi; \
	else \
		echo "⚠️  Conteneur PostgreSQL non trouvé, vérification impossible"; \
	fi
	@echo ""
	@echo "📱 Contrôleur d'émulateur mobile (démarrage automatique)..."
	@if [ -f "$(ROOT_DIR)/tools/emulator-controller/launcher.js" ] && command -v node >/dev/null 2>&1; then \
		_port_check=0; \
		(command -v lsof >/dev/null 2>&1 && lsof -i :5056 -sTCP:LISTEN -t >/dev/null 2>&1) && _port_check=1; \
		(command -v ss >/dev/null 2>&1 && ss -ltn 2>/dev/null | grep -q ':5056 ') && _port_check=1; \
		if [ "$$_port_check" = "1" ]; then \
			echo "   ✅ Lanceur + contrôleur déjà en cours (5056 + 5055). Backoffice → Émulateur mobile."; \
		else \
			cd "$(ROOT_DIR)/tools/emulator-controller" && nohup node launcher.js > /tmp/emulator-controller.log 2>&1 & \
			echo "   ✅ Lanceur + contrôleur démarrés (5056 + 5055). Backoffice → Démarrer/Arrêter le contrôleur depuis l'interface."; \
		fi; \
	elif [ -f "$(ROOT_DIR)/tools/emulator-controller/server.js" ] && command -v node >/dev/null 2>&1; then \
		_port_check=0; \
		(command -v lsof >/dev/null 2>&1 && lsof -i :5055 -sTCP:LISTEN -t >/dev/null 2>&1) && _port_check=1; \
		if [ "$$_port_check" = "1" ]; then echo "   ✅ Contrôleur déjà en cours (5055)."; \
		else cd "$(ROOT_DIR)/tools/emulator-controller" && nohup node server.js > /tmp/emulator-controller.log 2>&1 & echo "   ✅ Contrôleur démarré (5055)."; fi; \
	else \
		echo "   ℹ️  Optionnel : lancez 'make emulator-controller' pour l'émulateur mobile."; \
	fi

# Démarrer TOUS les services (SANS vérification Docker - pour MickDevil)
up-full-mickdevil: ## Démarrer TOUS les services SANS vérification Docker (mode MickDevil)
	@echo "🔄 Démarrage complet de JobbingTrack avec nettoyage en profondeur..."
	@echo "🚀 Tous les services avec métriques complètes"
	@echo "😎 Mode MickDevil - Vérification Docker désactivée"
	
	# Appeler la fonction interne
	@$(MAKE) _up-full-internal
	@echo ""
	@echo "📱 Contrôleur d'émulateur mobile (démarrage automatique)..."
	@if [ -f "$(ROOT_DIR)/tools/emulator-controller/launcher.js" ] && command -v node >/dev/null 2>&1; then \
		_port_check=0; \
		(command -v lsof >/dev/null 2>&1 && lsof -i :5056 -sTCP:LISTEN -t >/dev/null 2>&1) && _port_check=1; \
		if [ "$$_port_check" = "1" ]; then echo "   ✅ Lanceur + contrôleur déjà en cours."; \
		else cd "$(ROOT_DIR)/tools/emulator-controller" && nohup node launcher.js > /tmp/emulator-controller.log 2>&1 & echo "   ✅ Lanceur + contrôleur démarrés (5056 + 5055)."; fi; \
	elif [ -f "$(ROOT_DIR)/tools/emulator-controller/server.js" ] && command -v node >/dev/null 2>&1; then \
		_port_check=0; \
		(command -v lsof >/dev/null 2>&1 && lsof -i :5055 -sTCP:LISTEN -t >/dev/null 2>&1) && _port_check=1; \
		if [ "$$_port_check" = "1" ]; then echo "   ✅ Contrôleur déjà en cours."; \
		else cd "$(ROOT_DIR)/tools/emulator-controller" && nohup node server.js > /tmp/emulator-controller.log 2>&1 & echo "   ✅ Contrôleur démarré (5055)."; fi; \
	else \
		echo "   ℹ️  Optionnel : make emulator-controller pour l'émulateur mobile."; \
	fi

# ============================================================================
# ARRÊT DES SERVICES
# ============================================================================

# Arrêter tous les services (conserve les volumes = BDD, Redis, admin, etc. persistent)
down: ## Arrêter tous les services (données conservées : admin, BDD, métriques)
	@echo "🛑 Arrêt de tous les services JobbingTrack (volumes conservés)..."
	@rm -f "$(ROOT_DIR)/.jobbingtrack-stack-mode"
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) down --remove-orphans)
	# Arrêter conteneurs restants (ex. log-collector-c si démarré avec monitoring)
	@docker ps -q --filter "name=jobbingtrack-*" | xargs -r docker stop || true
	@docker ps -aq --filter "name=jobbingtrack-*" | xargs -r docker rm || true
	@docker network prune -f || true
	@echo "✅ Tous les services arrêtés (données intactes : make up-full pour redémarrer)"

# Arrêter en conservant les volumes (alias : même comportement que down par défaut)
down-keep-data: ## Alias de down (données conservées)
	$(MAKE) down

# Arrêter ET supprimer les volumes (BDD effacée, admin à recréer avec make create-admin-user)
down-clean: ## Arrêter les services ET supprimer les volumes (tout effacer, admin à recréer)
	@echo "⚠️  Arrêt + suppression des volumes (données effacées)..."
	@rm -f "$(ROOT_DIR)/.jobbingtrack-stack-mode"
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) down --remove-orphans --volumes)
	@docker ps -q --filter "name=jobbingtrack-*" | xargs -r docker stop || true
	@docker ps -aq --filter "name=jobbingtrack-*" | xargs -r docker rm || true
	@docker network prune -f || true
	@echo "✅ Services arrêtés et volumes supprimés."
	@echo "💡 Au prochain make up-full : make create-admin-user si besoin (admin@jobbingtrack.test)"

# ============================================================================
# REDÉMARRAGE DES SERVICES
# ============================================================================

# Redémarrer conteneurs actifs (docker compose restart uniquement, pas down/up)
restart: ## Redémarrer seulement les conteneurs actuellement actifs (pas un down/up)
	@echo "🔄 Redémarrage des services JobbingTrack actifs..."
	@MODE=$$(cat "$(ROOT_DIR)/.jobbingtrack-stack-mode" 2>/dev/null | tr -d '\r\n' || true); \
	if [ -n "$$MODE" ]; then \
		printf '%b\n' "\033[0;90m📌 Dernier enregistrement de démarrage Makefile : \033[0;33m$$MODE\033[0;90m (fichier .jobbingtrack-stack-mode ; ignoré par Git)\033[0m"; \
		if [ "$$MODE" = "up-dev" ]; then \
			echo "   ℹ️  Dernier make up-dev (stack + db-push + seed + tests) : make restart ne relance pas les tests ni les migrations."; \
		elif [ "$$MODE" = "up-full" ]; then \
			echo "   ℹ️  Dernier make up-full : redémarrage des conteneurs uniquement."; \
		elif [ "$$MODE" = "up-essential" ]; then \
			echo "   ℹ️  Dernier make up (essentiels) : moins de microservices que up-full."; \
		fi; \
	else \
		printf '%b\n' "\033[0;90m📌 Aucun fichier .jobbingtrack-stack-mode — démarrage non enregistré depuis cette machine (make up / up-full / up-dev) ou déjà effacé par make down.\033[0m"; \
		echo "   💡 Ce n’est pas bloquant : la suite redémarre les conteneurs actifs."; \
	fi
	@echo "   💡 Nouvelles variables docker-compose (ex. TZ) ou image à jour : make restart-metrics-recreate — make restart seul ne recrée pas les conteneurs."
	@ACTIVE_CONTAINERS=$$(docker ps -q --filter "name=jobbingtrack-*" | wc -l); \
	if [ "$$ACTIVE_CONTAINERS" -eq 0 ]; then \
		echo "ℹ️  Aucun conteneur JobbingTrack en cours d'exécution"; \
		echo "💡 Utilisez 'make up' pour démarrer les services essentiels"; \
		echo "💡 Utilisez 'make restart-clean' pour un redémarrage complet"; \
		exit 0; \
	fi
	@echo ""
	@echo "🔍 Vérification des tables Prisma avant redémarrage..."
	@if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^jobbingtrack-postgres$$"; then \
		TABLE_COUNT=$$(docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -t -A -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';" 2>/dev/null | tr -d ' \n\r' || echo "0"); \
		if [ -z "$$TABLE_COUNT" ] || [ "$$TABLE_COUNT" = "0" ] || [ "$$TABLE_COUNT" -lt "5" ] 2>/dev/null; then \
			echo -e "\033[1;33m⚠️  ATTENTION : Base de données vide ou incomplète ($$TABLE_COUNT tables) !\033[0m"; \
			echo -e "\033[1;33m💡 Exécution automatique de 'make db-push-all'...\033[0m"; \
			echo ""; \
			$(MAKE) db-push-all || echo "⚠️  Erreur lors de db-push-all, continuez quand même"; \
			echo ""; \
			echo "⏳ Attente que les tables soient créées (3s)..."; \
			sleep 3; \
		fi; \
	fi
	@echo "🔄 Redémarrage de $$ACTIVE_CONTAINERS conteneur(s)..."
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) restart)
	@echo "⏳ Attente que les services redémarrent..."
	@sleep 10
	@echo "📊 État des services après redémarrage:"
	@docker ps --filter "name=jobbingtrack-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || true
	@echo "✅ Services redémarrés"

# Recréation ciblée monitoring (nouvelles env compose, image rebuild) — sans toucher Postgres ni le reste de la stack
restart-metrics-recreate: ## Recrée monitoring-c + jobbingtrack-metrics-aggregator (--force-recreate, --no-deps)
	@echo "♻️  Recréation forcée : monitoring-c + jobbingtrack-metrics-aggregator…"
	$(call check_docker)
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) --profile monitoring up -d --force-recreate --no-deps monitoring-c jobbingtrack-metrics-aggregator)
	@echo "⏳ Attente stabilisation (20s)…"
	@sleep 20
	@echo "✅ Terminé. Vérifiez les graphiques (heure = fuseau navigateur). Sinon : make rebuild-service SERVICE=metrics-aggregator"

# Remettre d’aplomb fuseaux + binaires monitoring depuis le .env (court downtime Postgres)
# REBUILD_METRICS=1 : make rebuild-service SERVICE=metrics-aggregator avant le recreate (image à jour si pas de volume src)
monitoring-clock-refresh: ## Recrée postgres + monitoring-c + metrics-aggregator (--force-recreate, volumes conservés)
	@echo "♻️  monitoring-clock-refresh : postgres + monitoring-c + jobbingtrack-metrics-aggregator"
	@echo "   → Applique POSTGRES_SYSTEM_METRICS_TZ / env compose depuis ton .env (données PostgreSQL conservées sur le volume)."
	$(call check_docker)
	@if [ "$${REBUILD_METRICS:-0}" = "1" ]; then \
		echo "🔨 REBUILD_METRICS=1 → rebuild de l’image metrics-aggregator…"; \
		$(MAKE) rebuild-service SERVICE=metrics-aggregator || exit 1; \
	fi
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) --profile monitoring up -d --force-recreate postgres monitoring-c jobbingtrack-metrics-aggregator)
	@echo "⏳ Attente stabilisation Postgres + agrégateur (35s)…"
	@sleep 35
	@echo "✅ Terminé. Recharge /backoffice/analytics/performances (heure locale navigateur)."
	@echo "💡 Sans rebuild image : make restart-metrics-recreate suffit si seule l’env a changé."

# Redémarrer les 4 services concernés par les tests API (isArchived/archived) pour charger le code à jour (volumes montés)
restart-tests-api-services: ## Redémarrer application, interview, call, followup (après modif fallback isArchived)
	@echo "🔄 Redémarrage des services Tests API (application, interview, call, followup)..."
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) restart application-service interview-service call-service followup-service)
	@echo "⏳ Attente 5s..."
	@sleep 5
	@echo "✅ Services redémarrés. Relancez les Tests API depuis le backoffice."

# Recréer les conteneurs notification, profile, workflow pour appliquer les healthchecks corrigés (/health)
fix-unhealthy-healthchecks: ## Recréer notification, profile, workflow pour appliquer les healthchecks (après correction /health)
	@echo "🔧 Recréation des conteneurs (healthcheck corrigé: /health)..."
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) up -d --force-recreate notification-service profile-service workflow-service)
	@echo "⏳ Attente du start_period des healthchecks (~45s)..."
	@sleep 45
	@echo "📊 État des services:"
	@docker ps --filter "name=jobbingtrack-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "notification|profile|workflow" || true
	@echo "✅ Recréation terminée. Vérifiez avec: make status"

# Redémarrage complet avec nettoyage
restart-clean: ## Redémarrage complet avec nettoyage
	@echo "🔄 Redémarrage complet de JobbingTrack (avec nettoyage)..."
	@echo "🧹 Nettoyage complet avant redémarrage..."
	@rm -f "$(ROOT_DIR)/.jobbingtrack-stack-mode"
	$(call docker_compose, $(COMPOSE_FILES_FULL) down --remove-orphans --volumes --timeout 30) || true
	@docker ps -q --filter "name=jobbingtrack-*" | xargs -r docker stop --time 30 || true
	@docker ps -aq --filter "name=jobbingtrack-*" | xargs -r docker rm -f || true
	@docker network prune -f || true
	@echo "⏳ Attente de 5 secondes..."
	@sleep 5
	$(MAKE) up
	@echo "✅ Système redémarré (nettoyé et services essentiels)"

# Redémarrage forcé (supprime TOUT : conteneurs, images, volumes = DB effacée)
restart-force: ## Redémarrer avec nettoyage forcé complet (ATTENTION: supprime la base de données)
	@echo "⚠️  REDÉMARRAGE FORCÉ - Nettoyage complet (volumes supprimés)"
	$(MAKE) clean-force
	@echo "⏳ Attente de 5 secondes après nettoyage..."
	@sleep 5
	$(MAKE) up-full
	@echo "✅ Système redémarré. Si connexion impossible : make create-admin-user"

# Redémarrage complet en conservant les données (ex. après make setup-ports)
restart-full: ## Redémarrer tout le projet en conservant la base de données (ports appliqués)
	@echo "🔄 Redémarrage complet (données conservées)..."
	$(MAKE) down-keep-data
	@echo "⏳ Attente 3s..."
	@sleep 3
	$(MAKE) up-full
	@echo "✅ Redémarrage terminé. Connexion : http://localhost:5003"

# Build avec cache (profil full) — rapide après changement de code, utilise le cache Docker
build-full: ## Build des images avec cache (sans --no-cache) — plus rapide que rebuild
	@echo "🔨 Build des images (avec cache Docker)..."
	@$(call docker_compose, -f docker-compose.yml --profile full build)
	@echo "✅ Build terminé (cache utilisé). Pour démarrer: make up-full"

# Rebuild de toutes les images (down + suppression images + build --no-cache ; puis make up-full pour démarrer)
rebuild: ## Reconstruire toutes les images Docker (sans cache) — lourd et long, préférer build-full ou test-full-quick
	@echo "🔨 Reconstruction de toutes les images Docker (--no-cache, très lourd)..."
	@echo ""
	@echo "🛑 Arrêt des services..."
	@$(MAKE) down
	@echo ""
	@echo "🗑️  Suppression des anciennes images JobbingTrack..."
	@docker images | grep "jobbingtrack-" | awk '{print $$3}' | xargs -r docker rmi -f 2>/dev/null || true
	@echo ""
	@echo "🔨 Rebuild avec --no-cache (peut prendre 10–20 min, forte charge CPU/RAM)..."
	@$(call docker_compose, -f docker-compose.yml --profile full build --no-cache)
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

# Démarrer un service spécifique (SERVICE=nom comme dans make status)
up-service: ## Démarrer un service spécifique (SERVICE=nom)
start-service: ## Alias pour up-service - Démarrer un service spécifique (SERVICE=nom)
	@if [ -z "$(SERVICE)" ]; then \
		echo "❌ Spécifiez le service avec SERVICE=<nom>"; \
		echo "📋 Exemples (noms comme dans make status):"; \
		echo "   make start-service SERVICE=api-gateway"; \
		echo "   make start-service SERVICE=metrics-aggregator"; \
		echo "   make start-service SERVICE=auth-service"; \
		exit 1; \
	fi
	@echo "🚀 Démarrage du service: $(SERVICE)"
	@(cd $(ROOT_DIR); \
	if echo "$(DOCKER_COMPOSE_CMD)" | grep -q "docker compose"; then \
		docker compose $(COMPOSE_FILES_FULL) up -d $(COMPOSE_SVC); \
	else \
		docker-compose $(COMPOSE_FILES_FULL) up -d $(COMPOSE_SVC); \
	fi)
	@echo "⏳ Attente que le service démarre (3 secondes)..."
	@sleep 3
	@echo "✅ Service $(SERVICE) démarré"
	@echo "💡 Vérifiez le statut avec: make status"

# Arrêter un service spécifique (SERVICE=nom comme dans make status)
stop-service: ## Arrêter un service spécifique (SERVICE=nom)
	@if [ -z "$(SERVICE)" ]; then \
		echo "❌ Spécifiez le service avec SERVICE=<nom>"; \
		echo "📋 Exemple: make stop-service SERVICE=metrics-aggregator"; \
		exit 1; \
	fi
	@echo "🛑 Arrêt du service: $(SERVICE)"
	$(call docker_compose, $(COMPOSE_FILES_FULL) stop $(COMPOSE_SVC))
	@echo "✅ Service $(SERVICE) arrêté"

# Nom du service pour docker compose (compose utilise jobbingtrack-metrics-aggregator, pas metrics-aggregator)
# Utilisé par restart-service, start-service, stop-service, rebuild-service, logs-service
COMPOSE_SVC = $(if $(filter metrics-aggregator,$(SERVICE)),jobbingtrack-metrics-aggregator,$(SERVICE))

# Redémarrer un service spécifique (SERVICE=nom comme dans make status: api-gateway, metrics-aggregator, auth-service, etc.)
restart-service: ## Redémarrer un service spécifique (SERVICE=nom)
	@if [ -z "$(SERVICE)" ]; then \
		echo "❌ Spécifiez le service avec SERVICE=<nom>"; \
		echo "📋 Exemples (noms comme dans make status):"; \
		echo "   make restart-service SERVICE=api-gateway"; \
		echo "   make restart-service SERVICE=metrics-aggregator"; \
		echo "   make restart-service SERVICE=auth-service"; \
		exit 1; \
	fi
	@echo "🔄 Redémarrage du service: $(SERVICE)"
	@echo ""
	@echo "🔍 Vérification des tables Prisma avant redémarrage..."
	@if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^jobbingtrack-postgres$$"; then \
		TABLE_COUNT=$$(docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -t -A -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';" 2>/dev/null | tr -d ' \n\r' || echo "0"); \
		if [ -z "$$TABLE_COUNT" ] || [ "$$TABLE_COUNT" = "0" ] || [ "$$TABLE_COUNT" -lt "5" ] 2>/dev/null; then \
			echo -e "\033[1;33m⚠️  ATTENTION : Base de données vide ou incomplète ($$TABLE_COUNT tables) !\033[0m"; \
			echo -e "\033[1;33m💡 Il est recommandé d'exécuter 'make db-push-all' avant de redémarrer\033[0m"; \
			echo ""; \
			read -t 5 -p "Continuer quand même ? (o/N): " continue_choice || continue_choice="N"; \
			if [ "$$continue_choice" != "o" ] && [ "$$continue_choice" != "O" ]; then \
				echo "❌ Redémarrage annulé. Exécutez 'make db-push-all' d'abord."; \
				exit 1; \
			fi; \
		fi; \
	fi
	$(call docker_compose, $(COMPOSE_FILES_FULL) restart $(COMPOSE_SVC))
	@echo "✅ Service $(SERVICE) redémarré"
	@if [ "$(SERVICE)" = "auth-service" ]; then \
		echo "⏳ Attente que auth-service soit prêt (5s)..."; \
		sleep 5; \
		echo "✅ auth-service redémarré et prêt"; \
	fi

# Reconstruire des services spécifiques
rebuild-notification-service: ## Reconstruire notification-service
	@echo "🔨 Reconstruction du service: notification-service"
	@docker compose build notification-service
	@echo "✅ Reconstruction terminée"

rebuild-profile-service: ## Reconstruire profile-service
	@echo "🔨 Reconstruction du service: profile-service"
	@docker compose build profile-service
	@echo "✅ Reconstruction terminée"

rebuild-workflow-service: ## Reconstruire workflow-service
	@echo "🔨 Reconstruction du service: workflow-service"
	@docker compose build workflow-service
	@echo "✅ Reconstruction terminée"

build-workflow-service: ## Alias de rebuild-workflow-service (build image workflow-service)
	@$(MAKE) rebuild-workflow-service

# Reconstruire un service spécifique (SERVICE=nom comme dans make status).
# Utilise COMPOSE_FILES_ESSENTIAL pour éviter "depends on undefined service" (monitoring-c
# avec profil dans docker-compose.monitoring.yml). Les services principaux sont dans docker-compose.yml.
rebuild-service: ## Reconstruire un service (SERVICE=nom). Ex: make rebuild-service SERVICE=metrics-aggregator
	@if [ -z "$(SERVICE)" ]; then \
		echo "❌ Spécifiez le service avec SERVICE=<nom>"; \
		echo "📋 Exemple: make rebuild-service SERVICE=metrics-aggregator"; \
		echo "   ou:      make rebuild-metrics-aggregator"; \
		exit 1; \
	fi
	@echo "🔨 Reconstruction du service: $(SERVICE)"
	@container_name="jobbingtrack-$(SERVICE)"; \
	if [ "$(SERVICE)" = "metrics-aggregator" ]; then container_name="jobbingtrack-metrics-aggregator"; fi; \
	if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^$$container_name$$"; then \
		echo "🛑 Arrêt du service en cours d'exécution..."; \
		(cd $(ROOT_DIR); \
		if echo "$(DOCKER_COMPOSE_CMD)" | grep -q "docker compose"; then \
			docker compose $(COMPOSE_FILES_ESSENTIAL) stop $(COMPOSE_SVC) || true; \
		else \
			docker-compose $(COMPOSE_FILES_ESSENTIAL) stop $(COMPOSE_SVC) || true; \
		fi); \
	else \
		echo "ℹ️  Service $(SERVICE) n'est pas démarré (normal pour rebuild)"; \
	fi
	@echo "🗑️  Suppression de l'ancienne image..."
	@container_name="jobbingtrack-$(SERVICE)"; \
	if [ "$(SERVICE)" = "metrics-aggregator" ]; then container_name="jobbingtrack-metrics-aggregator"; fi; \
	docker rmi $$container_name 2>/dev/null || echo "⚠️  Image non trouvée (normal)"
	@echo "🔨 Build en cours..."
	@if echo "$(DOCKER_COMPOSE_CMD)" | grep -q "docker compose"; then \
		cd $(ROOT_DIR) && docker compose $(COMPOSE_FILES_ESSENTIAL) build --no-cache $(COMPOSE_SVC); \
	else \
		cd $(ROOT_DIR) && docker-compose $(COMPOSE_FILES_ESSENTIAL) build --no-cache $(COMPOSE_SVC); \
	fi
	@echo "🚀 Démarrage du service..."
	@if echo "$(DOCKER_COMPOSE_CMD)" | grep -q "docker compose"; then \
		cd $(ROOT_DIR) && docker compose $(COMPOSE_FILES_ESSENTIAL) up -d $(COMPOSE_SVC); \
	else \
		cd $(ROOT_DIR) && docker-compose $(COMPOSE_FILES_ESSENTIAL) up -d $(COMPOSE_SVC); \
	fi
	@echo "⏳ Attente que le service démarre (5 secondes)..."
	@sleep 5
	@container_name="jobbingtrack-$(SERVICE)"; \
	if [ "$(SERVICE)" = "metrics-aggregator" ]; then container_name="jobbingtrack-metrics-aggregator"; fi; \
	if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^$$container_name$$"; then \
		echo "✅ Service $(SERVICE) reconstruit et démarré avec succès"; \
	else \
		echo "⚠️  Service $(SERVICE) reconstruit mais n'est pas démarré"; \
		echo "💡 Essayez: make start-service SERVICE=$(SERVICE)"; \
	fi
	@echo "💡 Vérifiez le statut avec: make status"

# Raccourci: reconstruire uniquement metrics-aggregator (sans taper SERVICE=)
rebuild-metrics-aggregator: ## Reconstruire metrics-aggregator (build --no-cache + up -d)
	@$(MAKE) rebuild-service SERVICE=metrics-aggregator

# Raccourci: reconstruire uniquement monitoring-c (sans taper SERVICE=)
rebuild-monitoring-c: ## Reconstruire monitoring-c (build --no-cache + up -d)
	@$(MAKE) rebuild-service SERVICE=monitoring-c

# Logs d'un service spécifique (SERVICE=nom comme dans make status) - tags colorés
logs-service: ## Voir les logs d'un service spécifique (SERVICE=nom)
	@if [ -z "$(SERVICE)" ]; then \
		echo "❌ Spécifiez le service avec SERVICE=<nom>"; \
		echo "📋 Exemple: make logs-service SERVICE=metrics-aggregator"; \
		exit 1; \
	fi
	@$(call docker_compose, $(COMPOSE_FILES_FULL) logs -f -t $(COMPOSE_SVC)) 2>&1 | bash "$(ROOT_DIR)/scripts/color-logs.sh"

# ============================================================================
# STATUS ET LOGS
# ============================================================================

# Légende longue des ports (monitoring-c, log-collector-c, etc.) : STATUS_LEGEND=1 make status
STATUS_LEGEND ?= 0

# Statut détaillé
status: ## Statut détaillé de chaque service (avec couleurs UP/DOWN, santé, ports, uptime)
	@echo "📊 Statut détaillé des services JobbingTrack"
	@echo "=========================================="
	@echo ""
	@if [ "$(STATUS_LEGEND)" = "1" ]; then \
		printf '%b\n' "\033[0;90mLecture des ports : \033[0;36mport machine (localhost)\033[0;90m  →  \033[0;33mport interne conteneur\033[0;90m.\033[0m"; \
		printf '%b\n' "\033[0;90mLes services Node exposent souvent 300x / 301x dans l image. \033[1;33mmonitoring-c\033[0;90m (C) ecoute \033[0;33m8015\033[0;90m dans le conteneur ; hote \033[0;36m5098\033[0;90m. \033[1;33mlog-collector-c\033[0;90m (C) ecoute \033[0;33m3019\033[0;90m dans le conteneur ; hote \033[0;36m5099\033[0;90m (pas 5099->5099). Acces reseau Docker : \033[0;36mlog-collector-c:3019\033[0;90m / \033[0;36mmonitoring-c:8015\033[0;90m.\033[0m"; \
		echo ""; \
	fi
	@echo "🏗️  Infrastructure:"
	@echo ""
	@services="postgres redis"; \
	for service in $$services; do \
		container="jobbingtrack-$$service"; \
		if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^$$container$$"; then \
			status=$$(docker ps --filter "name=^$$container$$" --format "{{.Status}}" 2>/dev/null); \
			health=$$(docker inspect $$container --format='{{.State.Health.Status}}' 2>/dev/null || echo "no-healthcheck"); \
			ports=$$(docker ps --filter "name=^$$container$$" --format "{{.Ports}}" 2>/dev/null); \
			uptime=$$(echo "$$status" | sed -n 's/.*Up \([^(]*\).*/\1/p' | sed 's/ (.*//' | xargs || echo "N/A"); \
			if [ -n "$$ports" ]; then \
				port_ext=$$(echo "$$ports" | sed -n 's/.*0\.0\.0\.0:\([0-9]*\)->.*/\1/p' | head -1); \
				port_int=$$(echo "$$ports" | sed -n 's/.*->\([0-9]*\)\/tcp.*/\1/p' | head -1); \
				if [ -n "$$port_ext" ] && [ -n "$$port_int" ]; then \
					if [ "$$health" = "healthy" ]; then \
						printf "  \033[1;32m✅ UP\033[0m   %-30s \033[0;36m%s\033[0m → \033[0;33m%s\033[0m \033[0;32m[healthy]\033[0m (%s)\n" "$$service" "$$port_ext" "$$port_int" "$$uptime"; \
					elif [ "$$health" = "unhealthy" ]; then \
						printf "  \033[1;33m⚠️  UP\033[0m   %-30s \033[0;36m%s\033[0m → \033[0;33m%s\033[0m \033[1;31m[unhealthy]\033[0m (%s)\n" "$$service" "$$port_ext" "$$port_int" "$$uptime"; \
					elif [ "$$health" = "starting" ]; then \
						printf "  \033[1;33m🔄 UP\033[0m   %-30s \033[0;36m%s\033[0m → \033[0;33m%s\033[0m \033[0;33m[starting]\033[0m (%s)\n" "$$service" "$$port_ext" "$$port_int" "$$uptime"; \
					else \
						printf "  \033[1;32m✅ UP\033[0m   %-30s \033[0;36m%s\033[0m → \033[0;33m%s\033[0m (%s)\n" "$$service" "$$port_ext" "$$port_int" "$$uptime"; \
					fi; \
				elif [ -n "$$port_ext" ]; then \
					if [ "$$health" = "healthy" ]; then \
						printf "  \033[1;32m✅ UP\033[0m   %-30s \033[0;36m%s\033[0m \033[0;32m[healthy]\033[0m (%s)\n" "$$service" "$$port_ext" "$$uptime"; \
					elif [ "$$health" = "unhealthy" ]; then \
						printf "  \033[1;33m⚠️  UP\033[0m   %-30s \033[0;36m%s\033[0m \033[1;31m[unhealthy]\033[0m (%s)\n" "$$service" "$$port_ext" "$$uptime"; \
					else \
						printf "  \033[1;32m✅ UP\033[0m   %-30s \033[0;36m%s\033[0m (%s)\n" "$$service" "$$port_ext" "$$uptime"; \
					fi; \
				else \
					printf "  \033[1;32m✅ UP\033[0m   %-30s (pas de port exposé) (%s)\n" "$$service" "$$uptime"; \
				fi; \
			else \
				printf "  \033[1;32m✅ UP\033[0m   %-30s (pas de port exposé) (%s)\n" "$$service" "$$uptime"; \
			fi; \
		else \
			if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q "^$$container$$"; then \
				status=$$(docker ps -a --filter "name=^$$container$$" --format "{{.Status}}" 2>/dev/null); \
				printf "  \033[1;31m❌ DOWN\033[0m %-30s \033[0;90m[%s]\033[0m\n" "$$service" "$$status"; \
			else \
				printf "  \033[1;31m❌ DOWN\033[0m %-30s \033[0;90m[non créé]\033[0m\n" "$$service"; \
			fi; \
		fi; \
	done
	@echo ""
	@echo "🌐 Frontend & Gateway:"
	@echo ""
	@services="frontend api-gateway"; \
	for service in $$services; do \
		container="jobbingtrack-$$service"; \
		if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^$$container$$"; then \
			status=$$(docker ps --filter "name=^$$container$$" --format "{{.Status}}" 2>/dev/null); \
			health=$$(docker inspect $$container --format='{{.State.Health.Status}}' 2>/dev/null || echo "no-healthcheck"); \
			ports=$$(docker ps --filter "name=^$$container$$" --format "{{.Ports}}" 2>/dev/null); \
			uptime=$$(echo "$$status" | sed -n 's/.*Up \([^(]*\).*/\1/p' | sed 's/ (.*//' | xargs || echo "N/A"); \
			if [ -n "$$ports" ]; then \
				port_ext=$$(echo "$$ports" | sed -n 's/.*0\.0\.0\.0:\([0-9]*\)->.*/\1/p' | head -1); \
				port_int=$$(echo "$$ports" | sed -n 's/.*->\([0-9]*\)\/tcp.*/\1/p' | head -1); \
				if [ -n "$$port_ext" ] && [ -n "$$port_int" ]; then \
					if [ "$$health" = "healthy" ]; then \
						printf "  \033[1;32m✅ UP\033[0m   %-30s \033[0;36m%s\033[0m → \033[0;33m%s\033[0m \033[0;32m[healthy]\033[0m (%s)\n" "$$service" "$$port_ext" "$$port_int" "$$uptime"; \
					elif [ "$$health" = "unhealthy" ]; then \
						printf "  \033[1;33m⚠️  UP\033[0m   %-30s \033[0;36m%s\033[0m → \033[0;33m%s\033[0m \033[1;31m[unhealthy]\033[0m (%s)\n" "$$service" "$$port_ext" "$$port_int" "$$uptime"; \
					elif [ "$$health" = "starting" ]; then \
						printf "  \033[1;33m🔄 UP\033[0m   %-30s \033[0;36m%s\033[0m → \033[0;33m%s\033[0m \033[0;33m[starting]\033[0m (%s)\n" "$$service" "$$port_ext" "$$port_int" "$$uptime"; \
					else \
						printf "  \033[1;32m✅ UP\033[0m   %-30s \033[0;36m%s\033[0m → \033[0;33m%s\033[0m (%s)\n" "$$service" "$$port_ext" "$$port_int" "$$uptime"; \
					fi; \
				elif [ -n "$$port_ext" ]; then \
					if [ "$$health" = "healthy" ]; then \
						printf "  \033[1;32m✅ UP\033[0m   %-30s \033[0;36m%s\033[0m \033[0;32m[healthy]\033[0m (%s)\n" "$$service" "$$port_ext" "$$uptime"; \
					elif [ "$$health" = "unhealthy" ]; then \
						printf "  \033[1;33m⚠️  UP\033[0m   %-30s \033[0;36m%s\033[0m \033[1;31m[unhealthy]\033[0m (%s)\n" "$$service" "$$port_ext" "$$uptime"; \
					else \
						printf "  \033[1;32m✅ UP\033[0m   %-30s \033[0;36m%s\033[0m (%s)\n" "$$service" "$$port_ext" "$$uptime"; \
					fi; \
				else \
					printf "  \033[1;32m✅ UP\033[0m   %-30s (pas de port exposé) (%s)\n" "$$service" "$$uptime"; \
				fi; \
			else \
				printf "  \033[1;32m✅ UP\033[0m   %-30s (pas de port exposé) (%s)\n" "$$service" "$$uptime"; \
			fi; \
		else \
			if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q "^$$container$$"; then \
				status=$$(docker ps -a --filter "name=^$$container$$" --format "{{.Status}}" 2>/dev/null); \
				printf "  \033[1;31m❌ DOWN\033[0m %-30s \033[0;90m[%s]\033[0m\n" "$$service" "$$status"; \
			else \
				printf "  \033[1;90m⚪ DOWN\033[0m %-30s\n" "$$service"; \
			fi; \
		fi; \
	done
	@echo ""
	@echo "🔐 Backend Principaux:"
	@echo ""
	@services="auth-service dashboard-service"; \
	for service in $$services; do \
		container="jobbingtrack-$$service"; \
		if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^$$container$$"; then \
			status=$$(docker ps --filter "name=^$$container$$" --format "{{.Status}}" 2>/dev/null); \
			health=$$(docker inspect $$container --format='{{.State.Health.Status}}' 2>/dev/null || echo "no-healthcheck"); \
			ports=$$(docker ps --filter "name=^$$container$$" --format "{{.Ports}}" 2>/dev/null); \
			uptime=$$(echo "$$status" | sed -n 's/.*Up \([^(]*\).*/\1/p' | sed 's/ (.*//' | xargs || echo "N/A"); \
			if [ -n "$$ports" ]; then \
				port_ext=$$(echo "$$ports" | sed -n 's/.*0\.0\.0\.0:\([0-9]*\)->.*/\1/p' | head -1); \
				port_int=$$(echo "$$ports" | sed -n 's/.*->\([0-9]*\)\/tcp.*/\1/p' | head -1); \
				if [ -n "$$port_ext" ] && [ -n "$$port_int" ]; then \
					if [ "$$health" = "healthy" ]; then \
						printf "  \033[1;32m✅ UP\033[0m   %-30s \033[0;36m%s\033[0m → \033[0;33m%s\033[0m \033[0;32m[healthy]\033[0m (%s)\n" "$$service" "$$port_ext" "$$port_int" "$$uptime"; \
					elif [ "$$health" = "unhealthy" ]; then \
						printf "  \033[1;33m⚠️  UP\033[0m   %-30s \033[0;36m%s\033[0m → \033[0;33m%s\033[0m \033[1;31m[unhealthy]\033[0m (%s)\n" "$$service" "$$port_ext" "$$port_int" "$$uptime"; \
					elif [ "$$health" = "starting" ]; then \
						printf "  \033[1;33m🔄 UP\033[0m   %-30s \033[0;36m%s\033[0m → \033[0;33m%s\033[0m \033[0;33m[starting]\033[0m (%s)\n" "$$service" "$$port_ext" "$$port_int" "$$uptime"; \
					else \
						printf "  \033[1;32m✅ UP\033[0m   %-30s \033[0;36m%s\033[0m → \033[0;33m%s\033[0m (%s)\n" "$$service" "$$port_ext" "$$port_int" "$$uptime"; \
					fi; \
				elif [ -n "$$port_ext" ]; then \
					if [ "$$health" = "healthy" ]; then \
						printf "  \033[1;32m✅ UP\033[0m   %-30s \033[0;36m%s\033[0m \033[0;32m[healthy]\033[0m (%s)\n" "$$service" "$$port_ext" "$$uptime"; \
					elif [ "$$health" = "unhealthy" ]; then \
						printf "  \033[1;33m⚠️  UP\033[0m   %-30s \033[0;36m%s\033[0m \033[1;31m[unhealthy]\033[0m (%s)\n" "$$service" "$$port_ext" "$$uptime"; \
					else \
						printf "  \033[1;32m✅ UP\033[0m   %-30s \033[0;36m%s\033[0m (%s)\n" "$$service" "$$port_ext" "$$uptime"; \
					fi; \
				else \
					printf "  \033[1;32m✅ UP\033[0m   %-30s (pas de port exposé) (%s)\n" "$$service" "$$uptime"; \
				fi; \
			else \
				printf "  \033[1;32m✅ UP\033[0m   %-30s (pas de port exposé) (%s)\n" "$$service" "$$uptime"; \
			fi; \
		else \
			if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q "^$$container$$"; then \
				status=$$(docker ps -a --filter "name=^$$container$$" --format "{{.Status}}" 2>/dev/null); \
				printf "  \033[1;31m❌ DOWN\033[0m %-30s \033[0;90m[%s]\033[0m\n" "$$service" "$$status"; \
			else \
				printf "  \033[1;90m⚪ DOWN\033[0m %-30s\n" "$$service"; \
			fi; \
		fi; \
	done
	@echo ""
	@echo "📋 Services Métiers:"
	@echo ""
	@services="company-service application-service contact-service interview-service call-service followup-service event-service"; \
	for service in $$services; do \
		container="jobbingtrack-$$service"; \
		if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^$$container$$"; then \
			status=$$(docker ps --filter "name=^$$container$$" --format "{{.Status}}" 2>/dev/null); \
			health=$$(docker inspect $$container --format='{{.State.Health.Status}}' 2>/dev/null || echo "no-healthcheck"); \
			ports=$$(docker ps --filter "name=^$$container$$" --format "{{.Ports}}" 2>/dev/null); \
			uptime=$$(echo "$$status" | sed -n 's/.*Up \([^(]*\).*/\1/p' | sed 's/ (.*//' | xargs || echo "N/A"); \
			if [ -n "$$ports" ]; then \
				port_ext=$$(echo "$$ports" | sed -n 's/.*0\.0\.0\.0:\([0-9]*\)->.*/\1/p' | head -1); \
				port_int=$$(echo "$$ports" | sed -n 's/.*->\([0-9]*\)\/tcp.*/\1/p' | head -1); \
				if [ -n "$$port_ext" ] && [ -n "$$port_int" ]; then \
					if [ "$$health" = "healthy" ]; then \
						printf "  \033[1;32m✅ UP\033[0m   %-30s \033[0;36m%s\033[0m → \033[0;33m%s\033[0m \033[0;32m[healthy]\033[0m (%s)\n" "$$service" "$$port_ext" "$$port_int" "$$uptime"; \
					elif [ "$$health" = "unhealthy" ]; then \
						printf "  \033[1;33m⚠️  UP\033[0m   %-30s \033[0;36m%s\033[0m → \033[0;33m%s\033[0m \033[1;31m[unhealthy]\033[0m (%s)\n" "$$service" "$$port_ext" "$$port_int" "$$uptime"; \
					elif [ "$$health" = "starting" ]; then \
						printf "  \033[1;33m🔄 UP\033[0m   %-30s \033[0;36m%s\033[0m → \033[0;33m%s\033[0m \033[0;33m[starting]\033[0m (%s)\n" "$$service" "$$port_ext" "$$port_int" "$$uptime"; \
					else \
						printf "  \033[1;32m✅ UP\033[0m   %-30s \033[0;36m%s\033[0m → \033[0;33m%s\033[0m (%s)\n" "$$service" "$$port_ext" "$$port_int" "$$uptime"; \
					fi; \
				elif [ -n "$$port_ext" ]; then \
					if [ "$$health" = "healthy" ]; then \
						printf "  \033[1;32m✅ UP\033[0m   %-30s \033[0;36m%s\033[0m \033[0;32m[healthy]\033[0m (%s)\n" "$$service" "$$port_ext" "$$uptime"; \
					elif [ "$$health" = "unhealthy" ]; then \
						printf "  \033[1;33m⚠️  UP\033[0m   %-30s \033[0;36m%s\033[0m \033[1;31m[unhealthy]\033[0m (%s)\n" "$$service" "$$port_ext" "$$uptime"; \
					else \
						printf "  \033[1;32m✅ UP\033[0m   %-30s \033[0;36m%s\033[0m (%s)\n" "$$service" "$$port_ext" "$$uptime"; \
					fi; \
				else \
					printf "  \033[1;32m✅ UP\033[0m   %-30s (pas de port exposé) (%s)\n" "$$service" "$$uptime"; \
				fi; \
			else \
				printf "  \033[1;32m✅ UP\033[0m   %-30s (pas de port exposé) (%s)\n" "$$service" "$$uptime"; \
			fi; \
		else \
			if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q "^$$container$$"; then \
				status=$$(docker ps -a --filter "name=^$$container$$" --format "{{.Status}}" 2>/dev/null); \
				printf "  \033[1;31m❌ DOWN\033[0m %-30s \033[0;90m[%s]\033[0m\n" "$$service" "$$status"; \
			else \
				printf "  \033[1;90m⚪ DOWN\033[0m %-30s\n" "$$service"; \
			fi; \
		fi; \
	done
	@echo ""
	@echo "📊 Monitoring & Métriques:"
	@echo ""
	@services="metrics-aggregator monitoring-c log-collector-c"; \
	for service in $$services; do \
		container="jobbingtrack-$$service"; \
		if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^$$container$$"; then \
			status=$$(docker ps --filter "name=^$$container$$" --format "{{.Status}}" 2>/dev/null); \
			health=$$(docker inspect $$container --format='{{.State.Health.Status}}' 2>/dev/null || echo "no-healthcheck"); \
			ports=$$(docker ps --filter "name=^$$container$$" --format "{{.Ports}}" 2>/dev/null); \
			uptime=$$(echo "$$status" | sed -n 's/.*Up \([^(]*\).*/\1/p' | sed 's/ (.*//' | xargs || echo "N/A"); \
			port_ext=$$(echo "$$ports" | sed -n 's/.*0\.0\.0\.0:\([0-9]*\)->.*/\1/p' | head -1); \
			port_int=$$(echo "$$ports" | sed -n 's/.*->\([0-9]*\)\/tcp.*/\1/p' | head -1); \
			if [ -z "$$port_ext" ] && [ "$$service" = "metrics-aggregator" ]; then port_ext=5004; port_int=3014; fi; \
			if [ -n "$$ports" ] || [ -n "$$port_ext" ]; then \
				if [ -n "$$port_ext" ] && [ -n "$$port_int" ]; then \
					if [ "$$health" = "healthy" ]; then \
						printf "  \033[1;32m✅ UP\033[0m   %-30s \033[0;36m%s\033[0m → \033[0;33m%s\033[0m \033[0;32m[healthy]\033[0m (%s)\n" "$$service" "$$port_ext" "$$port_int" "$$uptime"; \
					elif [ "$$health" = "unhealthy" ]; then \
						printf "  \033[1;33m⚠️  UP\033[0m   %-30s \033[0;36m%s\033[0m → \033[0;33m%s\033[0m \033[1;31m[unhealthy]\033[0m (%s)\n" "$$service" "$$port_ext" "$$port_int" "$$uptime"; \
					elif [ "$$health" = "starting" ]; then \
						printf "  \033[1;33m🔄 UP\033[0m   %-30s \033[0;36m%s\033[0m → \033[0;33m%s\033[0m \033[0;33m[starting]\033[0m (%s)\n" "$$service" "$$port_ext" "$$port_int" "$$uptime"; \
					else \
						printf "  \033[1;32m✅ UP\033[0m   %-30s \033[0;36m%s\033[0m → \033[0;33m%s\033[0m (%s)\n" "$$service" "$$port_ext" "$$port_int" "$$uptime"; \
					fi; \
				elif [ -n "$$port_ext" ]; then \
					if [ "$$health" = "healthy" ]; then \
						printf "  \033[1;32m✅ UP\033[0m   %-30s \033[0;36m%s\033[0m \033[0;32m[healthy]\033[0m (%s)\n" "$$service" "$$port_ext" "$$uptime"; \
					elif [ "$$health" = "unhealthy" ]; then \
						printf "  \033[1;33m⚠️  UP\033[0m   %-30s \033[0;36m%s\033[0m \033[1;31m[unhealthy]\033[0m (%s)\n" "$$service" "$$port_ext" "$$uptime"; \
					else \
						printf "  \033[1;32m✅ UP\033[0m   %-30s \033[0;36m%s\033[0m (%s)\n" "$$service" "$$port_ext" "$$uptime"; \
					fi; \
				else \
					printf "  \033[1;32m✅ UP\033[0m   %-30s (pas de port exposé) (%s)\n" "$$service" "$$uptime"; \
				fi; \
			else \
				printf "  \033[1;32m✅ UP\033[0m   %-30s (pas de port exposé) (%s)\n" "$$service" "$$uptime"; \
			fi; \
		else \
			if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q "^$$container$$"; then \
				status=$$(docker ps -a --filter "name=^$$container$$" --format "{{.Status}}" 2>/dev/null); \
				printf "  \033[1;90m⚪ DOWN\033[0m %-30s \033[0;90m[%s]\033[0m\n" "$$service" "$$status"; \
			else \
				printf "  \033[1;90m⚪ DOWN\033[0m %-30s\n" "$$service"; \
			fi; \
		fi; \
	done
	@echo ""
	@echo "🔒 Sécurité & Utilitaires:"
	@echo ""
	@services="security-service notification-service profile-service workflow-service deployment-service"; \
	for service in $$services; do \
		container="jobbingtrack-$$service"; \
		if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^$$container$$"; then \
			status=$$(docker ps --filter "name=^$$container$$" --format "{{.Status}}" 2>/dev/null); \
			health=$$(docker inspect $$container --format='{{.State.Health.Status}}' 2>/dev/null || echo "no-healthcheck"); \
			ports=$$(docker ps --filter "name=^$$container$$" --format "{{.Ports}}" 2>/dev/null); \
			uptime=$$(echo "$$status" | sed -n 's/.*Up \([^(]*\).*/\1/p' | sed 's/ (.*//' | xargs || echo "N/A"); \
			if [ -n "$$ports" ]; then \
				port_ext=$$(echo "$$ports" | sed -n 's/.*0\.0\.0\.0:\([0-9]*\)->.*/\1/p' | head -1); \
				port_int=$$(echo "$$ports" | sed -n 's/.*->\([0-9]*\)\/tcp.*/\1/p' | head -1); \
				if [ -n "$$port_ext" ] && [ -n "$$port_int" ]; then \
					if [ "$$health" = "healthy" ]; then \
						printf "  \033[1;32m✅ UP\033[0m   %-30s \033[0;36m%s\033[0m → \033[0;33m%s\033[0m \033[0;32m[healthy]\033[0m (%s)\n" "$$service" "$$port_ext" "$$port_int" "$$uptime"; \
					elif [ "$$health" = "unhealthy" ]; then \
						printf "  \033[1;33m⚠️  UP\033[0m   %-30s \033[0;36m%s\033[0m → \033[0;33m%s\033[0m \033[1;31m[unhealthy]\033[0m (%s)\n" "$$service" "$$port_ext" "$$port_int" "$$uptime"; \
					elif [ "$$health" = "starting" ]; then \
						printf "  \033[1;33m🔄 UP\033[0m   %-30s \033[0;36m%s\033[0m → \033[0;33m%s\033[0m \033[0;33m[starting]\033[0m (%s)\n" "$$service" "$$port_ext" "$$port_int" "$$uptime"; \
					else \
						printf "  \033[1;32m✅ UP\033[0m   %-30s \033[0;36m%s\033[0m → \033[0;33m%s\033[0m (%s)\n" "$$service" "$$port_ext" "$$port_int" "$$uptime"; \
					fi; \
				elif [ -n "$$port_ext" ]; then \
					if [ "$$health" = "healthy" ]; then \
						printf "  \033[1;32m✅ UP\033[0m   %-30s \033[0;36m%s\033[0m \033[0;32m[healthy]\033[0m (%s)\n" "$$service" "$$port_ext" "$$uptime"; \
					elif [ "$$health" = "unhealthy" ]; then \
						printf "  \033[1;33m⚠️  UP\033[0m   %-30s \033[0;36m%s\033[0m \033[1;31m[unhealthy]\033[0m (%s)\n" "$$service" "$$port_ext" "$$uptime"; \
					else \
						printf "  \033[1;32m✅ UP\033[0m   %-30s \033[0;36m%s\033[0m (%s)\n" "$$service" "$$port_ext" "$$uptime"; \
					fi; \
				else \
					printf "  \033[1;32m✅ UP\033[0m   %-30s (pas de port exposé) (%s)\n" "$$service" "$$uptime"; \
				fi; \
			else \
				printf "  \033[1;32m✅ UP\033[0m   %-30s (pas de port exposé) (%s)\n" "$$service" "$$uptime"; \
			fi; \
		else \
			if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q "^$$container$$"; then \
				status=$$(docker ps -a --filter "name=^$$container$$" --format "{{.Status}}" 2>/dev/null); \
				printf "  \033[1;31m❌ DOWN\033[0m %-30s \033[0;90m[%s]\033[0m\n" "$$service" "$$status"; \
			else \
				printf "  \033[1;90m⚪ DOWN\033[0m %-30s\n" "$$service"; \
			fi; \
		fi; \
	done
	@echo ""
	@up_count=$$(docker ps --filter "name=jobbingtrack-" --format '{{.Names}}' 2>/dev/null | wc -l | tr -d ' '); \
	all_count=$$(docker ps -a --filter "name=jobbingtrack-" --format '{{.Names}}' 2>/dev/null | sort -u | wc -l | tr -d ' '); \
	if [ "$$all_count" -eq 0 ]; then all_count="$$up_count"; fi; \
	if [ "$$up_count" -eq 0 ] && [ "$$all_count" -eq 0 ]; then \
		printf "📊 Résumé : \033[1;31maucun\033[0m conteneur \033[0;90mjobbingtrack-*\033[0m (stack non démarrée ou Docker inaccessible)\n"; \
		if ! docker info >/dev/null 2>&1; then \
			printf '%b\n' "\033[1;33m    → \`docker info\` échoue : démarrez Docker / droits (groupe docker) / contexte (\`docker context show\`).\033[0m"; \
		else \
			printf '%b\n' "\033[1;33m    → À la racine du dépôt : \033[0;36mmake up-full\033[1;33m ou \033[0;36mmake up\033[1;33m, puis \033[0;36mmake status\033[0m.\033[0m"; \
		fi; \
	elif [ "$$up_count" -eq 0 ]; then \
		printf "📊 Résumé : \033[1;31m%d/%d services actifs\033[0m\n" "$$up_count" "$$all_count"; \
	elif [ "$$up_count" -lt "$$all_count" ]; then \
		printf "📊 Résumé : \033[1;33m%d/%d services actifs\033[0m\n" "$$up_count" "$$all_count"; \
	else \
		printf "📊 Résumé : \033[1;32m%d/%d services actifs\033[0m\n" "$$up_count" "$$all_count"; \
	fi
	@echo ""
	@echo "🔍 Vérification des tables Prisma..."
	@if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^jobbingtrack-postgres$$"; then \
		POSTGRES_USER=$${POSTGRES_USER:-jobbingtrack}; \
		POSTGRES_DB=$${POSTGRES_DB:-jobbingtrack}; \
		TABLE_COUNT=$$(docker exec jobbingtrack-postgres psql -U $$POSTGRES_USER -d $$POSTGRES_DB -t -A -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';" 2>/dev/null | tr -d ' \n\r' || echo "0"); \
		if [ -n "$$TABLE_COUNT" ] && [ "$$TABLE_COUNT" != "0" ] && [ "$$TABLE_COUNT" != "" ] && [ "$$TABLE_COUNT" -gt "0" ] 2>/dev/null; then \
			echo -e "\033[0;32m✅ Base de données OK ($$TABLE_COUNT tables)\033[0m"; \
			KEY_TABLES=$$(docker exec jobbingtrack-postgres psql -U $$POSTGRES_USER -d $$POSTGRES_DB -t -A -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('service_availability_history','system_metrics_snapshots','security_logs');" 2>/dev/null | tr -d ' \n\r' || echo "0"); \
			if [ -n "$$KEY_TABLES" ] && [ "$$KEY_TABLES" -lt "3" ] 2>/dev/null; then \
				echo -e "\033[1;33m⚠️  Tables monitoring/sécurité manquantes ($$KEY_TABLES/3). Exécutez: make db-push-all\033[0m"; \
				echo -e "\033[1;33m   Si les erreurs persistent: make rebuild-service SERVICE=auth-service puis make db-push-all\033[0m"; \
			fi; \
		else \
			echo -e "\033[1;33m⚠️  Base de données vide ou inaccessible (tables: $$TABLE_COUNT)\033[0m"; \
			echo -e "\033[1;33m💡 Exécutez 'make db-push-all' pour créer toutes les tables\033[0m"; \
		fi; \
	else \
		echo -e "\033[1;33m⚠️  PostgreSQL non démarré, vérification des tables impossible\033[0m"; \
	fi
	@echo ""
	@echo "📱 Émulateur mobile (optionnel) : make emulator-controller  →  http://localhost:5003/backoffice/mobile-emulator"

# Boucle `make status` : script \`scripts/status-watch-loop.sh\` (buffer terminal alternatif par défaut).
# INTERVAL=s · ALTSCREEN=1 (défaut) = pas d’empilement dans le scrollback · ALTSCREEN=0 = ancien défilement · CLEAR=1 + ALTSCREEN=0 = clear plein écran.
status-watch: ## Rafraîchit make status en boucle (INTERVAL=5, ALTSCREEN=1 par défaut — voir scripts/status-watch-loop.sh)
	@chmod +x "$(ROOT_DIR)/scripts/status-watch-loop.sh" 2>/dev/null || true
	@ROOT_DIR="$(ROOT_DIR)" INTERVAL="$(or $(INTERVAL),5)" ALTSCREEN="$(or $(ALTSCREEN),1)" CLEAR="$(or $(CLEAR),0)" STATUS_FOLD="$(or $(STATUS_FOLD),1)" bash "$(ROOT_DIR)/scripts/status-watch-loop.sh"

# Même rendu que `make status`, boucle rapide (pas de vue « compacte » dupliquée — évite ports tronqués et services manquants).
status-live: ## Même détail que make status, actualisé toutes les INTERVAL secondes (défaut 2, Ctrl+C pour quitter)
	@chmod +x "$(ROOT_DIR)/scripts/status-watch-loop.sh" 2>/dev/null || true
	@ROOT_DIR="$(ROOT_DIR)" INTERVAL="$(or $(INTERVAL),2)" ALTSCREEN="$(or $(ALTSCREEN),1)" CLEAR="$(or $(CLEAR),0)" STATUS_FOLD="$(or $(STATUS_FOLD),1)" bash "$(ROOT_DIR)/scripts/status-watch-loop.sh"

# Liste conteneurs actifs
ps: ## Liste les conteneurs actifs
	@echo "📦 Conteneurs actifs JobbingTrack"
	@echo "================================"
	$(call docker_compose, $(COMPOSE_FILES_FULL) ps)

# Logs : dernières lignes sans suivi (sort immédiatement)
logs-tail: ## Affiche les N dernières lignes de logs puis quitte (LINES=200 par défaut)
	@echo "📋 Dernières lignes des logs JobbingTrack (puis sortie)"
	@echo "======================================================"
	@echo "💡 Pour suivre en continu : make logs  (puis Ctrl+C pour quitter)"
	@echo ""
	@N=$${LINES:-200}; cd $(ROOT_DIR) && docker compose $(COMPOSE_FILES_ESSENTIAL) logs -t --tail=$$N 2>&1 | bash "$(ROOT_DIR)/scripts/color-logs.sh" || \
		(echo "⚠️  Conteneurs arrêtés? Lancez: make up-full"; exit 1)

# Logs en temps réel (compose principal) - tags colorés [DEBUG], [STATS], [ERROR], etc.
# S'exécute indéfiniment jusqu'à Ctrl+C (suivi continu).
logs: ## Affiche tous les logs en temps réel — Ctrl+C pour quitter
	@echo "📋 Logs en temps réel des services JobbingTrack (suivi continu)"
	@echo "==============================================================="
	@echo "⏹️  Pour arrêter : Ctrl+C  |  Pour voir les dernières lignes sans suivi : make logs-tail"
	@echo "🔁 Conteneurs qui redémarrent / flux coupé : make logs-watch (même pipeline couleurs, reconnexion auto)"
	@echo "💡 Filtres: make logs-applicative (sans metrics)  |  make logs-persistence  |  make logs-tests  |  make logs-metrics"
	@echo "   Un service: make logs-service SERVICE=frontend"
	@echo "   Couleurs: service=magenta, GET/HEAD=cyan, 2xx=vert, 4xx=orange, 5xx=rouge, [TAG]=selon tag, Erreurs=rouge"
	@echo "   Redis/Postgres: grisé (dim). Sans Redis/Postgres: make logs-app"
	@echo ""
	@printf '\033]0;Logs\007' >/dev/tty 2>/dev/null || true
	@cd $(ROOT_DIR) && docker compose $(COMPOSE_FILES_ESSENTIAL) logs -f -t 2>&1 | bash "$(ROOT_DIR)/scripts/color-logs.sh" || \
		(echo "⚠️  Conteneurs arrêtés? Lancez: make up-full  puis  make logs"; exit 1)

# Même pipeline couleur que `logs` : reconnexion automatique si le flux s’interrompt (redémarrage conteneurs, etc.)
logs-watch: ## Logs temps réel avec reconnexion auto — Ctrl+C pour quitter
	@chmod +x "$(ROOT_DIR)/scripts/logs-watch.sh" 2>/dev/null; true
	@cd $(ROOT_DIR) && exec bash "$(ROOT_DIR)/scripts/logs-watch.sh" $(COMPOSE_FILES_ESSENTIAL)

# Logs sans Redis ni Postgres (uniquement services applicatifs + infra légère)
logs-app: ## Logs en temps réel SANS redis ni postgres (moins de bruit)
	@echo "📋 Logs applicatifs (sans redis, sans postgres)"
	@echo "=============================================="
	@echo "⏹️  Ctrl+C pour quitter  |  Tout voir : make logs"
	@echo ""
	@cd $(ROOT_DIR) && docker compose $(COMPOSE_FILES_ESSENTIAL) logs -f -t 2>&1 | grep --line-buffered -E -v '^jobbingtrack-redis[[:space:]]|^jobbingtrack-postgres[[:space:]]' | bash "$(ROOT_DIR)/scripts/color-logs.sh" || \
		(echo "⚠️  Conteneurs arrêtés? Lancez: make up-full  puis  make logs-app"; exit 1)

# Logs de metrics-aggregator uniquement (tags colorés)
logs-metrics: ## Affiche les logs du service metrics-aggregator (Ctrl+C pour quitter)
	@echo "📊 Logs de metrics-aggregator"
	@echo "=============================="
	@docker logs jobbingtrack-metrics-aggregator -f -t 2>&1 | bash "$(ROOT_DIR)/scripts/color-logs.sh"

# Logs applicatifs uniquement (sans metrics-aggregator ni monitoring-c) — moins de bruit
logs-applicative: ## Logs des services applicatifs (sans métriques / monitoring)
	@echo "📋 Logs applicatifs (sans metrics-aggregator ni monitoring-c)"
	@echo "=================================================================="
	@echo "💡 Pour tout voir : make logs  |  Métriques seules : make logs-metrics"
	@echo ""
	@cd $(ROOT_DIR) && docker compose $(COMPOSE_FILES_ESSENTIAL) logs -f -t 2>&1 | grep --line-buffered -E -v '^jobbingtrack-metrics-aggregator[[:space:]]|^jobbingtrack-monitoring-c[[:space:]]' | bash "$(ROOT_DIR)/scripts/color-logs.sh" || \
		(echo "⚠️  Conteneurs arrêtés? Lancez: make up-full  puis  make logs-applicative"; exit 1)

# Logs contenant uniquement les lignes [PERSISTENCE] (sauvegardes, snapshots, etc.)
logs-persistence: ## Affiche uniquement les logs de type persistance (tag [PERSISTENCE])
	@echo "💾 Logs Persistance ([PERSISTENCE])"
	@echo "===================================="
	@cd $(ROOT_DIR) && docker compose $(COMPOSE_FILES_ESSENTIAL) logs -f -t 2>&1 | grep --line-buffered '\[PERSISTENCE\]' | bash "$(ROOT_DIR)/scripts/color-logs.sh" || \
		(echo "⚠️  Conteneurs arrêtés? Lancez: make up-full"; exit 1)

# Logs pendant les tests : uniquement les lignes [TESTS API], [TESTS BACKEND], [TESTS FRONTEND], etc.
logs-tests: ## Affiche uniquement les logs liés aux tests (tags [TESTS ...])
	@echo "🧪 Logs des tests ([TESTS API], [TESTS BACKEND], [TESTS FRONTEND], …)"
	@echo "=========================================================================="
	@echo "💡 Les lignes affichées sont celles émises pendant les runs (Démarrage / Fin)."
	@echo "   Pour tous les logs : make logs  |  Applicatifs : make logs-applicative"
	@echo ""
	@cd $(ROOT_DIR) && docker compose $(COMPOSE_FILES_ESSENTIAL) logs -f -t 2>&1 | grep --line-buffered '\[TESTS ' | bash "$(ROOT_DIR)/scripts/color-logs.sh" || \
		(echo "⚠️  Conteneurs arrêtés? Lancez: make up-full  puis  make logs-tests"; exit 1)
