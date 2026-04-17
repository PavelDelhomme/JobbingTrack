# ============================================================================
# Makefile Database - JobbingTrack
# ============================================================================
# Gestion des bases de données (migrations, seed, backup, restore, environnements)
# ============================================================================

.PHONY: db-migrate db-seed db-reset db-backup db-restore db-fix-role db-fix-isarchived db-fix-is-archived db-up-dev up-test up-staging up-prod up-all-dbs switch-db reset-db copy-prod-to-dev init-all-dbs help-database migrate-all migrate-restart db-push-all db-push-metrics db-push-auth db-push-security db-push-deployment db-init-system-metrics refresh-bdd seed-auth db-replicate-schema-to-test

# ============================================================================
# AIDE
# ============================================================================

help-database: ## Afficher l'aide base de données
	@echo "╔════════════════════════════════════════════════════════════════╗"
	@echo "║  🗄️  DATABASE - Commandes disponibles                         ║"
	@echo "╚════════════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "🔄 MIGRATIONS & DONNÉES:"
	@echo "  make refresh-bdd           - Tout en un : build → down → up-full → db-push-all (puis lancer tests API)"
	@echo "  make db-migrate             - Appliquer migrations Prisma"
	@echo "  make db-push-all            - Synchroniser schémas Prisma (db push)"
	@echo "  make db-push-auth           - Créer tables auth (User, etc.) si erreur 'User does not exist'"
	@echo "  make seed-auth             - Créer/mettre à jour l'admin avec email vérifié (après db-push-all, pour pouvoir se connecter)"
	@echo "  make db-push-metrics       - Prisma db push pour metrics-aggregator uniquement"
	@echo "  make db-init-system-metrics - Créer system_metrics/container_metrics (monitoring-c) si absentes"
	@echo "  make db-push-security      - Créer tables security (security_logs, firewall_rules, etc.)"
	@echo "  make db-push-deployment    - Créer tables deployment (deployments)"
	@echo "  make migrate-all           - Alias rapide pour db-migrate"
	@echo "  make migrate-restart       - Migrations + redémarrage services"
	@echo "  make db-seed               - Insérer données de test"
	@echo "  make db-fix-role           - Réparer rôle et DB PostgreSQL"
	@echo "  make db-fix-isarchived     - Ajouter colonne Application.isArchived (fix tests API sans rebuild)"
	@echo ""
	@echo "👤 GESTION UTILISATEUR ADMIN:"
	@echo "  make create-admin-user     - Créer l'utilisateur super admin"
	@echo "  make recreate-admin-user   - Supprimer et recréer l'admin"
	@echo ""
	@echo "🗑️  NETTOYAGE & RESET:"
	@echo "  make db-clean              - Supprimer UNIQUEMENT les volumes JobbingTrack"
	@echo "  make db-clean-metrics      - Nettoyer toutes les métriques (system_metrics, container_metrics, container_logs)"
	@echo "  make db-reset              - Reset COMPLET (arrêt + clean + up + migrate + admin)"
	@echo "                              ⚠️  Demande confirmation (taper 'oui')"
	@echo ""
	@echo "💾 SAUVEGARDE & RESTAURATION:"
	@echo "  make db-backup             - Créer sauvegarde"
	@echo "  make db-restore file=x.sql - Restaurer depuis fichier"
	@echo ""
	@echo "🌍 ENVIRONNEMENTS:"
	@echo "  make db-up-dev             - PostgreSQL/Redis DEV seuls (compose test) — pas confondre avec make up-dev (racine : stack + push + tests)"
	@echo "  make up-test               - DB test"
	@echo "  make up-staging            - DB staging"
	@echo "  make db-replicate-schema-to-test - Copier le schéma (sans données) de la base principale vers la base de test"
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
	@docker exec jobbingtrack-postgres pg_isready -U jobbingtrack > /dev/null 2>&1 || (echo "❌ PostgreSQL n'est pas démarré. Lancez 'make up-full' d'abord." && exit 1)
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
	@echo "📦 db-push-all : Prisma db push (9 services) + init-system-metrics + init-key-tables"
	@echo "   Services poussés : auth, application, company, contact, interview, call, followup, event, workflow"
	@echo "   Tables security/deployment/metrics : via schéma auth ou init-key-tables (pas de push séparé)"
	@echo ""
	@ROOT_DIR="$(ROOT_DIR)" bash "$(ROOT_DIR)/scripts/db/db-push-all.sh"

