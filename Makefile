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

.PHONY: help build up down clean dev test migrate logs status install setup

# ============================================================================
# COMMANDES PRINCIPALES
# ============================================================================

# Aide complète avec organisation par catégories
help: ## Afficher l'aide complète organisée par catégories
	@echo "================================================================"
	@echo "🚀 JOBBINGTRACK - PLATEFORME DE GESTION DE CANDIDATURES"
	@echo "================================================================"
	@echo ""
	@echo "📦 DEMARRAGE RAPIDE:"
	@echo "  make up              - Démarrer TOUT (backend + frontend + données)"
	@echo "  make start-all       - Même que 'make up' avec reconstruction"
	@echo "  make down            - Arrêter TOUT proprement"
	@echo ""
	@echo "🔧 MAINTENANCE:"
	@echo "  make clean           - Nettoyer TOUT (containers, volumes, images)"
	@echo "  make rebuild         - Reconstruire TOUT sans supprimer données"
	@echo "  make fix             - Diagnostic + correction automatique"
	@echo "  make clean-conflicts - Nettoyer automatiquement les conflits"
	@echo "  make create-admin    - Créer l'utilisateur administrateur"
	@echo ""
	@echo "📊 SURVEILLANCE:"
	@echo "  make status          - État de tous les services"
	@echo "  make logs            - Logs en temps réel de tous les services"
	@echo "  make logs-system     - Logs des services système uniquement"
	@echo "  make logs-deployment - Logs du service de déploiement"
	@echo "  make logs-security   - Logs du service de sécurité"
	@echo "  make health          - Vérification santé de tous les services"
	@echo ""
	@echo "🧪 TESTS:"
	@echo "  make test-all        - Tous les tests (unitaires + E2E + intégration)"
	@echo "  make test-e2e       - Tests end-to-end Playwright"
	@echo "  make test-services  - Tests de santé des microservices"
	@echo ""
	@echo "🏗️ DEVELOPPEMENT:"
	@echo "  make dev             - Mode développement avec hot reload"
	@echo "  make build           - Construire toutes les images"
	@echo "  make build-system    - Construire seulement les services système"
	@echo "  make migrate         - Appliquer les migrations BDD"
	@echo ""
	@echo "🎯 GESTION SERVICES:"
	@echo "  make start-system    - Démarrer services système (stats, déploiement, sécurité)"
	@echo "  make start-deployment - Démarrer service de déploiement"
	@echo "  make start-security  - Démarrer service de sécurité"
	@echo "  make stop-system     - Arrêter services système"
	@echo "  make stop-deployment - Arrêter service de déploiement"
	@echo "  make stop-security   - Arrêter service de sécurité"
	@echo "  make restart-system  - Redémarrer services système"
	@echo ""
	@echo "🔍 DIAGNOSTIC & PREVENTION:"
	@echo "  make diagnose        - Diagnostic complet du système"
	@echo "  make check-deps      - Vérifier toutes les dépendances"
	@echo "  make check-health    - Vérification santé préventive"
	@echo "  make backup          - Sauvegarde complète du projet"
	@echo "  make clean-logs      - Nettoyer les anciens logs"
	@echo "  make check-disk      - Vérifier l'espace disque"
	@echo ""
	@echo "📁 ORGANISATION:"
	@echo "  📂 makefiles/     - Tous les sous-Makefiles organisés"
	@echo "  📂 scripts/       - Tous les scripts utilitaires"
	@echo "  📂 backend/      - Microservices backend"
	@echo "  📂 frontend/     - Interface Next.js"
	@echo ""
	@echo "💡 EXEMPLES D'USAGE:"
	@echo "  make up && make logs                    # Démarrer et surveiller"
	@echo "  make fix && make create-admin          # Corriger et configurer"
	@echo "  make test-e2e && make status           # Tester et vérifier"
	@echo ""
	@echo "⚠️ IMPORTANT:"
	@echo "  • Utilisez 'make help-backend' pour les commandes backend uniquement"
	@echo "  • Utilisez 'make help-frontend' pour les commandes frontend uniquement"
	@echo "  • Utilisez 'make help-tests' pour les commandes de tests uniquement"
	@echo ""
	@echo "📖 GUIDES DETAILLES:"
	@echo "  Backend:     make help-backend"
	@echo "  Frontend:    make help-frontend"
	@echo "  Tests:       make help-tests"
	@echo "  Scripts:     make help-scripts"

