# ============================================================================
# Makefile Frontend - JobbingTrack
# ============================================================================
# Commandes SPÉCIFIQUES au frontend Next.js
# ============================================================================

.PHONY: dev-frontend build-frontend install-frontend type-check-frontend clean-frontend lint-frontend format-frontend frontend-help help-frontend

FRONTEND_DIR := frontend

# ============================================================================
# AIDE
# ============================================================================

help-frontend: ## Afficher l'aide frontend
	@echo "================================================================"
	@echo "🖥️  FRONTEND - Commandes disponibles"
	@echo "================================================================"
	@echo ""
	@echo "🚀 DÉVELOPPEMENT:"
	@echo "  make dev-frontend          - Démarrer serveur dev Next.js (port 3000)"
	@echo "  make build-frontend        - Build production optimisé"
	@echo "  make install-frontend      - Installer toutes les dépendances"
	@echo ""
	@echo "🔍 QUALITÉ DU CODE:"
	@echo "  make lint-frontend         - Vérifier avec ESLint"
	@echo "  make type-check-frontend   - Vérifier types TypeScript"
	@echo "  make format-frontend       - Formater avec Prettier"
	@echo "  make format-check-frontend - Vérifier formatage"
	@echo ""
	@echo "🧪 TESTS:"
	@echo "  make test-unit-frontend    - Tests unitaires Jest"
	@echo "  make test-e2e-frontend     - Tests E2E Playwright"
	@echo "  make test-all-frontend     - Tous les tests"
	@echo ""
	@echo "🧹 MAINTENANCE:"
	@echo "  make clean-frontend        - Nettoyer cache et builds"
	@echo "  make rebuild-frontend      - Rebuild complet"
	@echo "  make check-frontend        - Diagnostic frontend"
	@echo ""
	@echo "💡 EXEMPLES:"
	@echo "  make dev-frontend                    # Développement"
	@echo "  make lint-frontend && make build-frontend  # QA + Build"
	@echo ""
	@echo "📖 Documentation: docs/development/setup/README.md"
	@echo ""

# ============================================================================
# DÉVELOPPEMENT
# ============================================================================

dev-frontend: ## Serveur de développement Next.js
	@echo "🔧 Mode développement Next.js..."
	@cd $(FRONTEND_DIR) && npm run dev

build-frontend: ## Build production
	@echo "🔨 Construction production..."
	@cd $(FRONTEND_DIR) && npm run build

install-frontend: ## Installer dépendances
	@echo "📦 Installation dépendances..."
	@cd $(FRONTEND_DIR) && npm install

# ============================================================================
# QUALITÉ DU CODE
# ============================================================================

lint-frontend: ## ESLint
	@echo "🔍 ESLint frontend..."
	@cd $(FRONTEND_DIR) && npm run lint || true

type-check-frontend: ## TypeScript check
	@echo "🔍 TypeScript check..."
	@cd $(FRONTEND_DIR) && npm run type-check || true

format-frontend: ## Prettier format
	@echo "💅 Formatage Prettier..."
	@cd $(FRONTEND_DIR) && npm run format || true

format-check-frontend: ## Vérifier formatage
	@echo "🔍 Vérification formatage..."
	@cd $(FRONTEND_DIR) && npm run format:check || true

# ============================================================================
# TESTS
# ============================================================================

test-unit-frontend: ## Tests unitaires Jest
	@echo "🧪 Tests unitaires frontend..."
	@cd $(FRONTEND_DIR) && npm run test:unit || true

test-e2e-frontend: ## Tests E2E Playwright
	@echo "🎭 Tests E2E frontend..."
	@cd $(FRONTEND_DIR) && npm run test:e2e || true

test-all-frontend: ## Tous les tests
	@echo "🧪 Tous les tests frontend..."
	@cd $(FRONTEND_DIR) && npm run test:all || true

# ============================================================================
# NETTOYAGE
# ============================================================================

clean-frontend: ## Nettoyer cache et builds
	@echo "🧹 Nettoyage frontend..."
	@cd $(FRONTEND_DIR) && rm -rf .next node_modules/.cache
	@echo "✅ Nettoyé"

rebuild-frontend: clean-frontend build-frontend ## Rebuild complet

# ============================================================================
# DIAGNOSTIC
# ============================================================================

check-frontend: ## Diagnostic frontend
	@echo "🔍 Diagnostic frontend..."
	@echo ""
	@echo "📦 Dépendances:"
	@cd $(FRONTEND_DIR) && npm list --depth=0 2>/dev/null | head -20 || echo "Erreur"
	@echo ""
	@echo "✅ Diagnostic terminé"

frontend-help: ## Aide frontend
	@echo "================================================================"
	@echo "🖥️  FRONTEND - Commandes"
	@echo "================================================================"
	@echo ""
	@echo "🚀 DÉVELOPPEMENT:"
	@echo "  make dev-frontend          - Serveur dev"
	@echo "  make build-frontend        - Build prod"
	@echo "  make install-frontend      - Installer deps"
	@echo ""
	@echo "🔍 QUALITÉ:"
	@echo "  make lint-frontend         - ESLint"
	@echo "  make format-frontend       - Prettier"
	@echo ""
	@echo "🧪 TESTS:"
	@echo "  make test-unit-frontend    - Tests unitaires"
	@echo "  make test-e2e-frontend     - Tests E2E"
	@echo ""
