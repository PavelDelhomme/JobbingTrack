# ============================================================================
# Makefile Services - JobbingTrack
# ============================================================================
# Gestion du démarrage, arrêt, restart des services Docker
# ============================================================================

.PHONY: setup install-docker install-emojis fix-frontend _up-full-internal up down up-full up-full-mickdevil up-no-check up-mickdevil up-with-mobile up-for-tests restart restart-clean restart-force up-profile start-auth start-applications stop-service restart-service rebuild-service start-service up-service logs-service status status-live logs ps help-services

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
	@echo "  make up                    - Services essentiels (postgres, redis, gateway, frontend, auth)"
	@echo "  make up-no-check           - Sans vérification Docker"
	@echo "  make up-full               - TOUS les services (avec vérification Docker)"
	@echo "  make up-full-mickdevil    - TOUS les services (SANS vérification Docker)"
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
	@echo "  make status-live           - Statut en temps réel (actualisation automatique)"
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
	@echo "🚀 Démarrage des services essentiels..."
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) up -d postgres redis api-gateway frontend auth-service dashboard-service jobbingtrack-metrics-aggregator)
	@echo ""
	@echo "🚀 Démarrage de TOUS les services optionnels (profil full)..."
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) --profile full up -d)
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
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) up -d jobbingtrack-metrics-aggregator)
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
	@echo "   http://localhost:5003/backoffice/mobile-emulator"
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
	
	# Démarrer services principaux
	@echo "🚀 Démarrage des services principaux..."
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) up -d api-gateway auth-service)
	
	# Attendre que auth-service soit prêt avant de continuer
	@echo "⏳ Attente que auth-service soit prêt (5s)..."
	@sleep 5
	
	# Correction DB
	$(MAKE) db-fix-role
	
	# ✅ CRÉER AUTOMATIQUEMENT LES TABLES PRISMA
	@echo "📊 Création automatique des tables Prisma..."
	@echo "⏳ Cela peut prendre quelques secondes..."
	@$(MAKE) db-push-all || echo "⚠️  Erreur lors de la création des tables Prisma (peut être normal si elles existent déjà)"
	@echo "⏳ Attente supplémentaire pour que les tables soient créées (3s)..."
	@sleep 3
	
	# Démarrer frontend
	@echo "🚀 Démarrage du frontend..."
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) up -d frontend)
	
	# Démarrer monitoring
	@echo "📊 Démarrage du service de métriques..."
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) up -d jobbingtrack-metrics-aggregator)
	
	# Démarrer TOUS les autres services avec le profil 'full'
	@echo "🚀 Démarrage de tous les microservices (profil full)..."
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) --profile full up -d)
	
	# Démarrer le NOUVEAU système de monitoring en C (ultra-léger) - REMPLACE l'ancien
	@echo "🚀 Démarrage du nouveau système de monitoring en C (ultra-léger)..."
	@echo "   ⚠️  L'ancien système (Prometheus/Grafana/Loki) n'est PAS démarré automatiquement"
	@echo "   💡 Utilisez 'make monitoring-up' si vous avez besoin de l'ancien système"
	@# S'assurer que PostgreSQL est vraiment prêt avant de démarrer monitoring-c
	@echo "⏳ Vérification que PostgreSQL est prêt avant de démarrer monitoring-c..."
	@POSTGRES_READY=0; \
	for i in 1 2 3 4 5; do \
		if docker exec jobbingtrack-postgres pg_isready -U jobbingtrack -d jobbingtrack >/dev/null 2>&1; then \
			POSTGRES_READY=1; \
			break; \
		fi; \
		echo "⏳ Attente PostgreSQL (tentative $$i/5)..."; \
		sleep 2; \
	done; \
	if [ $$POSTGRES_READY -eq 0 ]; then \
		echo "⚠️  PostgreSQL n'est pas encore prêt, mais on continue quand même..."; \
	fi
	@# Créer le réseau si nécessaire (utiliser celui qui existe déjà ou créer)
	@if ! docker network inspect backend_jobbingtrack-network >/dev/null 2>&1; then \
		if docker network inspect jobbingtrack_jobbingtrack-network >/dev/null 2>&1; then \
			echo "🌐 Utilisation du réseau jobbingtrack_jobbingtrack-network existant..."; \
		else \
			echo "🌐 Création du réseau backend_jobbingtrack-network..."; \
			docker network create backend_jobbingtrack-network >/dev/null 2>&1 || true; \
		fi \
	fi
	@# Utiliser --no-deps pour éviter que Docker Compose recrée PostgreSQL
	$(call docker_compose, $(COMPOSE_FILES_FULL) --profile monitoring-c up -d --build --no-deps monitoring-c log-collector-c)
	@echo "✅ Nouveau monitoring en C démarré"
	
	# Attendre que les services soient prêts
	@echo "⏳ Attente que les services soient prêts (5s)..."
	@sleep 5
	
	# Vérification
	@echo "✅ Tous les services ont été démarrés"
	@echo ""
	@echo "🌐 Accès aux services :"
	@echo "  - Frontend:           http://localhost:5003"
	@echo "  - API Gateway:        http://localhost:5002"
	@echo "  - Monitoring C:       http://localhost:5014 (nouveau - ultra-léger)"
	@echo "  - Log Collector C:    http://localhost:5015 (nouveau - remplace Loki)"
	@echo "  - Metrics Aggregator: http://localhost:5004 (ancien - toujours disponible)"
	@echo ""
	@echo "💡 Ancien système de monitoring (Prometheus/Grafana/Loki):"
	@echo "   Utilisez 'make monitoring-up' si vous en avez besoin"
	@echo ""
	
	# Note: La vérification Prisma est faite après le démarrage complet dans up-full
	
	# Vérification utilisateur admin
	@echo "🔍 Vérification de l'utilisateur administrateur..."
	@POSTGRES_CONTAINER=$$(docker ps -q -f name=jobbingtrack-postgres 2>/dev/null | head -1); \
	if [ -n "$$POSTGRES_CONTAINER" ]; then \
		if docker exec $$POSTGRES_CONTAINER psql -U jobbingtrack -d jobbingtrack -t -c "SELECT COUNT(*) FROM \"User\" WHERE email = 'admin@jobbingtrack.test';" 2>/dev/null | grep -q "^\\s*0"; then \
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
		fi; \
	else \
		echo "⚠️  Conteneur PostgreSQL non trouvé"; \
	fi
	
	@echo "🔍 Pour voir les logs : make logs"
	@echo "🔍 Pour vérifier l'état : make status"

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