# ============================================================================
# DEMARRAGE ET ARRET
# ============================================================================

# Démarrer tout le projet
up: check-deps ## Démarrer tout le projet (backend + frontend + base de données)
	@echo "🚀 Démarrage complet de JobbingTrack..."
	@echo "📦 Backend + Frontend + Base de données"

	# Vérifier et gérer les services existants
	@if [ $$(docker ps | grep -c "jobbingtrack") -gt 0 ]; then \
		echo "⚠️ Services déjà démarrés détectés"; \
		echo "💡 Utilisez 'make down' pour arrêter d'abord"; \
		exit 1; \
	fi

	# Démarrer l'infrastructure d'abord (PostgreSQL + Redis)
	@echo "🏗️ Démarrage de l'infrastructure..."
	@cd $(BACKEND_DIR) && docker-compose -f docker-compose.yml up -d postgres redis >/dev/null 2>&1 && echo "✅ Infrastructure démarrée"

	# Démarrer les services système (stats, déploiement, sécurité)
	@echo "🔧 Démarrage des services système..."
	@cd $(BACKEND_DIR) && docker-compose -f docker-compose.yml up -d docker-stats-service deployment-service security-service >/dev/null 2>&1 && echo "✅ Services système démarrés"

	# Attendre que PostgreSQL soit prêt avec vérification
	@$(call wait_for_postgres)

	# Créer l'utilisateur admin une fois PostgreSQL prêt
	@echo "👤 Création de l'utilisateur administrateur..."
	@cd $(BACKEND_DIR) && bash $(SCRIPTS_DIR)/database/create-admin-user.sh >/dev/null 2>&1 && echo "✅ Administrateur créé"

	# Démarrer le reste des services backend
	@echo "🌐 Démarrage des services backend..."
	@cd $(BACKEND_DIR) && docker compose -f docker-compose.yml up -d >/dev/null 2>&1 && echo "✅ Services backend démarrés"

	# Attendre que les services soient prêts
	@sleep 15

	# Démarrer le frontend
	@echo "🖥️ Démarrage du frontend..."
	@cd $(FRONTEND_DIR) && docker compose -f docker-compose.frontend.yml up -d >/dev/null 2>&1 && echo "✅ Frontend démarré"

	@echo ""
	@echo "✅ JobbingTrack démarré avec succès !"
	@echo ""
	@echo "🌐 Interfaces disponibles:"
	@echo "  Frontend:     http://localhost:8080"
	@echo "  API Gateway:  http://localhost:3000"
	@echo ""
	@echo "🔑 Identifiants:"
	@echo "  Email:    admin@jobbingtrack.com"
	@echo "  Password: SuperAdmin123!"
	@echo ""
	@echo "💡 Utilisez 'make logs' pour surveiller les logs en temps réel"

# Nettoyer les conflits et redémarrer proprement
clean-conflicts: ## Nettoyer automatiquement les conflits de ports et services
	@echo "🧹 Nettoyage automatique des conflits..."

	# Arrêter les services existants
	@$(MAKE) down >/dev/null 2>&1 || true

	# Attendre un peu que les ports se libèrent
	@sleep 3

	# Vérifier que les ports sont libres maintenant
	@PORTS_STILL_OCCUPIED=0; \
	for port in 5432 6379 8080; do \
		if netstat -tuln 2>/dev/null | grep -q ":$$port "; then \
			PORTS_STILL_OCCUPIED=1; \
		fi \
	done; \
	\
	if [ "$$PORTS_STILL_OCCUPIED" = "0" ]; then \
		echo "✅ Tous les conflits résolus"; \
	else \
		echo "⚠️ Certains ports sont toujours occupés"; \
		echo "💡 Utilisez: kill -9 <PID> pour forcer la libération"; \
	fi

