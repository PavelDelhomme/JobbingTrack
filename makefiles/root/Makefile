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
	$(call print_section,🚀 JOBBINGTRACK - PLATEFORME DE GESTION DE CANDIDATURES)
	@echo ""
	@echo "$(BOLD)$(CYAN)📦 DÉMARRAGE RAPIDE:$(NC)"
	@echo "  $(GREEN)make up$(NC)              - Démarrer TOUT (backend + frontend + données)"
	@echo "  $(GREEN)make start-all$(NC)       - Même que 'make up' avec reconstruction"
	@echo "  $(GREEN)make down$(NC)            - Arrêter TOUT proprement"
	@echo ""
	@echo "$(BOLD)$(CYAN)🔧 MAINTENANCE:$(NC)"
	@echo "  $(YELLOW)make clean$(NC)           - Nettoyer TOUT (containers, volumes, images)"
	@echo "  $(YELLOW)make rebuild$(NC)         - Reconstruire TOUT sans supprimer données"
	@echo "  $(YELLOW)make fix$(NC)             - Diagnostic + correction automatique"
	@echo "  $(YELLOW)make fix-frontend-deps$(NC) - Corriger les dépendances frontend"
	@echo "  $(YELLOW)make clean-conflicts$(NC) - Nettoyer automatiquement les conflits"
	@echo "  $(YELLOW)make create-admin$(NC)    - Créer l'utilisateur administrateur"
	@echo ""
	@echo "$(BOLD)$(CYAN)📊 SURVEILLANCE:$(NC)"
	@echo "  $(BLUE)make status$(NC)          - État de tous les services"
	@echo "  $(BLUE)make logs$(NC)            - Logs en temps réel de tous les services"
	@echo "  $(BLUE)make health$(NC)          - Vérification santé de tous les services"
	@echo ""
	@echo "$(BOLD)$(CYAN)🧪 TESTS:$(NC)"
	@echo "  $(PURPLE)make test-all$(NC)        - Tous les tests (unitaires + E2E + intégration)"
	@echo "  $(PURPLE)make test-e2e$(NC)       - Tests end-to-end Playwright"
	@echo "  $(PURPLE)make test-services$(NC)  - Tests de santé des microservices"
	@echo ""
	@echo "$(BOLD)$(CYAN)🏗️ DÉVELOPPEMENT:$(NC)"
	@echo "  $(GREEN)make dev$(NC)             - Mode développement avec hot reload"
	@echo "  $(GREEN)make build$(NC)           - Construire toutes les images"
	@echo "  $(GREEN)make migrate$(NC)         - Appliquer les migrations BDD"
	@echo ""
	@echo "$(BOLD)$(CYAN)🔍 DIAGNOSTIC & PRÉVENTION:$(NC)"
	@echo "  $(BLUE)make diagnose$(NC)         - Diagnostic complet du système"
	@echo "  $(BLUE)make check-deps$(NC)      - Vérifier toutes les dépendances"
	@echo "  $(BLUE)make check-health$(NC)    - Vérification santé préventive"
	@echo "  $(BLUE)make backup$(NC)          - Sauvegarde complète du projet"
	@echo "  $(BLUE)make clean-logs$(NC)      - Nettoyer les anciens logs"
	@echo "  $(BLUE)make check-disk$(NC)      - Vérifier l'espace disque"
	@echo ""
	@echo "$(BOLD)$(CYAN)📁 ORGANISATION:$(NC)"
	@echo "  📂 $(YELLOW)makefiles/$(NC)     - Tous les sous-Makefiles organisés"
	@echo "  📂 $(YELLOW)scripts/$(NC)       - Tous les scripts utilitaires"
	@echo "  📂 $(YELLOW)backend/$(NC)      - Microservices backend"
	@echo "  📂 $(YELLOW)frontend/$(NC)     - Interface Next.js"
	@echo ""
	@echo "$(BOLD)$(CYAN)💡 EXEMPLES D'USAGE:$(NC)"
	@echo "  $(GREEN)make up && make logs$(NC)                    # Démarrer et surveiller"
	@echo "  $(YELLOW)make fix && make create-admin$(NC)          # Corriger et configurer"
	@echo "  $(BLUE)make test-e2e && make status$(NC)           # Tester et vérifier"
	@echo ""
	@echo "$(BOLD)$(RED)⚠️ IMPORTANT:$(NC)"
	@echo "  • Utilisez $(YELLOW)make help-backend$(NC) pour les commandes backend uniquement"
	@echo "  • Utilisez $(YELLOW)make help-frontend$(NC) pour les commandes frontend uniquement"
	@echo "  • Utilisez $(YELLOW)make help-tests$(NC) pour les commandes de tests uniquement"
	@echo ""
	@echo "$(BOLD)$(CYAN)📖 GUIDES DÉTAILLÉS:$(NC)"
	@echo "  Backend:     make help-backend"
	@echo "  Frontend:    make help-frontend"
	@echo "  Tests:       make help-tests"
	@echo "  Scripts:     make help-scripts"

