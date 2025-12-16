# ============================================================================
# Makefile Frontend - JobbingTrack
# ============================================================================
# Commandes SPÉCIFIQUES au frontend Next.js
# ============================================================================

.PHONY: dev-frontend build-frontend install-frontend type-check-frontend clean-frontend lint-frontend format-frontend frontend-help help-frontend test-performance-frontend analyze-bundle-frontend check-memory-frontend optimize-frontend test-analytics test-analytics-validate test-analytics-complete

FRONTEND_DIR := frontend

# ============================================================================
# AIDE
# ============================================================================

test-analytics: ## Exécuter les tests de la page Analytics (dans conteneur Docker)
	@echo "🧪 Exécution des tests Analytics..."
	@if docker ps --format '{{.Names}}' | grep -q "^jobbingtrack-frontend$$"; then \
		docker exec -w /app jobbingtrack-frontend npm run test:analytics; \
	else \
		echo "❌ Le conteneur jobbingtrack-frontend n'est pas démarré."; \
		echo "💡 Lancez 'make up-full' ou 'make start' d'abord."; \
		exit 1; \
	fi

test-analytics-validate: ## Valider la page Analytics (détection automatique de problèmes)
	@echo "🔍 Validation automatique de la page Analytics..."
	@if docker ps --format '{{.Names}}' | grep -q "^jobbingtrack-frontend$$"; then \
		docker exec -w /app jobbingtrack-frontend bash scripts/validate-analytics-page.sh; \
	else \
		echo "❌ Le conteneur jobbingtrack-frontend n'est pas démarré."; \
		echo "💡 Lancez 'make up-full' ou 'make start' d'abord."; \
		exit 1; \
	fi

test-analytics-complete: ## Suite de tests complète pour Analytics
	@echo "🧪 Suite de tests complète pour Analytics..."
	@if docker ps --format '{{.Names}}' | grep -q "^jobbingtrack-frontend$$"; then \
		docker exec -w /app jobbingtrack-frontend bash scripts/test-analytics-complete.sh; \
	else \
		echo "❌ Le conteneur jobbingtrack-frontend n'est pas démarré."; \
		echo "💡 Lancez 'make up-full' ou 'make start' d'abord."; \
		exit 1; \
	fi

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
	@echo "  make test-analytics        - Tests de la page Analytics"
	@echo "  make test-analytics-validate - Validation automatique Analytics"
	@echo "  make test-analytics-complete - Suite complète Analytics"
	@echo ""
	@echo "⚡ PERFORMANCE:"
	@echo "  make test-performance-frontend - Tests de performance et mémoire"
	@echo "  make analyze-bundle-frontend   - Analyser les bundles webpack"
	@echo "  make check-memory-frontend     - Vérifier consommation mémoire"
	@echo "  make optimize-frontend         - Appliquer optimisations"
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

lint-frontend: ## ESLint (dans conteneur Docker)
	@echo "🔍 ESLint frontend..."
	@if docker ps --format '{{.Names}}' | grep -q "^jobbingtrack-frontend$$"; then \
		docker exec -w /app jobbingtrack-frontend npm run lint || true; \
	else \
		echo "⚠️  Le conteneur jobbingtrack-frontend n'est pas démarré. Exécution locale..."; \
		cd $(FRONTEND_DIR) && npm run lint || true; \
	fi

type-check-frontend: ## TypeScript check (dans conteneur Docker)
	@echo "🔍 TypeScript check..."
	@if docker ps --format '{{.Names}}' | grep -q "^jobbingtrack-frontend$$"; then \
		docker exec -w /app jobbingtrack-frontend npm run type-check || true; \
	else \
		echo "⚠️  Le conteneur jobbingtrack-frontend n'est pas démarré. Exécution locale..."; \
		cd $(FRONTEND_DIR) && npm run type-check || true; \
	fi

format-frontend: ## Prettier format (dans conteneur Docker)
	@echo "💅 Formatage Prettier..."
	@if docker ps --format '{{.Names}}' | grep -q "^jobbingtrack-frontend$$"; then \
		docker exec -w /app jobbingtrack-frontend npm run format || true; \
	else \
		echo "⚠️  Le conteneur jobbingtrack-frontend n'est pas démarré. Exécution locale..."; \
		cd $(FRONTEND_DIR) && npm run format || true; \
	fi

format-check-frontend: ## Vérifier formatage (dans conteneur Docker)
	@echo "🔍 Vérification formatage..."
	@if docker ps --format '{{.Names}}' | grep -q "^jobbingtrack-frontend$$"; then \
		docker exec -w /app jobbingtrack-frontend npm run format:check || true; \
	else \
		echo "⚠️  Le conteneur jobbingtrack-frontend n'est pas démarré. Exécution locale..."; \
		cd $(FRONTEND_DIR) && npm run format:check || true; \
	fi

# ============================================================================
# TESTS
# ============================================================================