# Arrêter tout le projet
down: ## Arrêter tout le projet proprement
	@echo "🛑 Arrêt complet de JobbingTrack..."

	# Lister et arrêter les services backend
	@echo "📦 Services backend:"
	@cd $(BACKEND_DIR) && SERVICES=$$(docker compose -f docker-compose.yml ps -q 2>/dev/null); \
	if [ -n "$$SERVICES" ]; then \
		docker compose -f docker-compose.yml ps --format "table {{.Service}}\t{{.Status}}" | grep -v "NAME\|---"; \
		echo "⏹️ Arrêt des services backend..."; \
		docker compose -f docker-compose.yml down >/dev/null 2>&1 && echo "✅ Services backend arrêtés"; \
	else \
		echo "   ✅ Aucun service backend en cours"; \
	fi

	# Lister et arrêter les services frontend
	@echo "🖥️ Services frontend:"
	@cd $(FRONTEND_DIR) && SERVICES=$$(docker compose -f docker-compose.frontend.yml ps -q 2>/dev/null); \
	if [ -n "$$SERVICES" ]; then \
		docker compose -f docker-compose.frontend.yml ps --format "table {{.Service}}\t{{.Status}}" | grep -v "NAME\|---"; \
		echo "⏹️ Arrêt des services frontend..."; \
		docker compose -f docker-compose.frontend.yml down >/dev/null 2>&1 && echo "✅ Services frontend arrêtés"; \
	else \
		echo "   ✅ Aucun service frontend en cours"; \
	fi

	@echo "✅ Tous les services arrêtés"

# ============================================================================
# NETTOYAGE ET MAINTENANCE
# ============================================================================

# Nettoyer complètement
clean: ## Nettoyer complètement (containers, volumes, images)
	@echo "🧹 Nettoyage complet de JobbingTrack..."
	@$(MAKE) down
	@docker system prune -f
	@docker volume prune -f
	@docker network prune -f
	@echo "✅ Nettoyage terminé"

# ============================================================================
# DEVELOPPEMENT
# ============================================================================

# Mode développement
dev: ## Mode développement avec hot reload
	@echo "🔧 Mode développement JobbingTrack..."
	@echo "⚡ Démarrage rapide sans reconstruction..."
	@cd $(BACKEND_DIR) && docker compose -f docker-compose.yml up -d
	@cd $(FRONTEND_DIR) && docker compose -f docker-compose.frontend.yml up -d
	@echo "✅ Mode développement démarré"
	@echo ""
	@echo "🌐 Accès:"
	@echo "  Frontend: http://localhost:8080"
	@echo "  API:      http://localhost:3000"

# ============================================================================
# VERIFICATIONS
# ============================================================================

# Vérifier les dépendances
check-deps: ## Vérifier que toutes les dépendances sont installées
	$(call check_dependencies)

# ============================================================================
# CREATION D'UTILISATEUR
# ============================================================================

# Créer l'utilisateur admin
create-admin: ## Créer l'utilisateur administrateur
	@echo "👤 Création de l'utilisateur administrateur..."
	@bash $(SCRIPTS_DIR)/database/create-admin-user.sh

# ============================================================================
# DIAGNOSTIC ET CORRECTION
# ============================================================================

# Diagnostic et correction automatique
fix: ## Diagnostic et correction automatique
	@echo "🔧 Diagnostic et correction automatique..."
	@bash $(SCRIPTS_DIR)/deployment/diagnostic-fix.sh full

# ============================================================================
# DEMARRAGE AVEC RECONSTRUCTION
# ============================================================================

# Démarrer avec reconstruction
start-all: ## Démarrer avec reconstruction complète
	@bash $(SCRIPTS_DIR)/deployment/start-all.sh

# ============================================================================
# RECONSTRUCTION COMPLETE
# ============================================================================