# Une seule commande : build → down → up-full → db-push-all (pour tout mettre à jour BDD et pouvoir lancer les tests)
# up-full exécute db-push-all en interne (1x auth seul, 1x tous les services) ; étape 4 = sync final (pas une boucle).
refresh-bdd: ## Tout mettre à jour : build, arrêt, redémarrage, db-push-all (puis lancer les tests API depuis le backoffice)
	@echo "🔄 refresh-bdd : build → down → up-full → db-push-all"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "1️⃣  Build des images..."
	@$(MAKE) build
	@echo ""
	@echo "2️⃣  Arrêt des services..."
	@$(MAKE) down
	@echo ""
	@echo "3️⃣  Démarrage complet (up-full)..."
	@$(MAKE) up-full
	@echo ""
	@echo "4️⃣  Synchronisation BDD (db-push-all + seed statuts)..."
	@$(MAKE) db-push-all
	@echo ""
	@echo "✅ refresh-bdd terminé. Vous pouvez lancer les Tests API depuis le backoffice."

# Créer les tables system_metrics et container_metrics (monitoring-c) si absentes
db-init-system-metrics: ## Créer system_metrics + container_metrics pour monitoring-c
	@docker exec jobbingtrack-postgres pg_isready -U jobbingtrack > /dev/null 2>&1 || (echo "❌ PostgreSQL n'est pas démarré." && exit 1)
	@docker exec -i jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -f - < "$(ROOT_DIR)/scripts/db/init-system-metrics.sql" && echo "✅ Tables system_metrics / container_metrics créées ou déjà présentes"

# Ajouter colonne Application.isArchived (générée depuis archived) pour compatibilité client Prisma sans rebuild
db-fix-isarchived: ## Fix colonne isArchived (évite erreur "column Application.isArchived does not exist" et 404 Candidature non trouvée)
	@docker exec jobbingtrack-postgres pg_isready -U jobbingtrack > /dev/null 2>&1 || (echo "❌ PostgreSQL n'est pas démarré. Lancez 'make up-full'." && exit 1)
	@docker exec -i jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -f - < "$(ROOT_DIR)/scripts/db/fix-application-isarchived.sql" && echo "✅ Application.isArchived appliqué (relancez les tests API)"

# Alias pour la même cible (nom avec tiret)
db-fix-is-archived: db-fix-isarchived

# Créer les tables auth (User, etc.) – à utiliser si erreur "The table public.User does not exist"
# Utilise le conteneur auth-service si démarré, sinon Prisma local avec DATABASE_URL du .env
db-push-auth: ## Prisma db push pour auth-service (tables User, Application, etc.)
	@echo "📦 Prisma db push - auth-service (tables User, etc.)"
	@docker exec jobbingtrack-postgres pg_isready -U jobbingtrack > /dev/null 2>&1 || (echo "❌ PostgreSQL n'est pas démarré. Lancez 'make up-full' ou démarrez postgres." && exit 1)
	@if docker ps --format '{{.Names}}' | grep -q '^jobbingtrack-auth-service$$'; then \
		echo "  Via conteneur auth-service..."; \
		docker exec -w /app jobbingtrack-auth-service npx prisma db push --accept-data-loss 2>&1 | head -15; \
		echo "✅ auth-service : schéma synchronisé (conteneur)"; \
	else \
		echo "  Via backend/auth-service (DATABASE_URL depuis .env)..."; \
		if [ -f "$(ROOT_DIR)/.env" ]; then set -a && . "$(ROOT_DIR)/.env" && set +a; fi; \
		export DATABASE_URL="$${DATABASE_URL:-postgresql://jobbingtrack:jobbingtrack123@localhost:5432/jobbingtrack?schema=public}"; \
		cd backend/auth-service && (npm install 2>/dev/null || true) && npx prisma db push --accept-data-loss 2>&1 | head -15 && cd ../.. && echo "✅ auth-service : schéma synchronisé (local)"; \
	fi