# Démarrer TOUS les services (SANS vérification Docker - pour MickDevil)
up-full-mickdevil: ## Démarrer TOUS les services SANS vérification Docker (mode MickDevil)
	@echo "🔄 Démarrage complet de JobbingTrack avec nettoyage en profondeur..."
	@echo "🚀 Tous les services avec métriques complètes"
	@echo "😎 Mode MickDevil - Vérification Docker désactivée"
	
	# Appeler la fonction interne
	@$(MAKE) _up-full-internal

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

# Démarrer un service spécifique
up-service: ## Démarrer un service spécifique (SERVICE=nom)
start-service: ## Alias pour up-service - Démarrer un service spécifique (SERVICE=nom)
	@if [ -z "$(SERVICE)" ]; then \
		echo "❌ Spécifiez le service avec SERVICE=<nom>"; \
		echo "📋 Exemples:"; \
		echo "   make start-service SERVICE=api-gateway    # API Gateway"; \
		echo "   make start-service SERVICE=auth-service  # Service d'authentification"; \
		echo "   make start-service SERVICE=frontend       # Frontend"; \
		exit 1; \
	fi
	@echo "🚀 Démarrage du service: $(SERVICE)"
	@(cd $(ROOT_DIR); \
	if echo "$(DOCKER_COMPOSE_CMD)" | grep -q "docker compose"; then \
		docker compose $(COMPOSE_FILES_FULL) up -d $(SERVICE); \
	else \
		docker-compose $(COMPOSE_FILES_FULL) up -d $(SERVICE); \
	fi)
	@echo "⏳ Attente que le service démarre (3 secondes)..."
	@sleep 3
	@echo "✅ Service $(SERVICE) démarré"
	@echo "💡 Vérifiez le statut avec: make status"

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
	$(call docker_compose, $(COMPOSE_FILES_FULL) restart $(SERVICE))
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