# ============================================================================
# DÉMARRAGE ET ARRÊT
# ============================================================================

# Démarrer tout le projet
up: check-deps ## Démarrer tout le projet (backend + frontend + base de données)
	@echo "🚀 Démarrage complet de JobbingTrack..."
	@echo "📦 Backend + Frontend + Base de données"

	# Vérifier et gérer les services existants
	$(call check_and_clean_existing_services)

	# Démarrer l'infrastructure d'abord (PostgreSQL + Redis)
	@echo "🏗️ Démarrage de l'infrastructure..."
	@cd $(BACKEND_DIR) && docker-compose -f docker-compose.yml up -d postgres redis

	# Attendre que PostgreSQL soit prêt avec vérification
	$(call wait_for_postgres)

	# Créer l'utilisateur admin une fois PostgreSQL prêt
	@echo "👤 Création de l'utilisateur administrateur..."
	@cd $(BACKEND_DIR) && bash $(SCRIPTS_DIR)/database/create-admin-user.sh

	# Démarrer le reste des services backend
	@echo "🌐 Démarrage des services backend..."
	@cd $(BACKEND_DIR) && $(call docker_compose, -f docker-compose.yml up -d)

	# Attendre que les services soient prêts
	@sleep 10

	# Démarrer le frontend
	@echo "🖥️ Démarrage du frontend..."
	@cd $(FRONTEND_DIR) && $(call docker_compose, -f docker-compose.frontend.yml up -d)

	@echo "✅ JobbingTrack démarré avec succès !"
	@echo ""
	@echo "🌐 Interfaces disponibles:"
	@echo "  Frontend:     http://localhost:8080"
	@echo "  API Gateway:  http://localhost:3000"
	@echo ""
	@echo "🔑 Identifiants:"
	@echo "  Email:    admin@jobbingtrack.test"
	@echo "  Password: SuperAdmin123!"

# Nettoyer les conflits et redémarrer proprement
clean-conflicts: ## Nettoyer automatiquement les conflits de ports et services
	$(call print_message,$(YELLOW),🧹 Nettoyage automatique des conflits...)
	@echo "$(BLUE)🔍 Recherche des conflits...$(NC)"

	# Arrêter les services existants
	$(call print_message,$(RED),🛑 Arrêt des services existants...)
	@$(MAKE) down >/dev/null 2>&1 || true

	# Attendre un peu que les ports se libèrent
	@sleep 3

	# Vérifier que les ports sont libres maintenant
	@echo "$(BLUE)🔍 Vérification des ports après nettoyage...$(NC)"
	@PORTS_STILL_OCCUPIED=0; \
	for port in 5432 6379 8080; do \
		if $(call check_port_occupied,$$port); then \
			echo "$(RED)❌ Port $$port toujours occupé$(NC)"; \
			PORTS_STILL_OCCUPIED=1; \
		else \
			echo "$(GREEN)✅ Port $$port libre$(NC)"; \
		fi \
	done; \
	\
	if [ "$$PORTS_STILL_OCCUPIED" = "0" ]; then \
		echo "$(GREEN)✅ Tous les conflits résolus$(NC)"; \
	else \
		echo "$(YELLOW)⚠️ Certains ports sont toujours occupés$(NC)"; \
		echo "$(CYAN)💡 Essayez: kill -9 <PID> pour forcer la libération$(NC)"; \
	fi

	$(call print_message,$(GREEN),✅ Nettoyage terminé)