# Rebuild complet
rebuild: ## Reconstruction complète
	@echo "🔨 Reconstruction complète..."
	@$(MAKE) clean
	@$(MAKE) build
	@$(MAKE) up

# ============================================================================
# CONSTRUCTION
# ============================================================================

# Construire toutes les images
build: ## Construire toutes les images Docker
	@echo "🔨 Construction des images Docker..."
	@cd $(BACKEND_DIR) && docker compose -f docker-compose.yml build --parallel
	@cd $(FRONTEND_DIR) && docker compose -f docker-compose.frontend.yml build --parallel

# Construire seulement les services système
build-system: ## Construire seulement les services système
	@echo "🔨 Construction des services système..."
	@cd $(BACKEND_DIR) && docker compose -f docker-compose.yml build docker-stats-service deployment-service security-service

# ============================================================================
# MIGRATIONS
# ============================================================================

# Appliquer les migrations
migrate: ## Appliquer les migrations de base de données
	@echo "🗄️ Application des migrations..."
	@cd $(BACKEND_DIR) && docker compose -f docker-compose.yml exec auth-service npx prisma migrate deploy

# ============================================================================
# LOGS ET STATUT
# ============================================================================

# Logs de tous les services
logs: ## Logs en temps réel de tous les services
	@echo "📋 Logs en temps réel..."
	@cd $(BACKEND_DIR) && docker compose -f docker-compose.yml logs -f &
	@cd $(FRONTEND_DIR) && docker compose -f docker-compose.frontend.yml logs -f &

# Statut des services
status: ## État de tous les services
	@echo "📊 Statut des services:"
	@echo ""

	# Services backend
	@echo "📦 Backend:"
	@cd $(BACKEND_DIR) && if docker compose -f docker-compose.yml ps -q >/dev/null 2>&1; then \
		docker compose -f docker-compose.yml ps; \
	else \
		echo "   Aucun service backend démarré"; \
	fi

	@echo ""
	@echo "🖥️ Frontend:"
	@cd $(FRONTEND_DIR) && if docker compose -f docker-compose.frontend.yml ps -q >/dev/null 2>&1; then \
		docker compose -f docker-compose.frontend.yml ps; \
	else \
		echo "   Aucun service frontend démarré"; \
	fi

	@echo ""
	@echo "💡 Utilisez 'make logs' pour voir les logs en temps réel"

# ============================================================================
# TESTS
# ============================================================================

# Tests complets
test-all: ## Tous les tests (unitaires + E2E + intégration)
	@echo "🧪 Exécution de tous les tests..."
	@cd $(TESTS_DIR) && $(MAKE) test-all

# Tests E2E
test-e2e: ## Tests end-to-end Playwright
	@echo "🎭 Tests end-to-end Playwright..."
	@cd $(FRONTEND_DIR) && npm run test:e2e

# Tests de santé
test-services: ## Tests de santé des microservices
	@echo "🏥 Tests de santé des services..."
	@cd $(BACKEND_DIR) && ./test-services.sh

# ============================================================================
# VERIFICATION SANTE
# ============================================================================

# Vérification santé
health: ## Vérification de la santé de tous les services
	@echo "💚 Vérification de la santé..."
	@curl -s http://localhost:3000/health || echo "❌ API Gateway non accessible"
	@curl -s http://localhost:8080 || echo "❌ Frontend non accessible"

# ============================================================================
# COMMANDES AVANCEES - DELEGATION AUX SOUS-MAKEFILES
# ============================================================================

# Appeler les sous-Makefiles avec délégation
%-backend: ## Déléguer aux commandes backend (ex: make build-backend)
	@echo "🔧 Exécution: $(subst -backend,,$@) (backend uniquement)"
	@cd $(BACKEND_DIR) && $(MAKE) $(subst -backend,,$@)

%-frontend: ## Déléguer aux commandes frontend (ex: make build-frontend)
	@echo "🔧 Exécution: $(subst -frontend,,$@) (frontend uniquement)"
	@cd $(FRONTEND_DIR) && $(MAKE) $(subst -frontend,,$@)