# Reconstruire un service spécifique
rebuild-service: ## Reconstruire un service spécifique (SERVICE=nom)
	@if [ -z "$(SERVICE)" ]; then \
		echo "❌ Spécifiez le service avec SERVICE=<nom>"; \
		echo "📋 Exemple: make rebuild-service SERVICE=api-gateway"; \
		exit 1; \
	fi
	@echo "🔨 Reconstruction du service: $(SERVICE)"
	@# Vérifier si le service est démarré
	@container_name="jobbingtrack-$(SERVICE)"; \
	if [ "$(SERVICE)" = "metrics-aggregator" ]; then \
		container_name="jobbingtrack-metrics-aggregator"; \
	fi; \
	if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^$$container_name$$"; then \
		echo "🛑 Arrêt du service en cours d'exécution..."; \
		(cd $(ROOT_DIR); \
		if echo "$(DOCKER_COMPOSE_CMD)" | grep -q "docker compose"; then \
			docker compose $(COMPOSE_FILES_FULL) stop $(SERVICE) || true; \
		else \
			docker-compose $(COMPOSE_FILES_FULL) stop $(SERVICE) || true; \
		fi); \
	else \
		echo "ℹ️  Service $(SERVICE) n'est pas démarré (normal pour rebuild)"; \
	fi
	@echo "🗑️  Suppression de l'ancienne image..."
	@container_name="jobbingtrack-$(SERVICE)"; \
	if [ "$(SERVICE)" = "metrics-aggregator" ]; then \
		container_name="jobbingtrack-metrics-aggregator"; \
	fi; \
	docker rmi $$container_name 2>/dev/null || echo "⚠️  Image non trouvée (normal)"
	@echo "🔨 Build en cours..."
	@if echo "$(DOCKER_COMPOSE_CMD)" | grep -q "docker compose"; then \
		cd $(ROOT_DIR) && docker compose $(COMPOSE_FILES_FULL) build --no-cache $(SERVICE); \
	else \
		cd $(ROOT_DIR) && docker-compose $(COMPOSE_FILES_FULL) build --no-cache $(SERVICE); \
	fi
	@echo "🚀 Démarrage du service..."
	@if echo "$(DOCKER_COMPOSE_CMD)" | grep -q "docker compose"; then \
		cd $(ROOT_DIR) && docker compose $(COMPOSE_FILES_FULL) up -d $(SERVICE); \
	else \
		cd $(ROOT_DIR) && docker-compose $(COMPOSE_FILES_FULL) up -d $(SERVICE); \
	fi
	@echo "⏳ Attente que le service démarre (5 secondes)..."
	@sleep 5
	@# Vérifier que le service est bien démarré
	@container_name="jobbingtrack-$(SERVICE)"; \
	if [ "$(SERVICE)" = "metrics-aggregator" ]; then \
		container_name="jobbingtrack-metrics-aggregator"; \
	fi; \
	if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^$$container_name$$"; then \
		echo "✅ Service $(SERVICE) reconstruit et démarré avec succès"; \
	else \
		echo "⚠️  Service $(SERVICE) reconstruit mais n'est pas démarré"; \
		echo "💡 Essayez de le démarrer manuellement: make start-service SERVICE=$(SERVICE)"; \
	fi
	@echo "💡 Vérifiez le statut avec: make status"