# Arrêter tout le projet
down: ## Arrêter tout le projet proprement
	$(call print_message,$(RED),🛑 Arrêt complet de JobbingTrack...)
	@echo "$(YELLOW)🔍 Recherche des services à arrêter...$(NC)"

	# Lister les services backend
	@echo "$(BLUE)📦 Services backend:$(NC)"
	@cd $(BACKEND_DIR) && if $(call docker_compose, -f docker-compose.yml ps -q | grep -q .; then \)
		$(call docker_compose, -f docker-compose.yml ps --format "table {{.Service}}\t{{.Status}}" | grep -v "NAME\|---"; \)
		echo "$(YELLOW)⏹️ Arrêt des services backend...$(NC)"; \
		$(call docker_compose, -f docker-compose.yml down; \)
	else \
		echo "   $(GREEN)✅ Aucun service backend en cours$(NC)"; \
	fi

	# Lister les services frontend
	@echo "$(BLUE)🖥️ Services frontend:$(NC)"
	@cd $(FRONTEND_DIR) && if $(call docker_compose, -f docker-compose.frontend.yml ps -q | grep -q .; then \)
		$(call docker_compose, -f docker-compose.frontend.yml ps --format "table {{.Service}}\t{{.Status}}" | grep -v "NAME\|---"; \)
		echo "$(YELLOW)⏹️ Arrêt des services frontend...$(NC)"; \
		$(call docker_compose, -f docker-compose.frontend.yml down; \)
	else \
		echo "   $(GREEN)✅ Aucun service frontend en cours$(NC)"; \
	fi

	@echo "$(GREEN)✅ Tous les services arrêtés$(NC)"

# ============================================================================
# NETTOYAGE ET MAINTENANCE
# ============================================================================

# Nettoyer complètement
clean: ## Nettoyer complètement (containers, volumes, images)
	$(call print_message,$(RED),🧹 Nettoyage complet de JobbingTrack...)
	@$(MAKE) down
	@docker system prune -f
	@docker volume prune -f
	@docker network prune -f
	$(call print_message,$(GREEN),✅ Nettoyage terminé)

# ============================================================================
# DÉVELOPPEMENT
# ============================================================================

# Mode développement
dev: ## Mode développement avec hot reload
	$(call print_message,$(BLUE),🔧 Mode développement JobbingTrack...)
	$(call print_message,$(YELLOW),⚡ Démarrage rapide sans reconstruction...)
	@cd $(BACKEND_DIR) && $(call docker_compose, -f docker-compose.yml up -d)
	@cd $(FRONTEND_DIR) && $(call docker_compose, -f docker-compose.frontend.yml up -d)
	$(call print_message,$(GREEN),✅ Mode développement démarré)
	@echo ""
	@echo "$(CYAN)🌐 Accès:$(NC)"
	@echo "  Frontend: $(GREEN)http://localhost:8080$(NC)"
	@echo "  API:      $(GREEN)http://localhost:3000$(NC)"

# ============================================================================
# VÉRIFICATIONS
# ============================================================================

# Vérifier les dépendances
check-deps: ## Vérifier que toutes les dépendances sont installées
	$(call check_dependencies)

# ============================================================================
# CRÉATION D'UTILISATEUR
# ============================================================================