%-tests: ## Déléguer aux commandes de tests (ex: make test-all-tests)
	@echo "🔧 Exécution: $(subst -tests,,$@) (tests uniquement)"
	@cd $(TESTS_DIR) && $(MAKE) $(subst -tests,,$@)

%-scripts: ## Déléguer aux scripts utilitaires (ex: make diagnostic-scripts)
	@echo "🔧 Exécution: $(subst -scripts,,$@) (scripts uniquement)"
	@bash $(SCRIPTS_DIR)/$(subst -scripts,,$@).sh

# ============================================================================
# COMMANDES CONTEXTUELLES
# ============================================================================

# Aide backend
help-backend: ## Aide pour les commandes backend
	@echo "📚 Commandes Backend (microservices):"
	@cd $(BACKEND_DIR) && $(MAKE) help

# Aide frontend
help-frontend: ## Aide pour les commandes frontend
	@echo "📚 Commandes Frontend (Next.js):"
	@cd $(FRONTEND_DIR) && $(MAKE) help

# Aide tests
help-tests: ## Aide pour les commandes de tests
	@echo "📚 Commandes de Tests:"
	@cd $(TESTS_DIR) && $(MAKE) help

# Aide scripts
help-scripts: ## Aide pour les scripts utilitaires
	@echo "📚 Scripts utilitaires:"
	@bash $(SCRIPTS_DIR)/deployment/diagnostic-fix.sh help

# ============================================================================
# VARIABLES D'ENVIRONNEMENT
# ============================================================================

# Création du fichier .env
.env: ## Créer le fichier .env à partir du template
	@echo "📝 Création du fichier .env..."
	@cp .env.example .env 2>/dev/null || echo "Fichier .env.example non trouvé"

# ============================================================================
# INSTALLATION
# ============================================================================

# Installation complète
install: check-deps .env ## Installation complète du projet
	@echo "✅ Installation terminée"
	@echo "💡 Prochaine étape: make up"

# ============================================================================
# DIAGNOSTIC & PREVENTION
# ============================================================================

# Diagnostic complet du système
diagnose: check-deps check-health check-disk ## Diagnostic complet préventif
	@echo "🔍 Diagnostic du système terminé"
	@echo ""
	@echo "💡 Conseils:"
	@# Détecter automatiquement les problèmes et proposer des solutions
	@EXISTING_CONTAINERS=$$(docker ps | grep -c "jobbingtrack" || echo "0"); \
	if [ "$$EXISTING_CONTAINERS" -gt 0 ]; then \
		echo "  ⚠️ $$EXISTING_CONTAINERS service(s) JobbingTrack déjà démarré(s)"; \
		echo "    💡 Utilisez 'make down' puis 'make up'"; \
	else \
		echo "  ✅ Aucun service en cours d'exécution"; \
		echo "    💡 Vous pouvez utiliser 'make up'"; \
	fi
	@echo ""
	@echo "  • Tous les systèmes sont opérationnels"
	@echo "  • Espace disque suffisant disponible"
	@echo "  • Toutes les dépendances sont installées"
	@echo "  • Services en bonne santé"

# Vérifier les dépendances système
check-deps: ## Vérifier que toutes les dépendances sont installées
	$(call check_dependencies)