# Logs d'un service spécifique
logs-service: ## Voir les logs d'un service spécifique (SERVICE=nom)
	@if [ -z "$(SERVICE)" ]; then \
		echo "❌ Spécifiez le service avec SERVICE=<nom>"; \
		echo "📋 Exemple: make logs-service SERVICE=api-gateway"; \
		exit 1; \
	fi
	@# Gérer le cas spécial de metrics-aggregator qui a un nom différent
	@if [ "$(SERVICE)" = "metrics-aggregator" ]; then \
		echo "📋 Logs de jobbingtrack-metrics-aggregator..."; \
		docker logs -f jobbingtrack-metrics-aggregator 2>/dev/null || { \
			echo "❌ Conteneur jobbingtrack-metrics-aggregator non trouvé"; \
			echo "💡 Vérifiez avec: docker ps | grep metrics"; \
			exit 1; \
		}; \
	else \
		$(call docker_compose, $(COMPOSE_FILES_FULL) logs -f $(SERVICE)); \
	fi

# ============================================================================
# STATUS ET LOGS
# ============================================================================

# Statut détaillé
# Statut détaillé
status: ## Statut détaillé de chaque service (avec couleurs UP/DOWN, santé, ports, uptime)
	@echo "📊 Statut détaillé des services JobbingTrack"
	@echo "=========================================="
	@echo ""
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
	if [ "$$up_count" -eq 0 ]; then \
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
		else \
			echo -e "\033[1;33m⚠️  Base de données vide ou inaccessible (tables: $$TABLE_COUNT)\033[0m"; \
			echo -e "\033[1;33m💡 Exécutez 'make db-push-all' pour créer toutes les tables\033[0m"; \
		fi; \
	else \
		echo -e "\033[1;33m⚠️  PostgreSQL non démarré, vérification des tables impossible\033[0m"; \
	fi

