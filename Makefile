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
# COMMANDES PRINCIPALES
# ============================================================================

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
	@echo "  make rebuild-service SERVICE=nom - Rebuild un service"
	@echo "  make clean          - Nettoyage complet"
	@echo ""
	@echo "🧪 TESTS:"
	@echo "  make test           - Lancer tous les tests"
	@echo "  make test-service SERVICE=nom - Tests d'un service"
	@echo "  make test-integration - Tests d'intégration"
	@echo ""
	@echo "📈 MONITORING:"
	@echo "  make metrics        - Ouvrir Prometheus"
	@echo "  make cadvisor       - Ouvrir cAdvisor"
	@echo "  make logs-metrics   - Logs du système de métriques"
	@echo ""
	@echo "🛠️ UTILITAIRES:"
	@echo "  make shell SERVICE=nom - Shell dans un conteneur"
	@echo "  make exec SERVICE=nom CMD='commande' - Exécuter une commande"
	@echo "  make check-deps     - Vérifier les dépendances système"
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

# ============================================================================
# COMMANDES D'AIDE SPÉCIFIQUES
# ============================================================================

# Démarrage et arrêt
help-up: ## Aide détaillée pour la commande 'make up'
	@echo "================================================================"
	@echo "🚀 COMMANDE: make up"
	@echo "================================================================"
	@echo ""
	@echo "DESCRIPTION:"
	@echo "  Démarre UNIQUEMENT les services essentiels de JobbingTrack."
	@echo ""
	@echo "SERVICES DÉMARRÉS:"
	@echo "  • postgres        - Base de données PostgreSQL"
	@echo "  • redis          - Cache Redis"
	@echo "  • api-gateway    - API Gateway (cœur du système)"
	@echo "  • frontend       - Interface utilisateur"
	@echo "  • metrics-aggregator - Collecteur de métriques"
	@echo "  • cadvisor       - Monitoring Docker"
	@echo ""
	@echo "PORTS EXPOSÉS:"
	@echo "  • PostgreSQL: 5432"
	@echo "  • Redis: 6379"
	@echo "  • API Gateway: 3000"
	@echo "  • Frontend: 8080"
	@echo "  • cAdvisor: 8080"
	@echo ""
	@echo "EXEMPLES D'USAGE:"
	@echo "  make up                          # Démarrage standard"
	@echo "  SUPER_ADMIN_EMAIL=test@example.com make up  # Admin personnalisé"
	@echo ""
	@echo "INTERFACES DISPONIBLES:"
	@echo "  • Frontend: http://localhost:8080"
	@echo "  • API Gateway: http://localhost:3000"
	@echo "  • cAdvisor: http://localhost:8080"

help-down: ## Aide détaillée pour la commande 'make down'
	@echo "================================================================"
	@echo "🛑 COMMANDE: make down"
	@echo "================================================================"
	@echo ""
	@echo "DESCRIPTION:"
	@echo "  Arrête proprement tous les services Docker en cours d'exécution."
	@echo ""
	@echo "ACTIONS EFFECTUÉES:"
	@echo "  • Arrêt de tous les conteneurs"
	@echo "  • Suppression des réseaux temporaires"
	@echo "  • Les volumes de données sont préservés"
	@echo ""
	@echo "EXEMPLES D'USAGE:"
	@echo "  make down                        # Arrêt standard"
	@echo "  make down && make up             # Redémarrage complet"
	@echo ""
	@echo "NOTE:"
	@echo "  Utilisez 'make down-volumes' pour supprimer aussi les volumes"