# Vérification santé préventive
check-health: ## Vérification santé préventive de tous les composants
	@echo "🏥 Vérification de la santé préventive..."
	@echo "📋 Vérification des composants:"
	@echo ""

	# Vérifier Docker
	@echo "🐳 Docker:"
	@if command -v docker &> /dev/null; then \
		echo "   ✅ Docker installé"; \
		if docker info &> /dev/null; then \
			echo "   ✅ Docker daemon actif"; \
		else \
			echo "   ❌ Docker daemon inactif"; \
		fi \
	else \
		echo "   ❌ Docker non installé"; \
	fi

	# Vérifier Docker Compose
	@echo "🐳 Docker Compose:"
	@if command -v docker-compose &> /dev/null; then \
		echo "   ✅ Docker Compose installé"; \
	else \
		echo "   ❌ Docker Compose non installé"; \
	fi

	# Vérifier l'espace disque
	@echo "💾 Espace disque:"
	@DISK_USAGE=$$(df . | awk 'NR==2 {print $$5}' | sed 's/%//'); \
	df -h . | awk 'NR==2 {print "   Capacité: " $$2 " | Utilisé: " $$3 " | Libre: " $$4 " (" $$5 " utilisé)"}'; \
	if [ "$$DISK_USAGE" -gt 80 ]; then \
		echo "   ⚠️ Espace disque faible"; \
	else \
		echo "   ✅ Espace disque suffisant"; \
	fi

	# Vérifier les ports disponibles
	@echo "🌐 Ports réseau:"
	@for port in 3000 8080 5432 6379; do \
		if netstat -tuln 2>/dev/null | grep -q ":$$port "; then \
			echo "   ❌ Port $$port occupé"; \
		else \
			echo "   ✅ Port $$port libre"; \
		fi \
	done

	# Vérifier les conteneurs existants
	@echo "🐳 Conteneurs Docker:"
	@EXISTING_CONTAINERS=$$(docker ps 2>/dev/null | grep -c "jobbingtrack" || echo "0"); \
	if [ "$$EXISTING_CONTAINERS" -gt 0 ]; then \
		echo "   ⚠️ $$EXISTING_CONTAINERS conteneur(s) JobbingTrack déjà démarré(s)"; \
	else \
		echo "   ✅ Aucun conteneur JobbingTrack en cours"; \
	fi

	@echo ""
	@echo "✅ Vérification santé terminée"

# Sauvegarde complète du projet
backup: ## Sauvegarde complète du projet (code + données)
	@echo "💾 Création d'une sauvegarde complète..."
	@BACKUP_DIR="backup_$$(date +%Y%m%d_%H%M%S)"; \
	mkdir -p "$$BACKUP_DIR"

	# Sauvegarder le code source
	@echo "📦 Sauvegarde du code source..."
	@tar -czf "$$BACKUP_DIR/code.tar.gz" --exclude="node_modules" --exclude="*.log" --exclude="backup_*" .

	# Sauvegarder les données Docker si disponibles
	@if docker ps -q | grep -q .; then \
		echo "🐳 Sauvegarde des volumes Docker..."; \
		docker run --rm -v jobbingtrack_postgres_data:/data -v $$(pwd)/$$BACKUP_DIR:/backup alpine tar czf /backup/postgres_data.tar.gz /data 2>/dev/null || echo "   Aucun volume PostgreSQL trouvé"; \
		docker run --rm -v jobbingtrack_redis_data:/data -v $$(pwd)/$$BACKUP_DIR:/backup alpine tar czf /backup/redis_data.tar.gz /data 2>/dev/null || echo "   Aucun volume Redis trouvé"; \
	fi

	@echo "✅ Sauvegarde créée: $$BACKUP_DIR/"
	@echo "📋 Contenu:"
	@ls -la "$$BACKUP_DIR/"

# Nettoyer les anciens logs
clean-logs: ## Nettoyer les anciens logs système
	@echo "🧹 Nettoyage des logs anciens..."
	@find . -name "*.log" -type f -mtime +7 -delete 2>/dev/null || true
	@docker system prune -f --volumes 2>/dev/null || true
	@echo "✅ Logs anciens supprimés"

# Vérifier l'espace disque
check-disk: ## Vérifier l'espace disque disponible
	@echo "💾 Analyse de l'espace disque..."
	@echo "📊 Utilisation actuelle:"
	@df -h . | awk 'NR==2 {print "   Capacité totale: " $$2 "\n   Utilisé: " $$3 " (" $$5 ")\n   Disponible: " $$4}'
	@echo ""
	@echo "📁 Répartition par type:"
	@du -sh * 2>/dev/null | sort -hr | head -10 | awk '{print "   " $$2 ": " $$1}'
	@echo ""
	@if [ $$(df . | awk 'NR==2 {print $$5}' | sed 's/%//') -gt 90 ]; then \
		echo "❌ Espace disque critique !"; \
		echo "💡 Actions recommandées:"; \
		echo "   • make clean-logs"; \
		echo "   • Supprimer les anciennes sauvegardes"; \
		echo "   • Vider la corbeille Docker"; \
	else \
		echo "✅ Espace disque suffisant"; \
	fi

