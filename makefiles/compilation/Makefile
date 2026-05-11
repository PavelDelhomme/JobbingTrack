# ============================================================================
# Makefile Compilation - JobbingTrack
# ============================================================================
# Build, rebuild et nettoyage des images Docker
# ============================================================================

.PHONY: build build-application-service rebuild-old clean clean-force help-compilation

# ============================================================================
# AIDE
# ============================================================================

help-compilation: ## Afficher l'aide compilation
	@echo "================================================================"
	@echo "🔨 COMPILATION - Commandes disponibles"
	@echo "================================================================"
	@echo ""
	@echo "🔨 BUILD (KIS):"
	@echo "  make build                 - Build des images (après changement code/schéma)"
	@echo "  make build-application-service - Rebuild application-service SANS CACHE (si Company.isTestData persiste)"
	@echo "  make rebuild               - Rebuild complet sans cache (si besoin)"
	@echo ""
	@echo "🧹 NETTOYAGE:"
	@echo "  make clean                 - Nettoyage complet (containers, volumes, réseaux)"
	@echo "  make clean-force           - Nettoyage d'urgence (force)"
	@echo ""
	@echo "💡 EXEMPLES:"
	@echo "  make build                 # Build normal"
	@echo "  make rebuild               # Rebuild complet (sans cache)"
	@echo "  make clean && make up-full # Nettoyage puis redémarrage"
	@echo ""
	@echo "⌚ TEMPS ESTIMÉ:"
	@echo "  Build:   ~5-10 minutes (première fois)"
	@echo "  Rebuild: ~10-15 minutes (sans cache)"
	@echo "  Clean:   ~1-2 minutes"
	@echo ""
	@echo "📖 Documentation: docs/development/makefile/README.md"
	@echo ""

# ============================================================================
# BUILD ET COMPILATION
# ============================================================================

# Build de tous les services (COMPOSE_FILES_ESSENTIAL uniquement : docker-compose.monitoring.yml
# met monitoring-c sous profil → "depends on undefined service" avec COMPOSE_FILES_FULL)
build: ## Build tous les services
	@echo "🔨 Build de tous les services..."
	$(call check_docker)
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) build)
	@echo "✅ Tous les services construits"

# Rebuild application-service SANS CACHE (obligatoire après modification du schéma Prisma Company/Application)
# À utiliser si l'erreur « column Company.isTestData does not exist » persiste après correction du schéma
build-application-service: ## Rebuild application-service sans cache (schéma Prisma à jour)
	@echo "🔨 Rebuild application-service (sans cache) pour appliquer le schéma Prisma..."
	$(call check_docker)
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) build --no-cache application-service)
	@echo "✅ application-service reconstruit. Puis: make up-full ou redémarrer le service."

# Rebuild sans cache (OBSOLÈTE - utilisez 'make rebuild' à la racine)
rebuild-old: ## Rebuild sans cache (ancienne version)
	@echo "⚠️  Cette commande est obsolète"
	@echo "💡 Utilisez 'make rebuild' à la place"
	@echo ""
	@echo "🔨 Rebuild complet sans cache..."
	$(call check_docker)
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) build --no-cache)
	@echo "✅ Rebuild terminé"

# ============================================================================
# NETTOYAGE
# ============================================================================

# Nettoyage complet (ESSENTIAL pour éviter "depends on undefined service" avec monitoring.yml)
clean: ## Nettoyage complet
	@echo "🧹 Nettoyage complet..."
	$(call docker_compose, $(COMPOSE_FILES_ESSENTIAL) down -v --remove-orphans)
	docker system prune -f
	docker network prune -f
	docker volume prune -f
	@echo "✅ Nettoyage terminé"

# Nettoyage d'urgence
clean-force: ## Nettoyage d'urgence - force la suppression de TOUT
	@echo "⚠️  NETTOYAGE D'URGENCE - SUPPRESSION COMPLÈTE"
	@echo "🗑️  Cette commande va supprimer TOUS les conteneurs, images et volumes JobbingTrack"
	@rm -f "$(ROOT_DIR)/.jobbingtrack-stack-mode"
	# Arrêter et supprimer tous les conteneurs
	@docker ps -q --filter "name=jobbingtrack-*" | xargs -r docker stop || true
	@docker ps -aq --filter "name=jobbingtrack-*" | xargs -r docker rm -f || true
	# Supprimer les images
	@docker images "jobbingtrack-*" -q | xargs -r docker rmi -f || true
	# Supprimer les volumes
	@docker volume ls --filter "name=jobbingtrack_*" -q | xargs -r docker volume rm -f || true
	# Nettoyer les réseaux
	@docker network prune -f
	# Nettoyage système
	docker system prune -a -f --volumes
	@echo "✅ Nettoyage d'urgence terminé"
	@echo "💡 Utilisez 'make up-full' pour redémarrer depuis zéro"
