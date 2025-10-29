# ============================================================================
# Makefile Compilation - JobbingTrack
# ============================================================================
# Build, rebuild et nettoyage des images Docker
# ============================================================================

.PHONY: build rebuild clean clean-force help-compilation

# ============================================================================
# AIDE
# ============================================================================

help-compilation: ## Afficher l'aide compilation
	@echo "================================================================"
	@echo "🔨 COMPILATION - Commandes disponibles"
	@echo "================================================================"
	@echo ""
	@echo "🔨 BUILD:"
	@echo "  make build                 - Build tous les services Docker"
	@echo "  make rebuild               - Rebuild sans cache (complet)"
	@echo ""
	@echo "🧹 NETTOYAGE:"
	@echo "  make clean                 - Nettoyage complet (containers, volumes, réseaux)"
	@echo "  make clean-force           - Nettoyage d'urgence (force)"
	@echo ""
	@echo "💡 EXEMPLES:"
	@echo "  make build                 # Build normal"
	@echo "  make clean && make rebuild # Nettoyage puis rebuild"
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

# Build de tous les services
build: ## Build tous les services
	@echo "🔨 Build de tous les services..."
	$(call check_docker)
	$(call docker_compose, $(COMPOSE_FILES_FULL) build)
	@echo "✅ Tous les services construits"

# Rebuild sans cache
rebuild: ## Rebuild sans cache
	@echo "🔨 Rebuild complet sans cache..."
	$(call check_docker)
	$(call docker_compose, $(COMPOSE_FILES_FULL) build --no-cache)
	@echo "✅ Rebuild terminé"

# ============================================================================
# NETTOYAGE
# ============================================================================

# Nettoyage complet
clean: ## Nettoyage complet
	@echo "🧹 Nettoyage complet..."
	$(call docker_compose, $(COMPOSE_FILES_FULL) down -v --remove-orphans)
	docker system prune -f
	docker network prune -f
	docker volume prune -f
	@echo "✅ Nettoyage terminé"

# Nettoyage d'urgence
clean-force: ## Nettoyage d'urgence - force la suppression de TOUT
	@echo "⚠️  NETTOYAGE D'URGENCE - SUPPRESSION COMPLÈTE"
	@echo "🗑️  Cette commande va supprimer TOUS les conteneurs, images et volumes JobbingTrack"
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
