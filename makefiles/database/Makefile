# ============================================================================
# Makefile Database - JobbingTrack
# ============================================================================
# Gestion des bases de données (migrations, seed, backup, restore, environnements)
# ============================================================================

.PHONY: db-migrate db-seed db-reset db-backup db-restore db-fix-role up-dev up-test up-staging up-prod up-all-dbs switch-db reset-db copy-prod-to-dev init-all-dbs help-database migrate-all migrate-restart db-push-all

# ============================================================================
# AIDE
# ============================================================================

help-database: ## Afficher l'aide base de données
	@echo "╔════════════════════════════════════════════════════════════════╗"
	@echo "║  🗄️  DATABASE - Commandes disponibles                         ║"
	@echo "╚════════════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "🔄 MIGRATIONS & DONNÉES:"
	@echo "  make db-migrate            - Appliquer migrations Prisma"
	@echo "  make db-push-all           - Synchroniser schémas Prisma (db push)"
	@echo "  make migrate-all           - Alias rapide pour db-migrate"
	@echo "  make migrate-restart       - Migrations + redémarrage services"
	@echo "  make db-seed               - Insérer données de test"
	@echo "  make db-fix-role           - Réparer rôle et DB PostgreSQL"
	@echo ""
	@echo "👤 GESTION UTILISATEUR ADMIN:"
	@echo "  make create-admin-user     - Créer l'utilisateur super admin"
	@echo "  make recreate-admin-user   - Supprimer et recréer l'admin"
	@echo ""
	@echo "🗑️  NETTOYAGE & RESET:"
	@echo "  make db-clean              - Supprimer UNIQUEMENT les volumes JobbingTrack"
	@echo "  make db-reset              - Reset COMPLET (arrêt + clean + up + migrate + admin)"
	@echo "                              ⚠️  Demande confirmation (taper 'oui')"
	@echo ""
	@echo "💾 SAUVEGARDE & RESTAURATION:"
	@echo "  make db-backup             - Créer sauvegarde"
	@echo "  make db-restore file=x.sql - Restaurer depuis fichier"
	@echo ""
	@echo "🌍 ENVIRONNEMENTS:"
	@echo "  make up-dev                - DB développement"
	@echo "  make up-test               - DB test"
	@echo "  make up-staging            - DB staging"
	@echo ""
	@echo "🔑 Identifiants Admin par défaut:"
	@echo "  📧 Email:    admin@jobbingtrack.com"
	@echo "  🔑 Password: password123"
	@echo ""
	@echo "💡 Personnalisation: Modifier les variables dans le fichier .env"

help-db: help-database ## Alias de help-database
	@echo "  make db-restore file=backup.sql    # Restaurer"
	@echo "  make up-test && make db-seed       # Test avec données"
	@echo ""
	@echo "📖 Documentation: docs/database/README.md"
	@echo ""

# ============================================================================
# MIGRATIONS ET DONNÉES
# ============================================================================

# Migrations de base de données
db-migrate: ## Appliquer les migrations Prisma sur tous les services
	@echo "📦 Application des migrations Prisma..."
	@echo ""
	@echo "🔍 Vérification de la disponibilité de PostgreSQL..."
	@docker exec jobbingtrack-postgres pg_isready -U postgres > /dev/null 2>&1 || (echo "❌ PostgreSQL n'est pas démarré. Lancez 'make up-full' d'abord." && exit 1)
	@echo "✅ PostgreSQL est disponible"
	@echo ""
	@echo "📂 Recherche des services avec Prisma..."
	@SERVICES="auth-service"; \
	MIGRATED=0; \
	SKIPPED=0; \
	for service in $$SERVICES; do \
		CONTAINER="jobbingtrack-$$service"; \
		if docker ps --format '{{.Names}}' | grep -q "^$$CONTAINER$$"; then \
			echo "  🔍 Vérification de $$service..."; \
			if docker exec $$CONTAINER test -f /app/prisma/schema.prisma 2>/dev/null; then \
				echo "  📦 Migration de $$service..."; \
				if docker exec -w /app $$CONTAINER npx prisma migrate deploy 2>&1 | grep -q "No pending migrations"; then \
					echo "  ✅ $$service - Aucune migration en attente"; \
				else \
					echo "  ✅ $$service - Migrations appliquées"; \
				fi; \
				MIGRATED=$$((MIGRATED + 1)); \
			else \
				echo "  ⏭️  $$service - Pas de Prisma (ignoré)"; \
				SKIPPED=$$((SKIPPED + 1)); \
			fi; \
		else \
			echo "  ⚠️  $$service - Conteneur non démarré (ignoré)"; \
			SKIPPED=$$((SKIPPED + 1)); \
		fi; \
		echo ""; \
	done; \
	echo "✅ Migrations terminées !"; \
	echo "   📦 Services migrés: $$MIGRATED"; \
	echo "   ⏭️  Services ignorés: $$SKIPPED"

