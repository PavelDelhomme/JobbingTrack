# ============================================================================
# Makefile Tests - JobbingTrack
# ============================================================================
# Tous les tests : unitaires, intégration, E2E, performance, sécurité
# ============================================================================

.PHONY: test test-unit test-integration test-database test-api test-backend test-e2e test-e2e-ui test-mobile test-frontend test-performance test-security test-all test-report test-quick test-backend-only test-frontend-only test-coverage test-docker-images test-docker-clean test-system-verify test-hydration test-implementation test-secure-env test-setup test-clean test-verify lint format format-check init-with-tests generate-test-data refresh-test-data enhance-tests start-test-runner full-setup help-tests

# ============================================================================
# AIDE
# ============================================================================

help-tests: ## Afficher l'aide tests
	@echo "================================================================"
	@echo "🧪 TESTS - Commandes disponibles"
	@echo "================================================================"
	@echo ""
	@echo "🧪 TESTS PRINCIPAUX:"
	@echo "  make test                  - Tous les tests (unitaires + intégration + E2E)"
	@echo "  make test-unit             - Tests unitaires uniquement"
	@echo "  make test-integration      - Tests d'intégration"
	@echo "  make test-e2e              - Tests end-to-end Playwright"
	@echo ""
	@echo "🎯 TESTS PAR COMPOSANT:"
	@echo "  make test-backend          - Tests backend (services)"
	@echo "  make test-frontend         - Tests frontend (React/Next.js)"
	@echo "  make test-database         - Tests base de données"
	@echo "  make test-api              - Tests API REST"
	@echo "  make test-mobile           - Tests applications mobiles"
	@echo ""
	@echo "🛡️ TESTS AVANCÉS:"
	@echo "  make test-security         - Tests de sécurité"
	@echo "  make test-performance      - Tests de performance"
	@echo "  make test-coverage         - Couverture de code"
	@echo ""
	@echo "📊 QUALITÉ:"
	@echo "  make lint                  - Linting (ESLint + Prettier)"
	@echo "  make format                - Formater le code"
	@echo "  make format-check          - Vérifier formatage"
	@echo ""
	@echo "⌚ TESTS RAPIDES:"
	@echo "  make test-quick            - Tests rapides (unités uniquement)"
	@echo "  make test-backend-only     - Backend uniquement"
	@echo "  make test-frontend-only    - Frontend uniquement"
	@echo ""
	@echo "💡 EXEMPLES:"
	@echo "  make test-unit && make test-integration  # Tests complets"
	@echo "  make test-coverage                       # Avec coverage"
	@echo ""
	@echo "📖 Documentation: docs/development/testing/README.md"
	@echo ""

# ============================================================================
# TESTS PRINCIPAUX
# ============================================================================

# Lancer tous les tests
test: ## Lancer tous les tests
	@echo "🧪 Exécution de tous les tests..."
	./scripts/testing/run-tests.sh --all

# Tests unitaires
test-unit: ## Tests unitaires
	@echo "🧪 Tests unitaires..."
	cd tests && npm run test:unit

# Tests d'intégration
test-integration: ## Tests d'intégration
	@echo "🧪 Tests d'intégration..."
	./scripts/testing/run-tests.sh --integration

# Tests de base de données
test-database: ## Tests de base de données
	@echo "🗄️  Tests de base de données..."
	node tests/database/test-database.js

# Tests API
test-api: ## Tests API backend
	@echo "🌐 Tests API..."
	node tests/api/test-api.js

# Tests backend
test-backend: ## Tests des services backend
	@echo "⚙️  Tests backend..."
	node tests/backend/test-services.js

# ============================================================================
# TESTS E2E
# ============================================================================

# Tests E2E
test-e2e: ## Tests E2E (Playwright)
	@echo "🎭 Tests E2E..."
	cd tests && npx playwright test

# Tests E2E avec interface
test-e2e-ui: ## Tests E2E avec interface graphique
	@echo "🎭 Tests E2E avec UI..."
	cd tests && npx playwright test --ui