# Statut en temps réel (actualisation automatique)
status-live: ## Statut détaillé en temps réel avec actualisation automatique (Ctrl+C pour quitter)
	@echo "📊 Statut en temps réel des services JobbingTrack"
	@echo "=========================================="
	@echo ""
	@echo "💡 Actualisation toutes les 2 secondes (Ctrl+C pour quitter)"
	@echo ""
	@while true; do \
		clear; \
		echo "📊 Statut détaillé des services JobbingTrack"; \
		echo "=========================================="; \
		echo ""; \
		echo "🟢 Services essentiels:"; \
		echo ""; \
		services="postgres redis api-gateway frontend auth-service dashboard-service"; \
		for service in $$services; do \
			container="jobbingtrack-$$service"; \
			if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^$$container$$"; then \
				ports=$$(docker ps --filter "name=$$container" --format "{{.Ports}}" 2>/dev/null); \
				if [ -n "$$ports" ]; then \
					port_main=$$(echo "$$ports" | grep -oE '0\.0\.0\.0:[0-9]+->[0-9]+/tcp' | head -1 | sed 's/0\.0\.0\.0://' | cut -d'>' -f1); \
					if [ -n "$$port_main" ]; then \
						printf "  \033[1;32m✅ UP\033[0m   %-30s %s\n" "$$service" "$$port_main"; \
					else \
						ports_short=$$(echo "$$ports" | sed 's/\[::\]//g' | tr -s ' ' | cut -c1-40); \
						printf "  \033[1;32m✅ UP\033[0m   %-30s %s\n" "$$service" "$$ports_short"; \
					fi; \
				else \
					printf "  \033[1;32m✅ UP\033[0m   %-30s\n" "$$service"; \
				fi; \
			else \
				printf "  \033[1;31m❌ DOWN\033[0m %-30s\n" "$$service"; \
			fi; \
		done; \
		echo ""; \
		echo "🔵 Services optionnels:"; \
		echo ""; \
		services="application-service company-service contact-service interview-service followup-service call-service metrics-aggregator"; \
		for service in $$services; do \
			container="jobbingtrack-$$service"; \
			if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^$$container$$"; then \
				ports=$$(docker ps --filter "name=$$container" --format "{{.Ports}}" 2>/dev/null); \
				if [ -n "$$ports" ]; then \
					port_main=$$(echo "$$ports" | grep -oE '0\.0\.0\.0:[0-9]+->[0-9]+/tcp' | head -1 | sed 's/0\.0\.0\.0://' | cut -d'>' -f1); \
					if [ -n "$$port_main" ]; then \
						printf "  \033[1;32m✅ UP\033[0m   %-30s %s\n" "$$service" "$$port_main"; \
					else \
						ports_short=$$(echo "$$ports" | sed 's/\[::\]//g' | tr -s ' ' | cut -c1-40); \
						printf "  \033[1;32m✅ UP\033[0m   %-30s %s\n" "$$service" "$$ports_short"; \
					fi; \
				else \
					printf "  \033[1;32m✅ UP\033[0m   %-30s\n" "$$service"; \
				fi; \
			else \
				printf "  \033[1;90m⚪ DOWN\033[0m %-30s\n" "$$service"; \
			fi; \
		done; \
		echo ""; \
		up_count=$$(docker ps --filter "name=jobbingtrack-" --format '{{.Names}}' 2>/dev/null | wc -l | tr -d ' '); \
		all_count=$$(docker ps -a --filter "name=jobbingtrack-" --format '{{.Names}}' 2>/dev/null | sort -u | wc -l | tr -d ' '); \
		if [ "$$all_count" -eq 0 ]; then all_count="$$up_count"; fi; \
		if [ "$$up_count" -eq 0 ]; then \
			printf "📊 Résumé : \033[1;31m%d/%d services actifs\033[0m\n" "$$up_count" "$$all_count"; \
		elif [ "$$up_count" -lt "$$all_count" ]; then \
			printf "📊 Résumé : \033[1;33m%d/%d services actifs\033[0m\n" "$$up_count" "$$all_count"; \
		else \
			printf "📊 Résumé : \033[1;32m%d/%d services actifs\033[0m\n" "$$up_count" "$$all_count"; \
		fi; \
		echo ""; \
		echo "💡 Actualisation dans 2 secondes... (Ctrl+C pour quitter)"; \
		sleep 2; \
	done

# Liste conteneurs actifs
ps: ## Liste les conteneurs actifs
	@echo "📦 Conteneurs actifs JobbingTrack"
	@echo "================================"
	$(call docker_compose, $(COMPOSE_FILES_FULL) ps)

# Logs en temps réel (sans metrics-aggregator) — via docker compose pour éviter "No such container"
logs: ## Affiche tous les logs en temps réel (sauf metrics-aggregator)
	@echo "📋 Logs en temps réel de tous les services (sauf metrics-aggregator)"
	@echo "========================================================================"
	@echo "💡 Pour voir les logs de metrics-aggregator: make logs-metrics"
	@echo ""
	@services=$$(cd $(ROOT_DIR) && docker compose $(COMPOSE_FILES_FULL) config --services 2>/dev/null | grep -v '^metrics-aggregator$$' | tr '\n' ' '); \
	if [ -n "$$services" ]; then \
		cd $(ROOT_DIR) && docker compose $(COMPOSE_FILES_FULL) logs -f $$services; \
	else \
		echo "⚠️  Aucun service trouvé (vérifiez que les conteneurs sont démarrés: make status)"; \
		echo "   Ou utilisez: make logs-service SERVICE=api-gateway"; \
	fi

# Logs de metrics-aggregator uniquement
logs-metrics: ## Affiche les logs du service metrics-aggregator
	@echo "📊 Logs de metrics-aggregator"
	@echo "=============================="
	@docker logs jobbingtrack-metrics-aggregator -f