migrate-all: ## Alias - Appliquer les migrations Prisma sur tous les services
	@$(MAKE) db-migrate

migrate-restart: ## Appliquer les migrations puis redémarrer les services actifs
	@echo "⚙️  Étape 1/2 - Migrations Prisma"
	@$(MAKE) db-migrate
	@echo ""
	@echo "🔁 Étape 2/2 - Redémarrage des services actifs"
	@$(MAKE) restart
	@echo ""
	@echo "✅ Migrations appliquées et services redémarrés !"

db-push-all: ## Synchroniser les schémas Prisma sur tous les services (prisma db push)
	@echo "🛠️  Synchronisation des schémas Prisma (db push)..."
	@echo ""
	@echo "🔍 Vérification de la disponibilité de PostgreSQL..."
	@docker exec jobbingtrack-postgres pg_isready -U postgres > /dev/null 2>&1 || (echo "❌ PostgreSQL n'est pas démarré. Lancez 'make up-full' d'abord." && exit 1)
	@echo "✅ PostgreSQL est disponible"
	@echo ""
	@echo "📦 Services avec schémas Prisma à synchroniser:"
	@echo "   - auth-service (tables principales: User, Application, Company, etc.)"
	@echo "   - application-service (tables: Application, Platform, etc.)"
	@echo "   - company-service (tables: Company, etc.)"
	@echo "   - contact-service (tables: Contact, ContactCompany, ContactApplication, etc.)"
	@echo "   - interview-service (tables: Interview, InterviewContact, etc.)"
	@echo "   - call-service (tables: Call, etc.)"
	@echo "   - followup-service (tables: FollowUp, FollowUpContact, etc.)"
	@echo "   - event-service (tables: Event, etc.)"
	@echo "   - metrics-aggregator (tables: SystemMetricsSnapshot, ContainerLog avec stream)"
	@echo "   - security-service (tables: SecurityLog, Vulnerability, etc.)"
	@echo "   - dashboard-service (tables: UserSession, DeviceInfo, UserEvent, etc.)"
	@echo ""
	@PUSHED=0; \
	SKIPPED=0; \
	SERVICES="auth-service application-service company-service contact-service interview-service call-service followup-service event-service metrics-aggregator security-service dashboard-service deployment-service workflow-service"; \
	for service in $$SERVICES; do \
		CONTAINER="jobbingtrack-$$service"; \
		if docker ps --format '{{.Names}}' | grep -q "^$$CONTAINER$$"; then \
			echo "  🔍 Vérification de $$service..."; \
			if docker exec $$CONTAINER test -f /app/prisma/schema.prisma 2>/dev/null; then \
				echo "  📦 Prisma db push sur $$service..."; \
				if docker exec -w /app $$CONTAINER npx prisma db push --accept-data-loss; then \
					echo "  ✅ $$service - Schéma synchronisé"; \
					PUSHED=$$((PUSHED + 1)); \
				else \
					echo "  ❌ $$service - Échec de prisma db push"; \
					SKIPPED=$$((SKIPPED + 1)); \
				fi; \
			else \
				echo "  ⏭️  $$service - Pas de Prisma (ignoré)"; \
				SKIPPED=$$((SKIPPED + 1)); \
			fi; \
		else \
			echo "  ⚠️  $$service - Conteneur non démarré (ignoré)"; \
			SKIPPED=$$((SKIPPED + 1)); \
		fi; \
		echo ""; \
	done; \
	echo "✅ Synchronisation terminée !"; \
	echo "   📦 Services synchronisés: $$PUSHED"; \
	echo "   ⏭️  Ignorés/erreurs: $$SKIPPED"; \
	echo ""; \
	echo "🔄 Génération des Prisma Clients..."; \
	for service in $$SERVICES; do \
		CONTAINER="jobbingtrack-$$service"; \
		if docker ps --format '{{.Names}}' | grep -q "^$$CONTAINER$$"; then \
			if docker exec $$CONTAINER test -f /app/prisma/schema.prisma 2>/dev/null; then \
				echo "  📦 Génération Prisma Client pour $$service..."; \
				docker exec -w /app $$CONTAINER npx prisma generate 2>/dev/null && echo "  ✅ $$service - Prisma Client généré" || echo "  ⚠️  $$service - Erreur génération"; \
			fi; \
		fi; \
	done