help-status: ## Aide détaillée pour la commande 'make status'
	@echo "================================================================"
	@echo "📊 COMMANDE: make status"
	@echo "================================================================"
	@echo ""
	@echo "DESCRIPTION:"
	@echo "  Affiche le statut détaillé de tous les services en cours d'exécution."
	@echo ""
	@echo "INFORMATIONS AFFICHÉES:"
	@echo "  • Nom du service"
	@echo "  • État (Up/Down)"
	@echo "  • Uptime (temps de fonctionnement)"
	@echo "  • Ports exposés"
	@echo "  • Statut de santé"
	@echo ""
	@echo "FORMAT DE SORTIE:"
	@echo "  SERVICE_NAME    STATUS    UPTIME    PORTS"
	@echo ""
	@echo "EXEMPLES D'USAGE:"
	@echo "  make status                      # Statut général"
	@echo "  docker ps                        # Même information avec Docker"

help-logs: ## Aide détaillée pour la commande 'make logs'
	@echo "================================================================"
	@echo "📜 COMMANDE: make logs"
	@echo "================================================================"
	@echo ""
	@echo "DESCRIPTION:"
	@echo "  Affiche les logs en temps réel de tous les services."
	@echo ""
	@echo "FONCTIONNALITÉS:"
	@echo "  • Logs en temps réel (suivi continu)"
	@echo "  • Couleurs pour distinguer les services"
	@echo "  • Timestamps précis"
	@echo "  • Arrêt avec Ctrl+C"
	@echo ""
	@echo "EXEMPLES D'USAGE:"
	@echo "  make logs                        # Tous les logs"
	@echo "  make logs-service SERVICE=api-gateway  # Logs d'un service"
	@echo ""
	@echo "ASTUCE:"
	@echo "  Utilisez 'make logs | grep ERROR' pour filtrer les erreurs"

help-health: ## Aide détaillée pour la commande 'make health'
	@echo "================================================================"
	@echo "🔍 COMMANDE: make health"
	@echo "================================================================"
	@echo ""
	@echo "DESCRIPTION:"
	@echo "  Vérifie l'état de santé de l'intégralité du système JobbingTrack."
	@echo ""
	@echo "VÉRIFICATIONS EFFECTUÉES:"
	@echo "  • Disponibilité de Docker"
	@echo "  • État des services essentiels"
	@echo "  • Connectivité des endpoints"
	@echo "  • Accès à la base de données"
	@echo "  • État du cache Redis"
	@echo "  • Espace disque disponible"
	@echo "  • Utilisation mémoire"
	@echo ""
	@echo "CODES DE SORTIE:"
	@echo "  0 = Tout fonctionne correctement"
	@echo "  1 = Problèmes détectés (warnings)"
	@echo "  2 = Erreurs critiques détectées"
	@echo ""
	@echo "EXEMPLES D'USAGE:"
	@echo "  make health                      # Vérification standard"
	@echo "  ./scripts/core/check.sh --detailed  # Version script"

help-build: ## Aide détaillée pour la commande 'make build'
	@echo "================================================================"
	@echo "🔨 COMMANDE: make build"
	@echo "================================================================"
	@echo ""
	@echo "DESCRIPTION:"
	@echo "  Construit toutes les images Docker des services."
	@echo ""
	@echo "PROCESSUS:"
	@echo "  1. Build de chaque service individuellement"
	@echo "  2. Téléchargement des images de base"
	@echo "  3. Installation des dépendances"
	@echo "  4. Compilation du code"
	@echo "  5. Création de l'image finale"
	@echo ""
	@echo "TEMPS ESTIMÉ:"
	@echo "  • Premier build: 5-10 minutes"
	@echo "  • Builds suivants: 2-5 minutes"
	@echo ""
	@echo "EXEMPLES D'USAGE:"
	@echo "  make build                       # Build complet"
	@echo "  make rebuild                     # Rebuild forcé"
	@echo "  make rebuild-service SERVICE=frontend  # Rebuild un service"

help-test: ## Aide détaillée pour la commande 'make test'
	@echo "================================================================"
	@echo "🧪 COMMANDE: make test"
	@echo "================================================================"
	@echo ""
	@echo "DESCRIPTION:"
	@echo "  Exécute la suite complète de tests automatisés."
	@echo ""
	@echo "TYPES DE TESTS:"
	@echo "  • Tests unitaires (fonctions isolées)"
	@echo "  • Tests d'intégration (services)"
	@echo "  • Tests end-to-end (flux complets)"
	@echo "  • Tests de performance (optionnel)"
	@echo ""
	@echo "EXEMPLES D'USAGE:"
	@echo "  make test                        # Tous les tests"
	@echo "  make test-service SERVICE=auth   # Tests d'un service"
	@echo "  ./scripts/testing/run-tests.sh --auth  # Version script"