# Créer/mettre à jour l'utilisateur admin avec emailVerified=true (nécessaire pour se connecter après up-full)
# À lancer après make db-push-all si vous avez « Veuillez vérifier votre email avant de vous connecter »
seed-auth: ## Créer ou mettre à jour l'admin (emailVerified=true) pour pouvoir se connecter au backoffice
	@echo "🌱 Seed auth : création/mise à jour de l'utilisateur admin (emailVerified=true)..."
	@docker exec jobbingtrack-postgres pg_isready -U jobbingtrack > /dev/null 2>&1 || (echo "❌ PostgreSQL n'est pas démarré. Lancez 'make up-full'." && exit 1)
	@if docker ps --format '{{.Names}}' | grep -q '^jobbingtrack-auth-service$$'; then \
		docker exec -e ADMIN_EMAIL=$${ADMIN_EMAIL:-admin@jobbingtrack.com} -e ADMIN_PASSWORD=$${ADMIN_PASSWORD:-password123} jobbingtrack-auth-service npx prisma db seed 2>&1 && echo "✅ Admin prêt (admin@jobbingtrack.com / password123). Vous pouvez vous connecter." || \
		(echo "⚠️  Seed auth échoué. Vérifiez que backend/auth-service/package.json contient \"prisma\":{\"seed\":\"node prisma/seed.js\"}."; exit 1); \
	else \
		echo "⚠️  Conteneur jobbingtrack-auth-service non démarré. Lancez 'make up-full' (profil full) puis réessayez."; \
		exit 1; \
	fi

# Créer les tables security-service (security_logs, firewall_rules, network_connections, etc.)
db-push-security: ## Prisma db push pour security-service
	@echo "📦 Prisma db push - security-service (security_logs, firewall_rules, network_connections, network_threats, etc.)"
	@docker exec jobbingtrack-postgres pg_isready -U jobbingtrack > /dev/null 2>&1 || (echo "❌ PostgreSQL n'est pas démarré." && exit 1)
	@if docker ps --format '{{.Names}}' | grep -q '^jobbingtrack-security-service$$'; then \
		docker exec -w /app jobbingtrack-security-service npx prisma db push --accept-data-loss 2>&1 | head -25; \
		echo "✅ security-service : schéma synchronisé"; \
	else \
		echo "⚠️  Conteneur jobbingtrack-security-service non démarré. Lancez 'make up' puis réessayez."; \
		exit 1; \
	fi

# Créer les tables deployment-service (deployments)
db-push-deployment: ## Prisma db push pour deployment-service
	@echo "📦 Prisma db push - deployment-service (deployments)"
	@docker exec jobbingtrack-postgres pg_isready -U jobbingtrack > /dev/null 2>&1 || (echo "❌ PostgreSQL n'est pas démarré." && exit 1)
	@if docker ps --format '{{.Names}}' | grep -q '^jobbingtrack-deployment-service$$'; then \
		docker exec -w /app jobbingtrack-deployment-service npx prisma db push --accept-data-loss 2>&1 | head -25; \
		echo "✅ deployment-service : schéma synchronisé"; \
	else \
		echo "⚠️  Conteneur jobbingtrack-deployment-service non démarré. Lancez 'make up' puis réessayez."; \
		exit 1; \
	fi

# Synchroniser uniquement le schéma Prisma du metrics-aggregator (même DB que le conteneur)
# Préfère l'exécution dans le conteneur jobbingtrack-metrics-aggregator s'il est démarré
db-push-metrics: ## Prisma db push pour metrics-aggregator uniquement
	@echo "📦 Prisma db push - metrics-aggregator"
	@docker exec jobbingtrack-postgres pg_isready -U jobbingtrack > /dev/null 2>&1 || (echo "❌ PostgreSQL n'est pas démarré. Lancez 'make up-full' ou 'docker compose up -d postgres'." && exit 1)
	@if docker ps --format '{{.Names}}' | grep -q '^jobbingtrack-metrics-aggregator$$'; then \
		echo "  Via conteneur jobbingtrack-metrics-aggregator (même DB)..."; \
		docker exec -w /app jobbingtrack-metrics-aggregator npx prisma db push --accept-data-loss 2>&1 | head -20; \
		echo "✅ metrics-aggregator : schéma synchronisé (conteneur)"; \
	elif [ -f "backend/metrics-aggregator-service/prisma/schema.prisma" ]; then \
		echo "  Via local (DATABASE_URL depuis .env, utilisez le même port que Postgres, ex: POSTGRES_PORT=5000)"; \
		if [ -f "$(ROOT_DIR)/.env" ]; then set -a && . "$(ROOT_DIR)/.env" && set +a; fi; \
		export DATABASE_URL="$${DATABASE_URL:-postgresql://jobbingtrack:jobbingtrack123@localhost:5432/jobbingtrack?schema=public}"; \
		cd backend/metrics-aggregator-service && (npm install 2>/dev/null || true) && npx prisma db push --accept-data-loss 2>&1 | head -20 && cd ../.. && echo "✅ metrics-aggregator : schéma synchronisé (local)"; \
	else \
		echo "❌ backend/metrics-aggregator-service/prisma/schema.prisma introuvable"; exit 1; \
	fi

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

