# ============================================================================
# Makefile Principal - JobbingTrack
# ============================================================================
# Point d'entrée unique incluant tous les sous-Makefiles
# TOUTES les commandes des makefiles/* sont accessibles depuis la racine
# ============================================================================

# Définir variables globales
ROOT_DIR := $(shell pwd)
export ROOT_DIR

# Variables pour tous les sous-makefiles
export BACKEND_DIR := backend
export FRONTEND_DIR := frontend  
export SCRIPTS_DIR := scripts
export TESTS_DIR := tests
export MONITORING_DIR := monitoring

# ============================================================================
# INCLUDES - Tous les sous-Makefiles (ordre important!)
# ============================================================================

# 1. Fonctions communes (TOUJOURS en premier)
include makefiles/shared/common.mk

# 2. Makefiles par catégorie (ordre logique)
include makefiles/services/Makefile      # up, down, restart, profiles
include makefiles/diagnostic/Makefile    # health, diagnostics, corrections
include makefiles/database/Makefile      # db-*, environnements DB
include makefiles/compilation/Makefile   # build, rebuild, clean
include makefiles/tests/Makefile         # tous les tests
-include makefiles/tests/Makefile.mobile-tests  # tests mobile (optionnel)
include makefiles/backend/Makefile       # monitoring uniquement
include makefiles/frontend/Makefile      # frontend spécifiques
include makefiles/mobile/Makefile        # émulateur mobile (contrôleur, tests en direct)
include makefiles/utils/Makefile         # utils (metrics, cadvisor)
include makefiles/documentation/Makefile # génération PDF documentation
include makefiles/help/Makefile          # système d'aide

# ============================================================================
# ALIASES GLOBAUX
# ============================================================================

# Alias pour démarrer tous les services
start: ## Alias de up-full - Démarrer TOUS les services (sans rebuild)
	@$(MAKE) up-full

up-all: ## Alias de up-full (même chose)
	@$(MAKE) up-full

# Démarrer la stack, BDD, admin et lancer les tests (une seule commande pour le dev)
up-dev: ## up-full + db-push-all + seed-auth + tests — tout pour redémarrer et tester (ex. suivi intérim)
	@echo "🚀 up-dev : up-full → db-push-all → seed-auth → tests"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@$(MAKE) up-full
	@$(MAKE) db-push-all
	@$(MAKE) seed-auth
	@$(MAKE) tests
	@echo ""
	@echo "✅ up-dev terminé. Rapports : tests/results/<timestamp>/"
	@printf '%s\n' up-dev > "$(ROOT_DIR)/.jobbingtrack-stack-mode"

# Recréation ciblée monitoring (alias explicite) — voir makefiles/services/Makefile
restart-force-recreate-metrics: ## Recrée monitoring-c + metrics-aggregator (env compose / image)
	@$(MAKE) restart-metrics-recreate

# Rebuild complet : down + build + up-full + status (utilise docker compose build puis up, pas make dev)
fresh-start: ## Arrêt + build + démarrage complet + status (équivalent: make down && make build && make up-full && make status)
	@$(MAKE) down
	@$(MAKE) build
	@$(MAKE) up-full
	@$(MAKE) status

# ============================================================================
# BENCHMARK BACKOFFICE - Tests de performance avant/après optimisations
# ============================================================================

benchmark-backoffice-before: ## Lance le benchmark complet du backoffice AVANT optimisations
	@echo "📊 Benchmark Backoffice - AVANT optimisations"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@./scripts/benchmark-all-backoffice.sh before
	@echo ""
	@echo "✅ Benchmark 'before' terminé !"
	@echo "💡 Fichiers sauvegardés dans: tests/performance-benchmark/"

benchmark-backoffice-after: ## Lance le benchmark complet du backoffice APRÈS optimisations
	@echo "📊 Benchmark Backoffice - APRÈS optimisations"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@./scripts/benchmark-all-backoffice.sh after
	@echo ""
	@echo "✅ Benchmark 'after' terminé !"
	@echo "💡 Fichiers sauvegardés dans: tests/performance-benchmark/"

benchmark-backoffice-compare: ## Compare les résultats des benchmarks avant/après
	@echo "📊 Comparaison des benchmarks Backoffice"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@./scripts/compare-all-backoffice.sh
	@echo ""
	@echo "✅ Comparaison terminée !"

benchmark-backoffice-full: ## Lance le benchmark complet (before + after + compare)
	@echo "📊 Benchmark Backoffice Complet"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo ""
	@echo "1️⃣  Benchmark AVANT optimisations..."
	@$(MAKE) benchmark-backoffice-before
	@echo ""
	@echo "⏸️  Attendez que vous ayez appliqué les optimisations, puis :"
	@echo "   make benchmark-backoffice-after"
	@echo "   make benchmark-backoffice-compare"

# ============================================================================
# COMMANDE PAR DÉFAUT
# ============================================================================

.DEFAULT_GOAL := help

# ============================================================================
# DOCUMENTATION INLINE
# ============================================================================
#
# 🎯 OBJECTIF:
#   Centraliser l'accès à TOUTES les commandes make depuis la racine
#
# 🔧 FONCTIONNEMENT:
#   - Ce Makefile n'a AUCUNE logique métier
#   - Il inclut simplement tous les sous-makefiles
#   - Toutes les commandes deviennent accessibles directement
#
# 📝 EXEMPLES D'USAGE:
#   make monitoring-up          # Défini dans makefiles/backend/Makefile
#   make test-monitoring        # Défini dans makefiles/backend/Makefile  
#   make up                     # Défini dans makefiles/Makefile
#   make dev-frontend           # Défini dans makefiles/frontend/Makefile
#
# ⚠️ CONFLITS DE NOMS:
#   Si plusieurs makefiles définissent la même target, la dernière incluse
#   écrase les précédentes. Pour éviter ça, utilisez des préfixes.
#
# ➕ AJOUTER DES COMMANDES:
#   1. Si backend      → éditer makefiles/backend/Makefile
#   2. Si frontend     → éditer makefiles/frontend/Makefile
#   3. Si général      → éditer makefiles/Makefile
#   4. Si fonction     → éditer makefiles/shared/common.mk
#
# ============================================================================