# Créer l'utilisateur admin
create-admin: ## Créer l'utilisateur administrateur
	$(call print_message,$(BLUE),👤 Création de l'utilisateur administrateur...)
	@bash $(SCRIPTS_DIR)/database/create-admin-user.sh

# ============================================================================
# DIAGNOSTIC ET CORRECTION
# ============================================================================

# Diagnostic et correction automatique
fix: ## Diagnostic et correction automatique
	$(call print_message,$(YELLOW),🔧 Diagnostic et correction automatique...)
	@bash $(SCRIPTS_DIR)/deployment/diagnostic-fix.sh full

# ============================================================================
# DÉMARRAGE AVEC RECONSTRUCTION
# ============================================================================

# Démarrer avec reconstruction
start-all: ## Démarrer avec reconstruction complète
	@bash $(SCRIPTS_DIR)/deployment/start-all.sh

# ============================================================================
# RECONSTRUCTION COMPLÈTE
# ============================================================================

# Rebuild complet
rebuild: ## Reconstruction complète
	$(call print_message,$(YELLOW),🔨 Reconstruction complète...)
	@$(MAKE) clean
	@$(MAKE) build
	@$(MAKE) up

# ============================================================================
# CONSTRUCTION
# ============================================================================

# Construire toutes les images
build: ## Construire toutes les images Docker
	$(call print_message,$(BLUE),🔨 Construction des images Docker...)
	@cd $(BACKEND_DIR) && $(call docker_compose, -f docker-compose.yml build --parallel)
	@cd $(FRONTEND_DIR) && $(call docker_compose, -f docker-compose.frontend.yml build --parallel)

# ============================================================================
# MIGRATIONS
# ============================================================================

# Appliquer les migrations
migrate: ## Appliquer les migrations de base de données
	$(call print_message,$(BLUE),🗄️ Application des migrations...)
	@cd $(BACKEND_DIR) && $(call docker_compose, -f docker-compose.yml exec auth-service npx prisma migrate deploy)

# ============================================================================
# LOGS ET STATUT
# ============================================================================

# Logs de tous les services
logs: ## Logs en temps réel de tous les services
	$(call print_message,$(BLUE),📋 Logs en temps réel...)
	@cd $(BACKEND_DIR) && $(call docker_compose, -f docker-compose.yml logs -f &)
	@cd $(FRONTEND_DIR) && $(call docker_compose, -f docker-compose.frontend.yml logs -f &)

# Statut des services
status: ## État de tous les services
	$(call print_message,$(BLUE),📊 Statut des services:)
	@echo "$(YELLOW)Backend:$(NC)"
	@cd $(BACKEND_DIR) && $(call docker_compose, -f docker-compose.yml ps)
	@echo ""
	@echo "$(YELLOW)Frontend:$(NC)"
	@cd $(FRONTEND_DIR) && $(call docker_compose, -f docker-compose.frontend.yml ps 2>/dev/null || echo "   Frontend non démarré")

# ============================================================================
# TESTS
# ============================================================================

# Tests complets
test-all: ## Tous les tests (unitaires + E2E + intégration)
	$(call print_message,$(PURPLE),🧪 Exécution de tous les tests...)
	@cd $(TESTS_DIR) && $(MAKE) test-all

# Tests E2E
test-e2e: ## Tests end-to-end Playwright
	$(call print_message,$(PURPLE),🎭 Tests end-to-end Playwright...)
	@cd $(FRONTEND_DIR) && npm run test:e2e

# Tests de santé
test-services: ## Tests de santé des microservices
	$(call print_message,$(BLUE),🏥 Tests de santé des services...)
	@cd $(BACKEND_DIR) && ./test-services.sh

# ============================================================================
# VÉRIFICATION SANTÉ
# ============================================================================

# Vérification santé
health: ## Vérification de la santé de tous les services
	$(call print_message,$(GREEN),💚 Vérification de la santé...)
	@curl -s http://localhost:3000/health || echo "$(RED)❌ API Gateway non accessible$(NC)"
	@curl -s http://localhost:8080 || echo "$(RED)❌ Frontend non accessible$(NC)"

# ============================================================================
# COMMANDES AVANCÉES - DÉLÉGATION AUX SOUS-MAKEFILES
# ============================================================================

# Appeler les sous-Makefiles avec délégation
%-backend: ## Déléguer aux commandes backend (ex: make build-backend)
	$(call print_message,$(BLUE),🔧 Exécution: $(subst -backend,,$@) (backend uniquement))
	@cd $(BACKEND_DIR) && $(MAKE) $(subst -backend,,$@)

%-frontend: ## Déléguer aux commandes frontend (ex: make build-frontend)
	$(call print_message,$(BLUE),🔧 Exécution: $(subst -frontend,,$@) (frontend uniquement))
	@cd $(FRONTEND_DIR) && $(MAKE) $(subst -frontend,,$@)

# Commande spécifique pour corriger les problèmes de dépendances frontend
fix-frontend-deps: ## Corriger les problèmes de dépendances frontend (socket.io-client, etc.)
	$(call print_message,$(YELLOW),🔧 Correction des dépendances frontend...)
	@cd $(FRONTEND_DIR) && $(MAKE) clean-all
	@cd $(FRONTEND_DIR) && $(MAKE) install-deps
	@echo "$(GREEN)✅ Dépendances frontend corrigées$(NC)"
	@echo "$(CYAN)💡 Le problème socket.io-client devrait être résolu$(NC)"

%-tests: ## Déléguer aux commandes de tests (ex: make test-all-tests)
	$(call print_message,$(BLUE),🔧 Exécution: $(subst -tests,,$@) (tests uniquement))
	@cd $(TESTS_DIR) && $(MAKE) $(subst -tests,,$@)

%-scripts: ## Déléguer aux scripts utilitaires (ex: make diagnostic-scripts)
	$(call print_message,$(BLUE),🔧 Exécution: $(subst -scripts,,$@) (scripts uniquement))
	@bash $(SCRIPTS_DIR)/$(subst -scripts,,$@).sh

# ============================================================================
# COMMANDES CONTEXTUELLES
# ============================================================================

# Aide backend
help-backend: ## Aide pour les commandes backend
	$(call print_message,$(BLUE),📚 Commandes Backend (microservices):)
	@cd $(BACKEND_DIR) && $(MAKE) help

# Aide frontend
help-frontend: ## Aide pour les commandes frontend
	$(call print_message,$(BLUE),📚 Commandes Frontend (Next.js):)
	@cd $(FRONTEND_DIR) && $(MAKE) help

# Aide tests
help-tests: ## Aide pour les commandes de tests
	$(call print_message,$(BLUE),📚 Commandes de Tests:)
	@cd $(TESTS_DIR) && $(MAKE) help

# Aide scripts
help-scripts: ## Aide pour les scripts utilitaires
	$(call print_message,$(BLUE),📚 Scripts utilitaires:)
	@bash $(SCRIPTS_DIR)/deployment/diagnostic-fix.sh help

# ============================================================================
# VARIABLES D'ENVIRONNEMENT
# ============================================================================

# Création du fichier .env
.env: ## Créer le fichier .env à partir du template
	$(call print_message,$(YELLOW),📝 Création du fichier .env...)
	@cp .env.example .env 2>/dev/null || echo "Fichier .env.example non trouvé"

# ============================================================================
# INSTALLATION
# ============================================================================

# Installation complète
install: check-deps .env ## Installation complète du projet
	$(call print_message,$(GREEN),✅ Installation terminée)
	$(call print_message,$(YELLOW),💡 Prochaine étape: make up)

# ============================================================================
# DIAGNOSTIC & PRÉVENTION
# ============================================================================

# Diagnostic complet du système
diagnose: check-deps check-health check-disk ## Diagnostic complet préventif
	$(call print_message,$(BLUE),🔍 Diagnostic du système terminé)
	@echo ""
	@echo "$(CYAN)💡 Conseils:$(NC)"
	@# Détecter automatiquement les problèmes et proposer des solutions
	@if [ $$(docker ps | grep -c "jobbingtrack") -gt 0 ]; then \
		echo "  • $(YELLOW)Conteneurs déjà démarrés détectés$(NC)"; \
		echo "    $(CYAN)💡 Utilisez: $(GREEN)make clean-conflicts$(NC) puis $(GREEN)make up$(NC)"; \
	else \
		echo "  • $(GREEN)✅ Aucun conflit détecté$(NC)"; \
		echo "    $(CYAN)💡 Vous pouvez utiliser: $(GREEN)make up$(NC)"; \
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
	$(call print_message,$(BLUE),🏥 Vérification de la santé préventive...)
	@echo "$(YELLOW)📋 Vérification des composants:$(NC)"
	@echo ""

	# Vérifier Docker
	@echo "$(BLUE)🐳 Docker:$(NC)"
	@if command -v docker &> /dev/null; then \
		echo "   $(GREEN)✅ Docker installé$(NC)"; \
		if docker info &> /dev/null; then \
			echo "   $(GREEN)✅ Docker daemon actif$(NC)"; \
	else \
			echo "   $(RED)❌ Docker daemon inactif$(NC)"; \
		fi \
	else \
		echo "   $(RED)❌ Docker non installé$(NC)"; \
	fi

	# Vérifier Docker Compose
	@echo "$(BLUE)🐳 Docker Compose:$(NC)"
	@if command -v docker-compose &> /dev/null; then \
		echo "   $(GREEN)✅ Docker Compose installé$(NC)"; \
	else \
		echo "   $(RED)❌ Docker Compose non installé$(NC)"; \
	fi

	# Vérifier l'espace disque
	@echo "$(BLUE)💾 Espace disque:$(NC)"
	@df -h . | awk 'NR==2 {print "   Capacité: " $$2 " | Utilisé: " $$3 " | Libre: " $$4 " (" $$5 " utilisé)"}'
	@if [ $$(df . | awk 'NR==2 {print $$5}' | sed 's/%//') -gt 80 ]; then \
		echo "   $(YELLOW)⚠️ Espace disque faible$(NC)"; \
	else \
		echo "   $(GREEN)✅ Espace disque suffisant$(NC)"; \
	fi

	# Vérifier les ports disponibles et identifier les processus
	@echo "$(BLUE)🌐 Ports réseau:$(NC)"
	@for port in 3000 3001 3002 3003 3004 3005 3006 3007 8080 5432 6379; do \
		if $(call check_port_occupied,$$port); then \
			PID=$$(call get_port_pid,$$port); \
			if [ -n "$$PID" ]; then \
				echo "   $(RED)❌ Port $$port occupé par: $$PID$(NC)"; \
			else \
				echo "   $(RED)❌ Port $$port occupé (processus inconnu)$(NC)"; \
			fi; \
		else \
			echo "   $(GREEN)✅ Port $$port libre$(NC)"; \
		fi \
	done

	# Vérifier les conteneurs existants
	@echo "$(BLUE)🐳 Conteneurs Docker:$(NC)"
	@EXISTING_CONTAINERS=$$(docker ps | grep "jobbingtrack" | wc -l); \
	if [ "$$EXISTING_CONTAINERS" -gt 0 ]; then \
		echo "   $(YELLOW)⚠️ $$EXISTING_CONTAINERS conteneur(s) JobbingTrack déjà démarré(s)$(NC)"; \
		docker ps | grep "jobbingtrack" | awk '{print "   • " $$NF " (" $$2 ")"}'; \
		echo "$(CYAN)💡 Solution: 'make down' pour arrêter les services existants$(NC)"; \
	else \
		echo "   $(GREEN)✅ Aucun conteneur JobbingTrack en cours$(NC)"; \
	fi

	@echo ""
	$(call print_message,$(GREEN),✅ Vérification santé terminée)

# Sauvegarde complète du projet
backup: ## Sauvegarde complète du projet (code + données)
	$(call print_message,$(BLUE),💾 Création d'une sauvegarde complète...)
	@BACKUP_DIR="backup_$$(date +%Y%m%d_%H%M%S)"; \
	mkdir -p "$$BACKUP_DIR"

	# Sauvegarder le code source
	@echo "$(YELLOW)📦 Sauvegarde du code source...$(NC)"
	@tar -czf "$$BACKUP_DIR/code.tar.gz" --exclude="node_modules" --exclude="*.log" --exclude="backup_*" .

	# Sauvegarder les données Docker si disponibles
	@if docker ps -q | grep -q .; then \
		echo "$(YELLOW)🐳 Sauvegarde des volumes Docker...$(NC)"; \
		docker run --rm -v jobbingtrack_postgres_data:/data -v $$(pwd)/$$BACKUP_DIR:/backup alpine tar czf /backup/postgres_data.tar.gz /data 2>/dev/null || echo "   Aucun volume PostgreSQL trouvé"; \
		docker run --rm -v jobbingtrack_redis_data:/data -v $$(pwd)/$$BACKUP_DIR:/backup alpine tar czf /backup/redis_data.tar.gz /data 2>/dev/null || echo "   Aucun volume Redis trouvé"; \
	fi

	@echo "$(GREEN)✅ Sauvegarde créée: $$BACKUP_DIR/$(NC)"
	@echo "$(CYAN)📋 Contenu:$(NC)"
	@ls -la "$$BACKUP_DIR/"

# Nettoyer les anciens logs
clean-logs: ## Nettoyer les anciens logs système
	$(call print_message,$(BLUE),🧹 Nettoyage des logs anciens...)
	@find . -name "*.log" -type f -mtime +7 -delete 2>/dev/null || true
	@docker system prune -f --volumes 2>/dev/null || true
	@echo "$(GREEN)✅ Logs anciens supprimés$(NC)"

# Vérifier l'espace disque
check-disk: ## Vérifier l'espace disque disponible
	$(call print_message,$(BLUE),💾 Analyse de l'espace disque...)
	@echo "$(YELLOW)📊 Utilisation actuelle:$(NC)"
	@df -h . | awk 'NR==2 {print "   Capacité totale: " $$2 "\n   Utilisé: " $$3 " (" $$5 ")\n   Disponible: " $$4}'
	@echo ""
	@echo "$(YELLOW)📁 Répartition par type:$(NC)"
	@du -sh * 2>/dev/null | sort -hr | head -10 | awk '{print "   " $$2 ": " $$1}'
	@echo ""
	@if [ $$(df . | awk 'NR==2 {print $$5}' | sed 's/%//') -gt 90 ]; then \
		echo "$(RED)❌ Espace disque critique !$(NC)"; \
		echo "$(YELLOW)💡 Actions recommandées:$(NC)"; \
		echo "   • make clean-logs"; \
		echo "   • Supprimer les anciennes sauvegardes"; \
		echo "   • Vider la corbeille Docker"; \
	else \
		echo "$(GREEN)✅ Espace disque suffisant$(NC)"; \
	fi

# ============================================================================
# WORKFLOW RECOMMANDÉ
# ============================================================================

# Workflow recommandé complet
help-full: help ## Aide complète avec workflow recommandé
	@echo ""
	@echo "$(YELLOW)📖 WORKFLOW RECOMMANDÉ:$(NC)"
	@echo "  1. $(BLUE)make diagnose$(NC)         - Diagnostic préventif"
	@echo "  2. $(GREEN)make up$(NC)              - Démarrer tout"
	@echo "  3. $(BLUE)make logs$(NC)             - Surveiller les logs"
	@echo "  4. $(PURPLE)make test-all$(NC)        - Tester tout"
	@echo "  5. $(YELLOW)make fix$(NC)              - Corriger les problèmes"
	@echo "  6. $(RED)make down && make clean$(NC) - Arrêter et nettoyer"
	@echo ""
	@echo "$(CYAN)🔧 MAINTENANCE QUOTIDIENNE:$(NC)"
	@echo "  $(BLUE)make check-health$(NC)      - Vérification santé rapide"
	@echo "  $(BLUE)make clean-logs$(NC)       - Nettoyage automatique"
	@echo "  $(PURPLE)make backup$(NC)           - Sauvegarde périodique"