# Seed de données de test
db-seed: ## Insérer des données de test
	@echo "🌱 Insertion de données de test..."
	./scripts/db/seed.sh

# Sauvegarde de la base de données
db-backup: ## Créer une sauvegarde de la DB
	@echo "💾 Création d'une sauvegarde..."
	./scripts/db/backup.sh

# Restauration de la base de données
db-restore: ## Restaurer depuis un fichier (file=nom_du_fichier.sql)
	@if [ -z "$(file)" ]; then \
		echo "❌ Spécifiez le fichier avec file=<nom_du_fichier.sql>"; \
		echo "📋 Exemple: make db-restore file=backup_20231001.sql"; \
		exit 1; \
	fi
	@echo "📥 Restauration depuis $(file)..."
	$(call docker_compose, $(COMPOSE_FILES_FULL) exec -T postgres psql -U jobbingtrack -d jobbingtrack < $(file))
	@echo "✅ Base de données restaurée"

# Réparer rôle/DB Postgres
db-fix-role: ## Créer le rôle et la base 'jobbingtrack' si manquants
	@echo "🔧 Vérification/Création du rôle et de la DB 'jobbingtrack'..."
	@docker-compose -f docker-compose.yml exec -T postgres psql -U postgres -c "CREATE USER jobbingtrack WITH PASSWORD 'jobbingtrack123';" 2>/dev/null || echo "  Rôle jobbingtrack existe déjà"
	@docker-compose -f docker-compose.yml exec -T postgres psql -U postgres -c "CREATE DATABASE jobbingtrack OWNER jobbingtrack;" 2>/dev/null || echo "  Base jobbingtrack existe déjà"
	@docker-compose -f docker-compose.yml exec -T postgres psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE jobbingtrack TO jobbingtrack;" 2>/dev/null || true
	@echo "✅ Rôle et base de données vérifiés"

create-admin-user: ## Créer/Réinitialiser l'utilisateur super administrateur
	@echo "👤 Création de l'utilisateur super administrateur..."
	@chmod +x backend/scripts/database/create-admin-user.sh
	@./backend/scripts/database/create-admin-user.sh; \
	EXIT_CODE=$$?; \
	if [ $$EXIT_CODE -eq 0 ]; then \
		echo ""; \
		echo "✅ Utilisateur créé/vérifié !"; \
		echo "📧 Email: admin@jobbingtrack.com"; \
		echo "🔑 Password: password123"; \
	else \
		echo ""; \
		echo "⚠️  Code de sortie: $$EXIT_CODE"; \
		echo "💡 L'utilisateur peut déjà exister ou il y a eu une erreur"; \
		echo "💡 Vérifiez avec: docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c \"SELECT email FROM \\\"User\\\" WHERE email = 'admin@jobbingtrack.com';\""; \
		exit $$EXIT_CODE; \
	fi

recreate-admin-user: ## Supprimer et recréer l'utilisateur administrateur
	@echo "🔄 Recréation de l'utilisateur administrateur..."
	@docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c "DELETE FROM \"User\" WHERE email = 'admin@jobbingtrack.com';" 2>/dev/null || true
	@echo "✅ Utilisateur existant supprimé"
	@$(MAKE) create-admin-user

create-pavel-user: ## Créer l'utilisateur Pavel avec rôle SUPER_ADMIN
	@echo "👤 Création de l'utilisateur Pavel..."
	@chmod +x backend/scripts/database/create-pavel-user.sh
	@./backend/scripts/database/create-pavel-user.sh
	@echo ""
	@echo "✅ Utilisateur Pavel créé !"
	@echo "📧 Email: pavel@jobbingtrack.com"
	@echo "🔑 Password: password123"