test-unit-frontend: ## Tests unitaires Jest (dans conteneur Docker)
	@echo "🧪 Tests unitaires frontend..."
	@if docker ps --format '{{.Names}}' | grep -q "^jobbingtrack-frontend$$"; then \
		docker exec -w /app jobbingtrack-frontend npm run test:unit || true; \
	else \
		echo "⚠️  Le conteneur jobbingtrack-frontend n'est pas démarré. Exécution locale..."; \
		cd $(FRONTEND_DIR) && npm run test:unit || true; \
	fi

test-e2e-frontend: ## Tests E2E Playwright (dans conteneur Docker)
	@echo "🎭 Tests E2E frontend..."
	@if docker ps --format '{{.Names}}' | grep -q "^jobbingtrack-frontend$$"; then \
		docker exec -w /app jobbingtrack-frontend npm run test:e2e || true; \
	else \
		echo "⚠️  Le conteneur jobbingtrack-frontend n'est pas démarré. Exécution locale..."; \
		cd $(FRONTEND_DIR) && npm run test:e2e || true; \
	fi

test-all-frontend: ## Tous les tests (dans conteneur Docker)
	@echo "🧪 Tous les tests frontend..."
	@if docker ps --format '{{.Names}}' | grep -q "^jobbingtrack-frontend$$"; then \
		docker exec -w /app jobbingtrack-frontend npm run test:all || true; \
	else \
		echo "⚠️  Le conteneur jobbingtrack-frontend n'est pas démarré. Exécution locale..."; \
		cd $(FRONTEND_DIR) && npm run test:all || true; \
	fi

# ============================================================================
# PERFORMANCE
# ============================================================================

test-performance-frontend: ## Tests de performance et analyse mémoire
	@echo "🔍 Tests de performance frontend..."
	@cd $(FRONTEND_DIR) && ./scripts/performance-test.sh

analyze-bundle-frontend: ## Analyser les bundles avec webpack-bundle-analyzer
	@echo "📦 Analyse des bundles..."
	@echo "Nettoyage complet du dossier .next pour éviter les erreurs de permission..."
	@cd $(FRONTEND_DIR) && \
		if [ -d ".next" ]; then \
			echo "Suppression du dossier .next existant..."; \
			rm -rf .next 2>/dev/null || (echo "Tentative avec sudo..." && sudo rm -rf .next 2>/dev/null) || true; \
		fi && \
		echo "Vérification des permissions du répertoire frontend..."; \
		chmod -R u+w . 2>/dev/null || sudo chmod -R u+w . 2>/dev/null || true; \
		echo "Création d'un nouveau dossier .next avec les bonnes permissions..."; \
		mkdir -p .next && \
		chmod 755 .next 2>/dev/null || sudo chmod 755 .next 2>/dev/null || true; \
		echo "Build avec analyse des bundles..."; \
		ANALYZE=true npm run build || (echo "❌ Erreur lors du build. Vérifiez les permissions." && exit 1)
	@echo ""
	@if [ -d "$(FRONTEND_DIR)/.next/analyze" ]; then \
		echo "✅ Analyse terminée. Rapport disponible dans .next/analyze/"; \
		ls -lh $(FRONTEND_DIR)/.next/analyze/*.html 2>/dev/null | head -1 || echo "Fichiers d'analyse générés"; \
		echo ""; \
		echo "📊 Pour visualiser le rapport:"; \
		echo "   cd $(FRONTEND_DIR) && python3 -m http.server 8081 -d .next/analyze || echo 'Ouvrez .next/analyze/client.html dans votre navigateur'"; \
	else \
		echo "⚠️  Dossier d'analyse non trouvé, mais le build s'est terminé"; \
		echo "   Vérifiez les logs ci-dessus pour plus d'informations"; \
	fi

check-memory-frontend: ## Vérifier la consommation mémoire du frontend
	@echo "💾 Vérification mémoire frontend..."
	@echo "Recherche des processus Node.js du frontend..."
	@if pgrep -f "next dev" > /dev/null; then \
		echo "Processus Next.js trouvés:"; \
		ps aux | grep -E "next|node.*frontend" | grep -v grep | awk '{printf "  • PID %s: %s MB\n", $$2, $$6/1024}'; \
		echo ""; \
		echo "Mémoire totale:"; \
		ps aux | grep -E "next|node.*frontend" | grep -v grep | awk '{sum+=\$$6} END {printf "  • Total: %.0f MB\n", sum/1024}'; \
	else \
		echo "Aucun processus frontend trouvé (le serveur dev n'est peut-être pas démarré)"; \
	fi
	@echo ""
	@echo "Pour une analyse complète, utilisez: make test-performance-frontend"

optimize-frontend: ## Appliquer les optimisations de performance
	@echo "⚡ Optimisation du frontend..."
	@cd $(FRONTEND_DIR) && \
		echo "1. Nettoyage du cache..." && \
		npm run clean && \
		echo "2. Build optimisé..." && \
		npm run build && \
		echo "3. Analyse des bundles..." && \
		ANALYZE=true npm run build 2>&1 | tail -20 || true
	@echo "✅ Optimisation terminée"

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
	@echo "  make test-analytics        - Tests Analytics"
	@echo "  make test-analytics-validate - Validation Analytics"
	@echo ""