# ============================================================================
# TESTS PAR PLATEFORME
# ============================================================================

# Tests mobile
test-mobile: ## Tests mobile
	@echo "📱 Tests mobile..."
	node tests/mobile/test-mobile.js

# Tests frontend
test-frontend: ## Tests frontend
	@echo "🖥️  Tests frontend..."
	cd frontend && npm run test

# ============================================================================
# TESTS SPÉCIALISÉS
# ============================================================================

# Tests de performance
test-performance: ## Tests de performance adaptatifs
	@echo "⚡ Tests de performance adaptatifs..."
	@echo "  ℹ️  Détection automatique des services disponibles"
	@echo "  ℹ️  Démarrage intelligent des services nécessaires"
	@echo "  ℹ️  Arrêt automatique des services temporaires"
	node tests/performance/test-performance.js

# Tests de sécurité
test-security: ## Tests de sécurité
	@echo "🔒 Tests de sécurité..."
	node tests/security/test-security.js

# Tests de sécurité environnement
test-secure-env: ## Tests de sécurité des variables d'environnement
	@echo "🔒 Tests de sécurité des variables d'environnement..."
	node tests/security/test-secure-env-vars.js

# ============================================================================
# TESTS COMPLETS ET RAPPORTS
# ============================================================================

# Tests complets
test-all: ## Tests complets (tous types)
	@echo "🧪 Tests complets - Suite complète..."
	node tests/run-tests.js

# Tests avec rapport
test-report: ## Tests avec génération de rapport
	@echo "📊 Tests avec rapport..."
	node tests/run-tests.js --report

# Tests rapides
test-quick: ## Tests rapides (sans E2E)
	@echo "⚡ Tests rapides..."
	node tests/run-tests.js --no-e2e

# Tests backend uniquement
test-backend-only: ## Tests backend uniquement
	@echo "⚙️  Tests backend uniquement..."
	node tests/run-tests.js --no-frontend --no-mobile --no-e2e

# Tests frontend uniquement
test-frontend-only: ## Tests frontend uniquement
	@echo "🖥️  Tests frontend uniquement..."
	node tests/run-tests.js --no-backend --no-api --no-database --no-mobile --no-e2e

# Tests avec coverage
test-coverage: ## Tests avec coverage
	@echo "📊 Tests avec coverage..."
	cd tests && npx jest --config jest.config.js --coverage

# ============================================================================
# TESTS DOCKER ET SYSTÈME
# ============================================================================

# Tests Docker images
test-docker-images: ## Tests des noms d'images Docker
	@echo "🐳 Tests des images Docker..."
	node tests/docker/test-docker-images.js

# Tests Docker clean
test-docker-clean: ## Tests de la commande make down
	@echo "🐳 Tests de make down..."
	node tests/docker/test-make-down-clean.js

# Tests système
test-system-verify: ## Vérification complète du système de test
	@echo "🔍 Vérification système..."
	node tests/system/verify-test-system.js

# ============================================================================
# TESTS D'INTÉGRATION ÉTENDUS
# ============================================================================

# Tests hydration
test-hydration: ## Tests des corrections d'hydratation
	@echo "💧 Tests d'hydratation..."
	node tests/integration/test-hydration-fixes.js

# Tests implementation
test-implementation: ## Tests de l'implémentation complète
	@echo "✅ Tests d'implémentation..."
	node tests/integration/test-implementation.js

# ============================================================================
# GESTION DE L'ENVIRONNEMENT DE TEST
# ============================================================================

# Setup des tests
test-setup: ## Configuration complète de l'environnement de test
	@echo "⚙️  Configuration de l'environnement de test..."
	node tests/setup.js