# Utilitaires
help-shell: ## Aide détaillée pour la commande 'make shell'
	@echo "================================================================"
	@echo "🐚 COMMANDE: make shell SERVICE=nom"
	@echo "================================================================"
	@echo ""
	@echo "DESCRIPTION:"
	@echo "  Ouvre un shell interactif dans un conteneur Docker spécifié."
	@echo ""
	@echo "SERVICES DISPONIBLES:"
	@echo "  • postgres       - Base de données"
	@echo "  • redis         - Cache"
	@echo "  • api-gateway   - API Gateway"
	@echo "  • frontend      - Interface utilisateur"
	@echo "  • Tous les services microservices"
	@echo ""
	@echo "EXEMPLES D'USAGE:"
	@echo "  make shell SERVICE=postgres     # Shell PostgreSQL"
	@echo "  make shell SERVICE=api-gateway  # Shell API Gateway"
	@echo ""
	@echo "COMMANDES UTILES DANS LE SHELL:"
	@echo "  • psql -U jobbingtrack -d jobbingtrack  # Connexion DB"
	@echo "  • redis-cli                             # Client Redis"
	@echo "  • npm run logs                         # Logs de l'app"

help-exec: ## Aide détaillée pour la commande 'make exec'
	@echo "================================================================"
	@echo "⚡ COMMANDE: make exec SERVICE=nom CMD='commande'"
	@echo "================================================================"
	@echo ""
	@echo "DESCRIPTION:"
	@echo "  Exécute une commande spécifique dans un conteneur Docker."
	@echo ""
	@echo "EXEMPLES D'USAGE:"
	@echo "  make exec SERVICE=postgres CMD='psql -U jobbingtrack -c \"SELECT 1;\"'"
	@echo "  make exec SERVICE=api-gateway CMD='npm install'"
	@echo "  make exec SERVICE=redis CMD='redis-cli ping'"
	@echo ""
	@echo "COMMANDES COURANTES:"
	@echo "  • Vérification DB: psql -U jobbingtrack -c 'SELECT version();'"
	@echo "  • Vérification Redis: redis-cli ping"
	@echo "  • Installation dépendances: npm install"

# Base de données
help-db-seed: ## Aide détaillée pour la commande 'make db-seed'
	@echo "================================================================"
	@echo "🌱 COMMANDE: make db-seed"
	@echo "================================================================"
	@echo ""
	@echo "DESCRIPTION:"
	@echo "  Insère des données de test dans la base de données."
	@echo ""
	@echo "DONNÉES AJOUTÉES:"
	@echo "  • Utilisateur administrateur"
	@echo "  • Entreprises d'exemple (Google, Microsoft, etc.)"
	@echo "  • Candidatures de test"
	@echo ""
	@echo "IDENTIFIANTS ADMIN:"
	@echo "  📧 Email: admin@jobbingtrack.com"
	@echo "  🔐 Mot de passe: SuperAdmin123!"
	@echo ""
	@echo "EXEMPLES D'USAGE:"
	@echo "  make db-seed                     # Seed complet"
	@echo "  ./scripts/db/seed.sh --admin-only  # Admin uniquement"