# Réparer rôle/DB Postgres (idempotent pour éviter erreurs dans les logs)
# CREATE USER : dans un DO avec EXCEPTION WHEN duplicate_object (possible en transaction).
# CREATE DATABASE : ne peut pas s'exécuter dans un bloc DO (PostgreSQL interdit CREATE DATABASE dans une transaction).
# Donc on vérifie d'abord si la base existe (SELECT) et on ne crée que si elle n'existe pas.
db-fix-role: ## Créer le rôle et la base 'jobbingtrack' si manquants
	@echo "🔧 Vérification/Création du rôle et de la DB 'jobbingtrack'..."
	@docker-compose -f docker-compose.yml exec -T postgres psql -U jobbingtrack -d jobbingtrack -c 'DO $$$$ BEGIN CREATE USER jobbingtrack WITH PASSWORD '\''jobbingtrack123'\''; EXCEPTION WHEN duplicate_object THEN NULL; END $$$$;'
	@docker-compose -f docker-compose.yml exec -T postgres psql -U jobbingtrack -d postgres -t -A -c "SELECT 1 FROM pg_database WHERE datname = 'jobbingtrack';" 2>/dev/null | grep -q 1 || \
		docker-compose -f docker-compose.yml exec -T postgres psql -U jobbingtrack -d postgres -c "CREATE DATABASE jobbingtrack OWNER jobbingtrack;"
	@docker-compose -f docker-compose.yml exec -T postgres psql -U jobbingtrack -d jobbingtrack -c "GRANT ALL PRIVILEGES ON DATABASE jobbingtrack TO jobbingtrack;" 2>/dev/null || true
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
	@docker volume rm jobbingtrack_metrics_data 2>/dev/null && echo "  ✅ jobbingtrack_metrics_data supprimé" || echo "  ⚠️  jobbingtrack_metrics_data n'existe pas"
	@echo ""
	@echo "✅ Nettoyage terminé !"

db-clean-metrics: ## Nettoyer toutes les métriques enregistrées (system_metrics, container_metrics, container_logs)
	@echo "🧹 Nettoyage de toutes les métriques dans PostgreSQL..."
	@./scripts/db/clean-metrics.sh
	@echo ""
	@echo "✅ Toutes les métriques ont été supprimées de la base de données"
	@echo ""
	@echo "⚠️  IMPORTANT : Vous devez aussi nettoyer le cache du navigateur !"
	@echo ""
	@echo "📋 Instructions :"
	@echo "   1. Ouvrez la console développeur (F12)"
	@echo "   2. Exécutez cette commande :"
	@echo "      sessionStorage.setItem('force_clear_analytics_cache', 'true'); location.reload();"
	@echo ""
	@echo "   OU supprimez manuellement les clés sessionStorage commençant par 'analytics_history_'"
	@echo ""

db-clean-all-metrics: ## Nettoyer TOUT : PostgreSQL + instructions pour le cache frontend
	@./scripts/db/clean-all-metrics.sh

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

# Démarrer PostgreSQL/Redis de dev (fichiers compose test) — la cible racine **up-dev** reste réservée au tout-en-un stack + BDD + tests.
db-up-dev: ## Démarrer postgres-dev + redis-dev (ports 5433 / 6380)
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

# Répliquer le schéma de la base principale vers la base de test (sans les données)
# Prérequis: make up-full (postgres) et make up-test (postgres-test)
db-replicate-schema-to-test: ## Copier le schéma (sans données) de la base principale vers la base de test
	@echo "📋 Réplication du schéma principal → base de test..."
	@ROOT_DIR="$(ROOT_DIR)" bash "$(ROOT_DIR)/scripts/db/replicate-schema-to-test.sh"
