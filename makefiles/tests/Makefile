# ================================================================
# 🧪 TESTS - JobbingTrack
# ================================================================
# Commandes pour lancer tous les types de tests
# ================================================================

.PHONY: tests-help tests-user-journey tests-complete tests-cleanup \
        tests-start tests-metrics tests-e2e tests-all

# ================================================================
# 📚 HELP - Aide sur les commandes de tests
# ================================================================

tests-help:
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║           🧪 COMMANDES DE TESTS DISPONIBLES           ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "🎯 TESTS PRINCIPAUX :"
	@echo "  make tests-user-journey    Tester le parcours utilisateur complet"
	@echo "  make tests-start           Démarrer l'interface de test User Journey"
	@echo "  make tests-complete        Lancer TOUS les tests (complet)"
	@echo "  make tests-e2e             Tests end-to-end Playwright"
	@echo ""
	@echo "📊 TESTS SPÉCIFIQUES :"
	@echo "  make tests-metrics         Vérifier toutes les métriques"
	@echo "  make tests-api             Tests API REST"
	@echo "  make tests-database        Tests base de données"
	@echo "  make tests-integration     Tests d'intégration"
	@echo ""
	@echo "🔧 UTILITAIRES :"
	@echo "  make tests-cleanup         Nettoyer les fichiers de tests"
	@echo "  make tests-reset           Reset complet + redémarrage tests"
	@echo ""
	@echo "📖 Plus d'infos : docs/tests/"
	@echo ""

# ================================================================
# 🎯 USER JOURNEY - Test du parcours utilisateur complet
# ================================================================

tests-user-journey:
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║     🧪 TEST USER JOURNEY - Parcours Utilisateur       ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "📋 Ce test vérifie le parcours complet :"
	@echo "   ✓ Authentification (Register/Login)"
	@echo "   ✓ Gestion Companies"
	@echo "   ✓ Gestion Applications"
	@echo "   ✓ Gestion Contacts"
	@echo "   ✓ Gestion Interviews"
	@echo "   ✓ Gestion Calls & Followups"
	@echo ""
	@bash scripts/verify-user-journey.sh

# ================================================================
# 🌐 START TESTS - Interface Web de test User Journey
# ================================================================

tests-start:
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║        🌐 DÉMARRAGE INTERFACE DE TEST                 ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "🚀 Lancement de l'interface web de test..."
	@echo ""
	@bash START_TESTS.sh

# ================================================================
# 📊 TESTS COMPLETS - Tous les tests
# ================================================================

tests-complete:
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║           📊 TESTS COMPLETS - Tous les Tests          ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@bash scripts/testing/run-complete-tests.sh

# ================================================================
# 📈 METRICS - Vérification des métriques
# ================================================================

tests-metrics:
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║        📈 VÉRIFICATION DES MÉTRIQUES                   ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@bash scripts/testing/verify-all-metrics.sh

# ================================================================
# 🎭 E2E - Tests End-to-End avec Playwright
# ================================================================

tests-e2e:
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║          🎭 TESTS E2E - Playwright                     ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "🔍 Lancement des tests Playwright..."
	@cd tests && npm run test:e2e

# ================================================================
# 🧹 CLEANUP - Nettoyage des fichiers de tests
# ================================================================

tests-cleanup:
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║           🧹 NETTOYAGE FICHIERS DE TESTS              ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@bash scripts/testing/cleanup.sh

# ================================================================
# 🔄 RESET - Reset complet + redémarrage pour tests
# ================================================================

tests-reset:
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║        🔄 RESET COMPLET + REDÉMARRAGE TESTS           ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "🛑 Arrêt de tous les services..."
	@make down
	@echo ""
	@echo "🚀 Démarrage des services pour tests..."
	@make up-for-tests
	@echo ""
	@echo "⏳ Attente initialisation (15 secondes)..."
	@sleep 15
	@echo ""
	@echo "🔧 Synchronisation base de données..."
	@docker exec jobbingtrack-auth-service npx prisma db push --accept-data-loss
	@echo ""
	@echo "👤 Création utilisateur admin..."
	@docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c \
		"INSERT INTO \"User\" (id, email, password, \"firstName\", \"lastName\", phone, role, \"isActive\", \"createdAt\", \"updatedAt\") \
		VALUES (gen_random_uuid(), 'admin@jobbingtrack.test', '\$$2a\$$10\$$IoX96wTcbU7t51e4T02MpemPhTDU/YZQkjhFMxNHV.HtH5vNL78P2', \
		'Super', 'Admin', '0600000000', 'SUPER_ADMIN', true, NOW(), NOW()) \
		ON CONFLICT (email) DO NOTHING;"
	@echo ""
	@echo "✅ Système prêt pour les tests !"
	@echo ""
	@echo "🧪 Lancer maintenant :"
	@echo "   make tests-user-journey"
	@echo ""

# ================================================================
# 🔬 TESTS SPÉCIFIQUES
# ================================================================

tests-api:
	@echo "📡 Tests API REST..."
	@cd tests && npm run test:api

tests-database:
	@echo "🗄️  Tests Base de données..."
	@cd tests && npm run test:database

tests-integration:
	@echo "🔗 Tests d'intégration..."
	@cd tests && npm run test:integration

# ================================================================
# 📊 ALL - Lancer absolument tous les tests
# ================================================================

tests-all: tests-cleanup
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║           📊 LANCEMENT DE TOUS LES TESTS              ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@make tests-user-journey
	@echo ""
	@make tests-metrics
	@echo ""
	@make tests-api
	@echo ""
	@make tests-integration
	@echo ""
	@echo "✅ Tous les tests terminés !"
	@echo ""