help-db-backup: ## Aide détaillée pour la commande 'make db-backup'
	@echo "================================================================"
	@echo "💾 COMMANDE: make db-backup"
	@echo "================================================================"
	@echo ""
	@echo "DESCRIPTION:"
	@echo "  Crée une sauvegarde complète de la base de données PostgreSQL."
	@echo ""
	@echo "SAUVEGARDE CRÉÉE:"
	@echo "  • Format: backup_YYYYMMDD_HHMMSS.sql"
	@echo "  • Emplacement: ./backups/"
	@echo "  • Compression: optionnelle avec --compress"
	@echo ""
	@echo "EXEMPLES D'USAGE:"
	@echo "  make db-backup                   # Sauvegarde simple"
	@echo "  ./scripts/db/backup.sh --compress  # Sauvegarde compressée"
	@echo ""
	@echo "RESTAURATION:"
	@echo "  make db-restore file=backup.sql"

# Monitoring
help-metrics: ## Aide détaillée pour la commande 'make metrics'
	@echo "================================================================"
	@echo "📈 COMMANDE: make metrics"
	@echo "================================================================"
	@echo ""
	@echo "DESCRIPTION:"
	@echo "  Ouvre l'interface web de Prometheus dans le navigateur par défaut."
	@echo ""
	@echo "URL D'ACCÈS:"
	@echo "  http://localhost:9090"
	@echo ""
	@echo "FONCTIONNALITÉS:"
	@echo "  • Requêtes de métriques personnalisées"
	@echo "  • Graphiques en temps réel"
	@echo "  • Historique des métriques"
	@echo "  • Alertes et règles"
	@echo ""
	@echo "EXEMPLES D'USAGE:"
	@echo "  make metrics                     # Ouvrir Prometheus"
	@echo "  curl http://localhost:9090/-/healthy  # Vérifier la santé"

help-cadvisor: ## Aide détaillée pour la commande 'make cadvisor'
	@echo "================================================================"
	@echo "📊 COMMANDE: make cadvisor"
	@echo "================================================================"
	@echo ""
	@echo "DESCRIPTION:"
	@echo "  Ouvre l'interface web de cAdvisor dans le navigateur par défaut."
	@echo ""
	@echo "URL D'ACCÈS:"
	@echo "  http://localhost:8080"
	@echo ""
	@echo "FONCTIONNALITÉS:"
	@echo "  • Monitoring des conteneurs Docker"
	@echo "  • Utilisation CPU/Mémoire par conteneur"
	@echo "  • Graphiques de performance"
	@echo "  • Historique des ressources"
	@echo ""
	@echo "EXEMPLES D'USAGE:"
	@echo "  make cadvisor                    # Ouvrir cAdvisor"

# Fonction générique pour l'aide des commandes
help-%:
	@if grep -q "^$*:.*##" $(MAKEFILE_LIST); then \
		sed -n "/^$*:.*##/,/^$$/p" $(MAKEFILE_LIST) | sed 's/^$*: ## //; s/^/  /'; \
	else \
		echo "❌ Aucune aide disponible pour la commande '$*'"; \
		echo ""; \
		echo "💡 Utilisez 'make help' pour voir toutes les commandes disponibles"; \
	fi

# Intégration des commandes de scripts dans le Makefile
.PHONY: install-deps create-admin-user run-tests cleanup-docker wait-for-service

# Installation des dépendances système
install-deps:
	./scripts/setup/install-dependencies.sh

# Création de l'utilisateur administrateur
create-admin-user:
	./scripts/database/create-admin-user.sh

# Exécution des tests
run-tests:
	./scripts/testing/run-tests.sh --all

# Nettoyage Docker
cleanup-docker:
	./scripts/docker/cleanup.sh

# Attente d'un service
wait-for-service:
	@if [ -z "$(SERVICE_URL)" ]; then \
		echo "❌ Spécifiez SERVICE_URL=<url>"; \
		echo "💡 Exemple: make wait-for-service SERVICE_URL=http://localhost:3000/health"; \
		exit 1; \
	fi
	./scripts/utils/wait-for-service.sh $(SERVICE_URL)

# Seed de la base de données
db-seed:
	./scripts/db/seed.sh

# Backup de la base de données
db-backup:
	./scripts/db/backup.sh

.PHONY: help help-up help-down help-status help-logs help-health help-build help-test help-shell help-exec help-db-seed help-db-backup help-metrics help-cadvisor