# ============================================================================
# GESTION DES SERVICES SPECIFIQUES
# ============================================================================

# Démarrer seulement les services système (stats, déploiement, sécurité)
start-system: ## Démarrer seulement les services système
	@echo "🔧 Démarrage des services système..."
	@cd $(BACKEND_DIR) && docker compose -f docker-compose.yml up -d docker-stats-service deployment-service security-service
	@echo "✅ Services système démarrés"

# Arrêter seulement les services système
stop-system: ## Arrêter seulement les services système
	@echo "⏹️ Arrêt des services système..."
	@cd $(BACKEND_DIR) && docker compose -f docker-compose.yml stop docker-stats-service deployment-service security-service
	@echo "✅ Services système arrêtés"

# Redémarrer seulement les services système
restart-system: stop-system start-system ## Redémarrer seulement les services système

# Logs des services système
logs-system: ## Logs des services système uniquement
	@echo "📋 Logs des services système..."
	@cd $(BACKEND_DIR) && docker compose -f docker-compose.yml logs -f docker-stats-service deployment-service security-service

# Démarrer seulement le service de déploiement
start-deployment: ## Démarrer seulement le service de déploiement
	@echo "🚀 Démarrage du service de déploiement..."
	@cd $(BACKEND_DIR) && docker compose -f docker-compose.yml up -d deployment-service
	@echo "✅ Service de déploiement démarré"

# Arrêter seulement le service de déploiement
stop-deployment: ## Arrêter seulement le service de déploiement
	@echo "⏹️ Arrêt du service de déploiement..."
	@cd $(BACKEND_DIR) && docker compose -f docker-compose.yml stop deployment-service
	@echo "✅ Service de déploiement arrêté"

# Logs du service de déploiement
logs-deployment: ## Logs du service de déploiement
	@echo "📋 Logs du service de déploiement..."
	@cd $(BACKEND_DIR) && docker compose -f docker-compose.yml logs -f deployment-service

# Démarrer seulement le service de sécurité
start-security: ## Démarrer seulement le service de sécurité
	@echo "🔒 Démarrage du service de sécurité..."
	@cd $(BACKEND_DIR) && docker compose -f docker-compose.yml up -d security-service
	@echo "✅ Service de sécurité démarré"

# Arrêter seulement le service de sécurité
stop-security: ## Arrêter seulement le service de sécurité
	@echo "⏹️ Arrêt du service de sécurité..."
	@cd $(BACKEND_DIR) && docker compose -f docker-compose.yml stop security-service
	@echo "✅ Service de sécurité arrêté"

# Logs du service de sécurité
logs-security: ## Logs du service de sécurité
	@echo "📋 Logs du service de sécurité..."
	@cd $(BACKEND_DIR) && docker compose -f docker-compose.yml logs -f security-service

# ============================================================================
# WORKFLOW RECOMMANDE
# ============================================================================

# Workflow recommandé complet
help-full: help ## Aide complète avec workflow recommandé
	@echo ""
	@echo "📖 WORKFLOW RECOMMANDE:"
	@echo "  1. make diagnose         - Diagnostic préventif"
	@echo "  2. make up              - Démarrer tout"
	@echo "  3. make logs             - Surveiller les logs"
	@echo "  4. make test-all         - Tester tout"
	@echo "  5. make fix              - Corriger les problèmes"
	@echo "  6. make down && make clean - Arrêter et nettoyer"
	@echo ""
	@echo "🔧 MAINTENANCE QUOTIDIENNE:"
	@echo "  make check-health      - Vérification santé rapide"
	@echo "  make clean-logs       - Nettoyage automatique"
	@echo "  make backup           - Sauvegarde périodique"