db-clean: ## Supprimer UNIQUEMENT les volumes JobbingTrack
	@echo "🗑️  Suppression des volumes JobbingTrack..."
	@docker volume rm jobbingtrack_postgres_data 2>/dev/null && echo "  ✅ jobbingtrack_postgres_data supprimé" || echo "  ⚠️  jobbingtrack_postgres_data n'existe pas"
	@docker volume rm jobbingtrack_prometheus_data 2>/dev/null && echo "  ✅ jobbingtrack_prometheus_data supprimé" || echo "  ⚠️  jobbingtrack_prometheus_data n'existe pas"
	@docker volume rm jobbingtrack_metrics_data 2>/dev/null && echo "  ✅ jobbingtrack_metrics_data supprimé" || echo "  ⚠️  jobbingtrack_metrics_data n'existe pas"
	@docker volume rm jobbingtrack_loki_data 2>/dev/null && echo "  ✅ jobbingtrack_loki_data supprimé" || echo "  ⚠️  jobbingtrack_loki_data n'existe pas"
	@docker volume rm jobbingtrack_grafana_data 2>/dev/null && echo "  ✅ jobbingtrack_grafana_data supprimé" || echo "  ⚠️  jobbingtrack_grafana_data n'existe pas"
	@echo ""
	@echo "✅ Nettoyage terminé !"

db-reset: ## Réinitialisation complète (ATTENTION: Supprime toutes les données !)
	@echo "⚠️  ATTENTION: Cette commande va supprimer TOUTES les données !"
	@echo "   - Arrêt des services"
	@echo "   - Suppression des volumes"
	@echo "   - Redémarrage complet"
	@echo ""
	@read -p "Êtes-vous sûr ? (tapez 'oui' pour confirmer): " confirm && [ "$$confirm" = "oui" ] || (echo "❌ Annulé" && exit 1)
	@echo ""
	@echo "🛑 Arrêt des services..."
	@$(MAKE) down
	@echo ""
	@$(MAKE) db-clean
	@echo ""
	@echo "🚀 Redémarrage complet..."
	@$(MAKE) up-full
	@echo ""
	@echo "⏳ Attente du démarrage de PostgreSQL (10s)..."
	@sleep 10
	@echo ""
	@echo "📦 Application des migrations Prisma..."
	@$(MAKE) db-migrate
	@echo ""
	@echo "👤 Création de l'utilisateur administrateur..."
	@$(MAKE) create-admin-user
	@echo ""
	@echo "✅ Réinitialisation complète terminée !"
	@echo ""
	@echo "🌐 Accès:"
	@echo "  Frontend:    http://localhost:8080"
	@echo "  API Gateway: http://localhost:3000"
	@echo ""
	@echo "🔑 Identifiants Admin:"
	@echo "  Email:       admin@jobbingtrack.com"
	@echo "  Password:    password123"

# ============================================================================
# ENVIRONNEMENTS MULTIPLES
# ============================================================================

# Démarrer environnement de développement
up-dev: ## Démarrer l'environnement de développement
	@echo "🚀 Démarrage de l'environnement de développement..."
	$(call check_docker)
	$(call docker_compose, -f docker-compose.yml -f docker-compose.test.yml up -d postgres-dev redis-dev)
	@echo "✅ Environnement DEV démarré"
	@echo "📦 PostgreSQL DEV: localhost:5433"
	@echo "📦 Redis DEV: localhost:6380"

# Démarrer environnement de test
up-test: ## Démarrer l'environnement de test
	@echo "🚀 Démarrage de l'environnement de test..."
	$(call check_docker)
	$(call docker_compose, -f docker-compose.yml -f docker-compose.test.yml up -d postgres-test redis-test)
	@echo "✅ Environnement TEST démarré"
	@echo "📦 PostgreSQL TEST: localhost:5434"
	@echo "📦 Redis TEST: localhost:6381"

# Démarrer environnement de staging
up-staging: ## Démarrer l'environnement de staging
	@echo "🚀 Démarrage de l'environnement de staging..."
	$(call check_docker)
	$(call docker_compose, -f docker-compose.yml -f docker-compose.test.yml up -d postgres-staging redis-staging)
	@echo "✅ Environnement STAGING démarré"
	@echo "📦 PostgreSQL STAGING: localhost:5435"
	@echo "📦 Redis STAGING: localhost:6382"

# Démarrer environnement de production (simulation)
up-prod: ## Démarrer l'environnement de production (simulation)
	@echo "🚀 Démarrage de l'environnement de production (simulation)..."
	$(call check_docker)
	$(call docker_compose, -f docker-compose.yml -f docker-compose.test.yml up -d postgres-prod redis-prod)
	@echo "✅ Environnement PROD démarré"
	@echo "📦 PostgreSQL PROD: localhost:5436"
	@echo "📦 Redis PROD: localhost:6383"