# Nettoyage des tests
test-clean: ## Nettoyage complet de l'environnement de test
	@echo "🧹 Nettoyage des tests..."
	./tests/cleanup.sh 2>/dev/null || echo "Script cleanup.sh non trouvé, nettoyage manuel..."
	rm -rf tests/reports/*
	rm -rf tests/coverage/*
	rm -rf tests/e2e/results/*
	rm -rf tests/temp/*
	rm -rf tests/node_modules/.cache
	rm -rf tests/.nyc_output
	docker-compose -f tests/docker-compose.test.yml down -v 2>/dev/null || true
	docker volume rm jobbingtrack_postgres_test_data 2>/dev/null || true
	@echo "✅ Nettoyage terminé"

# Vérification configuration
test-verify: ## Vérification de la configuration des tests
	@echo "🔍 Vérification de la configuration..."
	node tests/verify.js

# ============================================================================
# QUALITÉ DU CODE
# ============================================================================

# Linting
lint: ## Linting de tout le projet (ESLint)
	@echo "🔍 Linting du projet..."
	@echo "  Backend services..."
	@for service in backend/*/; do \
		if [ -f "$$service/package.json" ]; then \
			echo "Linting $$service..."; \
			cd "$$service" && npm run lint 2>/dev/null || echo "  ⚠️  Linting échoué pour $$service"; \
			cd - > /dev/null; \
		fi; \
	done
	@echo "  Frontend..."
	@cd frontend && npm run lint 2>/dev/null || echo "  ⚠️  Linting frontend échoué"
	@echo "  Tests..."
	@cd tests && npm run lint 2>/dev/null || echo "  ⚠️  Linting tests échoué"
	@echo "✅ Linting terminé"

# Formatage
format: ## Formatage automatique du code (Prettier)
	@echo "✨ Formatage du code..."
	@for service in backend/*/; do \
		if [ -f "$$service/package.json" ]; then \
			echo "Formatage $$service..."; \
			cd "$$service" && npm run format 2>/dev/null || echo "  ⚠️  Formatage échoué pour $$service"; \
			cd - > /dev/null; \
		fi; \
	done
	@cd frontend && npm run format 2>/dev/null || echo "  ⚠️  Formatage frontend échoué"
	@cd tests && npm run format 2>/dev/null || echo "  ⚠️  Formatage tests échoué"
	@echo "✅ Formatage terminé"

# Vérification formatage
format-check: ## Vérification du formatage (Prettier --check)
	@echo "🔍 Vérification du formatage..."
	@for service in backend/*/; do \
		if [ -f "$$service/package.json" ]; then \
			echo "Vérification formatage $$service..."; \
			cd "$$service" && npm run format:check 2>/dev/null || echo "  ⚠️  Formatage incorrect pour $$service"; \
			cd - > /dev/null; \
		fi; \
	done
	@cd frontend && npm run format:check 2>/dev/null || echo "  ⚠️  Formatage frontend incorrect"
	@cd tests && npm run format:check 2>/dev/null || echo "  ⚠️  Formatage tests incorrect"
	@echo "✅ Vérification formatage terminée"

# ============================================================================
# DONNÉES DE TEST
# ============================================================================

# Initialisation avec tests
init-with-tests: ## Initialisation complète avec génération de données de test
	@echo "🚀 Initialisation complète avec données de test..."
	./scripts/testing/init-with-test-data.sh

# Génération données de test
generate-test-data: ## Générer des données de test par défaut
	@echo "🌱 Génération de données de test..."
	node scripts/testing/generate-simple-test-data.js e2e

# Rafraîchir données de test
refresh-test-data: ## Nettoyer et régénérer les données de test
	@echo "🔄 Nettoyage et régénération des données de test..."
	node scripts/testing/generate-simple-test-data.js e2e --clean
	@echo "✅ Données de test régénérées"

# Améliorer tests
enhance-tests: ## Améliorer les tests existants
	@echo "✨ Amélioration des tests existants..."
	node scripts/testing/enhance-existing-tests.js

# ============================================================================
# SERVICES DE TEST
# ============================================================================

# Test runner service
start-test-runner: ## Démarrer le service de test runner
	@echo "🚀 Démarrage du service de test runner..."
	cd backend && node test-runner-service.js

# Setup complet
full-setup: ## Setup complet automatique avec tests
	@echo "🚀 Setup complet automatique JobbingTrack + Tests..."
	./scripts/testing/full-setup.sh