# Démarrer tous les environnements
up-all-dbs: ## Démarrer toutes les bases de données (dev, test, staging, prod)
	@echo "🚀 Démarrage de tous les environnements de base de données..."
	$(call check_docker)
	$(call docker_compose, -f docker-compose.test.yml up -d postgres-dev redis-dev postgres-test redis-test postgres-staging redis-staging postgres-prod redis-prod)
	@echo "✅ Tous les environnements démarrés"
	@echo ""
	@echo "📦 PostgreSQL DEV: localhost:5433"
	@echo "📦 PostgreSQL TEST: localhost:5434"
	@echo "📦 PostgreSQL STAGING: localhost:5435"
	@echo "📦 PostgreSQL PROD: localhost:5436"
	@echo ""
	@echo "📦 Redis DEV: localhost:6380"
	@echo "📦 Redis TEST: localhost:6381"
	@echo "📦 Redis STAGING: localhost:6382"
	@echo "📦 Redis PROD: localhost:6383"

# ============================================================================
# GESTION DES ENVIRONNEMENTS
# ============================================================================

# Basculer vers la base de développement
switch-db: ## Basculer vers la base de données de développement
	@echo "🔄 Basculement vers la base de données de développement..."
	@echo "export DATABASE_URL=postgresql://jobbingtrack:jobbingtrack123@localhost:5433/jobbingtrack?schema=public" > /tmp/db_config.sh
	@echo "export REDIS_URL=redis://localhost:6380" >> /tmp/db_config.sh
	@echo "✅ Basculé vers DEV DB"
	@echo "💡 Sourcez le fichier: source /tmp/db_config.sh"

# Reset d'une base spécifique
reset-db: ## Reset d'une base de données (DB=dev|test|staging|prod)
	@if [ -z "$(DB)" ]; then \
		echo "❌ Spécifiez la DB avec DB=<nom>"; \
		echo ""; \
		echo "📋 Exemples:"; \
		echo "   make reset-db DB=dev"; \
		echo "   make reset-db DB=test"; \
		echo "   make reset-db DB=staging"; \
		echo "   make reset-db DB=prod"; \
		exit 1; \
	fi
	@echo "🔄 Reset de la base de données $(DB)..."
	$(call docker_compose, -f docker-compose.test.yml stop postgres-$(DB))
	$(call docker_compose, -f docker-compose.test.yml rm -f postgres-$(DB))
	docker volume rm jobbingtrack_postgres_$(DB)_data 2>/dev/null || echo "Volume non trouvé"
	$(call docker_compose, -f docker-compose.test.yml up -d postgres-$(DB))
	@echo "✅ Base de données $(DB) réinitialisée"

# Copier prod vers dev
copy-prod-to-dev: ## Copier la base de prod vers dev
	@echo "📋 Copie de PROD vers DEV..."
	$(call docker_compose, -f docker-compose.test.yml exec postgres-prod pg_dump -U jobbingtrack -d jobbingtrack_prod > /tmp/prod_dump.sql)
	$(call docker_compose, -f docker-compose.test.yml exec postgres-dev psql -U jobbingtrack -d jobbingtrack -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
	$(call docker_compose, -f docker-compose.test.yml exec -T postgres-dev psql -U jobbingtrack -d jobbingtrack < /tmp/prod_dump.sql)
	rm /tmp/prod_dump.sql
	@echo "✅ Données de PROD copiées vers DEV"

# Initialiser toutes les bases
init-all-dbs: ## Initialiser toutes les bases de données avec le schéma
	@echo "🚀 Initialisation de toutes les bases de données..."
	$(call check_docker)
	@echo "⏳ Attente que toutes les bases soient prêtes..."
	@sleep 10
	$(call docker_compose, -f docker-compose.test.yml exec postgres-dev psql -U jobbingtrack -d jobbingtrack -f /docker-entrypoint-initdb.d/init-db.sql)
	$(call docker_compose, -f docker-compose.test.yml exec postgres-test psql -U jobbingtrack -d jobbingtrack_test -f /docker-entrypoint-initdb.d/init-db.sql)
	$(call docker_compose, -f docker-compose.test.yml exec postgres-staging psql -U jobbingtrack -d jobbingtrack_staging -f /docker-entrypoint-initdb.d/init-db.sql)
	$(call docker_compose, -f docker-compose.test.yml exec postgres-prod psql -U jobbingtrack -d jobbingtrack_prod -f /docker-entrypoint-initdb.d/init-db.sql)
	@echo "✅ Toutes les bases de données initialisées"
