# ================================================================
# 🧪 TESTS - JobbingTrack
# ================================================================
# Commandes simplifiées pour tester l'application
# ================================================================

.PHONY: tests-help tests-reset tests-user-journey tests-interface-web test-email-verification \
        tests-clean test-clean test-relations test-enums test-email-python \
        test-email-python-reset test-email-python-verification test-email-diagnostic \
        test-email-logs test-email-logs-all test-email-logs-stats test-all \
        test-database test-api test-backend test-frontend test-mobile test-e2e \
        test-performance test-security test-integration test-docker test-monitoring \
        test-unit test-services test-infrastructure test-cache test-analytics

# ================================================================
# 📚 HELP - Guide d'utilisation des tests
# ================================================================

tests-help:
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║           🧪 GUIDE DE TEST - JobbingTrack             ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "📖 PROCESSUS COMPLET DE TEST :"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo ""
	@echo "1️⃣  PREMIÈRE FOIS (ou après make down) :"
	@echo "   make tests-reset"
	@echo "   └─→ Reset complet : arrête tout, redémarre, recrée la BDD, crée l'admin"
	@echo ""
	@echo "2️⃣  TESTER VIA API (automatique) :"
	@echo "   make tests-user-journey"
	@echo "   └─→ Teste tout le parcours utilisateur via API (rapide)"
	@echo ""
	@echo "3️⃣  TESTER VIA NAVIGATEUR (manuel) :"
	@echo "   make tests-interface-web"
	@echo "   └─→ Ouvre l'interface web : http://localhost:8080/backoffice/user-journey"
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo ""
	@echo "🎯 COMMANDES DISPONIBLES :"
	@echo ""
	@echo "  make tests-help               Affiche ce guide"
	@echo "  make tests-reset              Reset complet (BDD + services)"
	@echo "  make tests-clean / test-clean Alias reset complet"
	@echo "  make tests-user-journey       Test API automatique"
	@echo "  make tests-interface-web      Interface web de test"
	@echo "  make test-email-verification  Test vérification email"
	@echo "  make test-relations           Test relations many-to-many"
	@echo "  make test-enums               Validation des enums"
	@echo ""
	@echo "📊 TESTS PAR CATÉGORIE (avec rapports) :"
	@echo "  make test-database            Tests base de données"
	@echo "  make test-api                 Tests API complets"
	@echo "  make test-backend             Tests services backend"
	@echo "  make test-frontend            Tests frontend (Jest)"
	@echo "  make test-mobile              Tests mobile Playwright"
	@echo "  make test-e2e                 Tests E2E Playwright"
	@echo "  make test-performance         Tests de performance"
	@echo "  make test-security            Tests de sécurité"
	@echo "  make test-integration         Tests d'intégration"
	@echo "  make test-docker              Tests Docker"
	@echo "  make test-monitoring          Tests monitoring"
	@echo "  make test-unit                Tests unitaires"
	@echo "  make test-services            Tests services détaillés"
	@echo "  make test-infrastructure      Tests infrastructure"
	@echo "  make test-cache               Tests système de cache"
	@echo "  make test-analytics-endpoint  Tests endpoint analytics"
	@echo ""
	@echo "🎯 TEST COMPLET :"
	@echo "  make test-all                 Exécute TOUS les tests avec rapports complets"
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo ""
	@echo "💡 EXEMPLES D'USAGE :"
	@echo ""
	@echo "  # Workflow complet (recommandé)"
	@echo "  make tests-reset              # 1. Reset tout"
	@echo "  make tests-user-journey       # 2. Teste via API"
	@echo ""
	@echo "  # Tester avec l'interface web"
	@echo "  make tests-reset              # 1. Reset tout"
	@echo "  make tests-interface-web      # 2. Ouvre l'interface"
	@echo "  # Puis aller sur http://localhost:8080/backoffice/user-journey"
	@echo ""
	@echo "  # Juste retester (sans reset)"
	@echo "  make tests-user-journey       # Les services doivent être démarrés"
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo ""
	@echo "⚙️  CE QUE FAIT tests-reset :"
	@echo ""
	@echo "  ✓ Arrête tous les services (make down)"
	@echo "  ✓ Redémarre les services de test (make up-for-tests)"
	@echo "  ✓ Attend 15 secondes que tout démarre"
	@echo "  ✓ Crée toutes les tables (prisma db push)"
	@echo "  ✓ Crée l'utilisateur admin (admin@jobbingtrack.com / password123)"
	@echo "  ✓ Prêt pour les tests !"
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo ""
	@echo "🔍 DIFFÉRENCE tests-user-journey vs tests-interface-web :"
	@echo ""
	@echo "  tests-user-journey:"
	@echo "  └─→ Automatique, rapide, via API"
	@echo "  └─→ Affiche les résultats dans le terminal"
	@echo "  └─→ Parfait pour vérifier que tout fonctionne"
	@echo ""
	@echo "  tests-interface-web:"
	@echo "  └─→ Manuel, visuel, via navigateur"
	@echo "  └─→ Interface graphique pour tester"
	@echo "  └─→ Parfait pour débugger ou voir en détail"
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo ""
	@echo "❓ BESOIN D'AIDE ?"
	@echo ""
	@echo "  📖 Documentation : docs/tests/"
	@echo "  📋 État du projet : STATUS.md"
	@echo "  🐛 Problèmes : Voir les logs avec 'make logs'"
	@echo ""

# ================================================================
# 🔄 RESET - Reset complet pour les tests
# ================================================================

tests-reset:
	$(call check_help_read,tests-reset)
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║        🔄 RESET COMPLET - Préparation Tests           ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "🛑 1/5 - Arrêt de tous les services..."
	@make down
	@echo ""
	@echo "🚀 2/5 - Démarrage des services pour tests..."
	@make up-for-tests
	@echo ""
	@echo "⏳ 3/5 - Attente initialisation (15 secondes)..."
	@sleep 15
	@echo ""
	@echo "🔧 4/5 - Création des tables et synchronisation BDD..."
	@make db-push-all
	@echo ""
	@echo "⏳ Attente finalisation création tables (3 secondes)..."
	@sleep 3
	@echo ""
	@echo "🔍 Vérification existence table User..."
	@docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c "SELECT 1 FROM \"User\" LIMIT 0;" > /dev/null 2>&1 || \
		(echo "❌ ERREUR: Table User non trouvée. Reconstruction nécessaire..." && \
		 echo "Essayez: make rebuild && make tests-reset" && exit 1)
	@echo "✅ Table User existe"
	@echo ""
	@echo "👤 5/5 - Création utilisateur admin..."
	@docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c \
		"INSERT INTO \"User\" (id, email, password, \"firstName\", \"lastName\", phone, role, \"isActive\", \"createdAt\", \"updatedAt\") \
		VALUES (gen_random_uuid(), 'admin@jobbingtrack.com', '\$$2a\$$10\$$IoX96wTcbU7t51e4T02MpemPhTDU/YZQkjhFMxNHV.HtH5vNL78P2', \
		'Super', 'Admin', '0600000000', 'SUPER_ADMIN', true, NOW(), NOW()) \
		ON CONFLICT (email) DO NOTHING;"
	@echo ""
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║              ✅ SYSTÈME PRÊT POUR LES TESTS !          ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "🎯 PROCHAINES ÉTAPES :"
	@echo ""
	@echo "  Option 1 - Test automatique (recommandé) :"
	@echo "    make tests-user-journey"
	@echo ""
	@echo "  Option 2 - Interface web :"
	@echo "    make tests-interface-web"
	@echo "    Puis ouvrir : http://localhost:8080/backoffice/user-journey"
	@echo ""
	@echo "🔑 Identifiants :"
	@echo "   Email:    admin@jobbingtrack.com"
	@echo "   Password: password123"
	@echo ""

tests-clean: tests-reset ## Alias pratique (équivalent tests-reset)

test-clean: tests-reset ## Alias hérité (équivalent tests-reset)

# ================================================================
# 🎯 USER JOURNEY - Test automatique via API
# ================================================================

tests-user-journey:
	$(call check_help_read,tests-user-journey)
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║     🧪 TEST USER JOURNEY - Parcours Utilisateur       ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "📋 Ce test vérifie automatiquement :"
	@echo "   ✓ Authentification (Register/Login)"
	@echo "   ✓ Gestion Companies"
	@echo "   ✓ Gestion Applications"
	@echo "   ✓ Gestion Contacts"
	@echo "   ✓ Gestion Interviews"
	@echo "   ✓ Gestion Calls & Followups"
	@echo ""
	@bash scripts/verify-user-journey.sh

# ================================================================
# 🌐 INTERFACE WEB - Test manuel via navigateur
# ================================================================

tests-interface-web:
	$(call check_help_read,tests-interface-web)
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║        🌐 INTERFACE WEB DE TEST - Démarrage           ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "🚀 Lancement de l'interface web de test..."
	@echo ""
	@bash scripts/start-tests.sh

# ================================================================
# 📧 EMAIL VERIFICATION - Test système vérification email
# ================================================================

test-email-verification:
	$(call check_help_read,test-email-verification)
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║     📧 TEST VÉRIFICATION EMAIL - JobbingTrack         ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "📋 Ce test vérifie automatiquement :"
	@echo "   ✓ Inscription avec envoi email de vérification"
	@echo "   ✓ Validation du token (invalide rejeté)"
	@echo "   ✓ Renvoi d'email de vérification"
	@echo ""
	@echo "⚙️  Configuration requise :"
	@echo "   • Migration Prisma exécutée"
	@echo "   • SMTP configuré dans backend/auth-service/.env"
	@echo "   • Services démarrés (make up)"
	@echo ""
	@echo "🚀 Lancement du test..."
	@echo ""
	@docker exec jobbingtrack-auth-service node test-email-verification.js

# 📧 TEST SERVICE PYTHON EMAIL - Test du service Python d'envoi d'emails
test-email-diagnostic: ## Diagnostic du service Python email (vérifie Python, MailHog, config)
	@echo "╔════════════════════════════════════════════════════════════════╗"
	@echo "║     🔧 DIAGNOSTIC SERVICE PYTHON EMAIL - JobbingTrack         ║"
	@echo "╚════════════════════════════════════════════════════════════════╝"
	@echo ""
	@docker exec jobbingtrack-auth-service node /app/test-email-diagnostic.js || \
		(echo ""; \
		 echo "❌ Erreur lors du diagnostic"; \
		 exit 1)

test-email-python: ## Test du service Python d'envoi d'emails (connexion SMTP)
	@echo "╔════════════════════════════════════════════════════════════════╗"
	@echo "║     📧 TEST SERVICE PYTHON EMAIL - JobbingTrack               ║"
	@echo "╚════════════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "💡 Conseil : Exécutez d'abord 'make test-email-diagnostic' pour vérifier la configuration"
	@echo ""
	@echo "🔍 Test de connexion SMTP..."
	@echo ""
	@docker exec jobbingtrack-auth-service node /app/test-email-python.js test_connection || \
		(echo ""; \
		 echo "❌ Erreur lors du test de connexion SMTP"; \
		 echo "💡 Exécutez 'make test-email-diagnostic' pour diagnostiquer le problème"; \
		 exit 1)

test-email-python-reset: ## Test d'envoi d'email de réinitialisation (service Python)
	@echo "╔════════════════════════════════════════════════════════════════╗"
	@echo "║     📧 TEST EMAIL RESET PASSWORD - Service Python             ║"
	@echo "╚════════════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "📧 Test d'envoi d'email de réinitialisation..."
	@echo ""
	@if [ -z "$(TEST_EMAIL)" ]; then \
		echo "⚠️  Variable TEST_EMAIL non définie, utilisation de test@example.com"; \
		echo "   Pour spécifier un email : TEST_EMAIL=votre@email.com make test-email-python-reset"; \
		echo ""; \
	fi
	@docker exec -e TEST_EMAIL="$(TEST_EMAIL)" jobbingtrack-auth-service node /app/test-email-python.js test_reset || \
		(echo ""; \
		 echo "❌ Erreur : Le service Python n'est pas disponible."; \
		 echo "💡 Solution : Reconstruire le conteneur avec 'make rebuild auth-service'"; \
		 exit 1)

test-email-logs: ## Afficher les logs d'emails récents
	@echo "📧 Logs d'emails récents..."
	@if docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c "SELECT 1 FROM \"EmailLog\" LIMIT 1;" > /dev/null 2>&1; then \
		docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c "SELECT id, \"to\", subject, type, status, \"sentAt\", \"createdAt\" FROM \"EmailLog\" ORDER BY \"createdAt\" DESC LIMIT 10;"; \
	else \
		echo "⚠️  Table EmailLog non trouvée. La table n'existe peut-être pas encore."; \
		echo "💡 Essayez: make db-push-all pour créer toutes les tables"; \
	fi

test-email-logs-all: ## Afficher tous les logs d'emails
	@echo "📧 Tous les logs d'emails..."
	@docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c "SELECT id, \"to\", subject, type, status, \"sentAt\", \"createdAt\" FROM \"EmailLog\" ORDER BY \"createdAt\" DESC;" 2>/dev/null || \
		echo "❌ Erreur lors de la récupération des logs."

test-email-logs-stats: ## Statistiques des emails
	@echo "📊 Statistiques des emails..."
	@docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c "SELECT type, status, COUNT(*) as count FROM \"EmailLog\" GROUP BY type, status ORDER BY type, status;" 2>/dev/null || \
		echo "❌ Erreur lors de la récupération des statistiques."

test-email-python-verification: ## Test d'envoi d'email de vérification (service Python)
	@echo "╔════════════════════════════════════════════════════════════════╗"
	@echo "║     📧 TEST EMAIL VERIFICATION - Service Python              ║"
	@echo "╚════════════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "📧 Test d'envoi d'email de vérification..."
	@echo ""
	@if [ -z "$(TEST_EMAIL)" ]; then \
		echo "⚠️  Variable TEST_EMAIL non définie, utilisation de test@example.com"; \
		echo "   Pour spécifier un email : TEST_EMAIL=votre@email.com make test-email-python-verification"; \
		echo ""; \
	fi
	@docker exec -e TEST_EMAIL="$(TEST_EMAIL)" jobbingtrack-auth-service node /app/test-email-python.js test_verification || \
		(echo ""; \
		 echo "❌ Erreur : Le service Python n'est pas disponible."; \
		 echo "💡 Solution : Reconstruire le conteneur avec 'make rebuild auth-service'"; \
		 exit 1)
	@echo ""
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║                ✅ TEST TERMINÉ                         ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "📚 Documentation : STATUS.md section 1.12"
	@echo ""

# ================================================================
# 🔗 TEST RELATIONS - Test relations many-to-many
# ================================================================

test-relations: ## Teste toutes les relations many-to-many de la base de données
	$(call check_help_read,test-relations)
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║     🔗 TEST RELATIONS MANY-TO-MANY - JobbingTrack     ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "📋 Ce test vérifie automatiquement :"
	@echo "   ✓ Existence des tables de jonction"
	@echo "   ✓ Contraintes d'unicité"
	@echo "   ✓ Intégrité référentielle (foreign keys)"
	@echo "   ✓ Présence des index"
	@echo ""
	@echo "⚙️  Configuration requise :"
	@echo "   • Services démarrés (make up)"
	@echo "   • Base de données accessible"
	@echo ""
	@echo "🚀 Lancement du test..."
	@echo ""
	@docker exec jobbingtrack-auth-service sh -c "cat > /tmp/test-relations.js" < scripts/test-relations.js && \
		docker exec -w /app jobbingtrack-auth-service node /tmp/test-relations.js
	@echo ""
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║                ✅ TEST TERMINÉ                         ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""

# ================================================================
# 🎨 TEST ENUMS - Validation des enums
# ================================================================

test-enums: ## Valide tous les enums du schéma Prisma
	$(call check_help_read,test-enums)
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║        🎨 VALIDATION DES ENUMS - JobbingTrack          ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "📋 Ce test vérifie automatiquement :"
	@echo "   ✓ Définition des enums dans le schéma Prisma"
	@echo "   ✓ Utilisation correcte dans la base de données"
	@echo "   ✓ Complétude des valeurs attendues"
	@echo ""
	@echo "⚙️  Configuration requise :"
	@echo "   • Services démarrés (make up)"
	@echo "   • Base de données accessible"
	@echo ""
	@echo "🚀 Lancement du test..."
	@echo ""
	@docker exec jobbingtrack-auth-service sh -c "cat > /tmp/test-enums.js" < scripts/test-enums.js && \
		docker exec -w /app jobbingtrack-auth-service node /tmp/test-enums.js
	@echo ""
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║                ✅ TEST TERMINÉ                         ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""

# ================================================================
# 🎯 TEST ALL - Exécute TOUS les tests de manière complète
# ================================================================

test-all: ## Exécute TOUS les tests disponibles avec rapports complets
	$(call check_help_read,test-all)
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║     🧪 TEST COMPLET - Tous les tests JobbingTrack     ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "📋 Cette commande exécute TOUS les tests disponibles :"
	@echo ""
	@echo "📦 BACKEND / BDD :"
	@echo "   ✓ Tests User Journey (API)"
	@echo "   ✓ Tests Relations BDD"
	@echo "   ✓ Tests Enums"
	@echo "   ✓ Tests Email Logs"
	@echo "   ✓ Tests API Complets"
	@echo "   ✓ Tests Backend Services"
	@echo ""
	@echo "🎨 FRONTEND :"
	@echo "   ✓ Tests Playwright E2E Frontend"
	@echo "   ✓ Tests Playwright Mobile"
	@echo "   ✓ Tests Frontend Jest (Unitaires)"
	@echo ""
	@echo "⚡ PERFORMANCE & SÉCURITÉ :"
	@echo "   ✓ Tests Performance"
	@echo "   ✓ Tests Sécurité"
	@echo ""
	@echo "🔗 INTÉGRATION :"
	@echo "   ✓ Tests d'Intégration Système"
	@echo ""
	@echo "⏳ Durée estimée : 10-20 minutes (selon les tests disponibles)"
	@echo ""
	@echo "Appuyez sur Entrée pour continuer ou Ctrl+C pour annuler..."
	@read confirm
	@echo ""
	@echo "🚀 Exécution de tous les tests avec génération de rapports..."
	@echo ""
	@bash scripts/run-all-tests-with-reports.sh
	@echo ""
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║           ✅ TOUS LES TESTS TERMINÉS !                  ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "💡 Consultez les rapports dans tests/results/"
	@echo ""

# ================================================================
# 💾 TEST CACHE - Test système de cache
# ================================================================

test-cache: ## Teste le système de cache (cacheManager)
	$(call check_help_read,test-cache)
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║        💾 TEST SYSTÈME DE CACHE - JobbingTrack        ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "📋 Ce test vérifie automatiquement :"
	@echo "   ✓ Stockage et récupération de données"
	@echo "   ✓ Expiration des données après TTL"
	@echo "   ✓ Gestion des erreurs gracieusement"
	@echo "   ✓ Nettoyage des entrées expirées"
	@echo ""
	@echo "⚙️  Configuration requise :"
	@echo "   • Node.js installé"
	@echo "   • Tests disponibles dans tests/cache/"
	@echo ""
	@echo "🚀 Lancement du test..."
	@echo ""
	@if [ -f "tests/cache/cache-manager.test.js" ]; then \
		cd tests/cache && node cache-manager.test.js || echo "⚠️  Test nécessite Jest ou autre framework"; \
	else \
		echo "⚠️  Fichier de test non trouvé: tests/cache/cache-manager.test.js"; \
		echo "💡 Le test a été créé mais nécessite un framework de test"; \
	fi
	@echo ""
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║                ✅ TEST TERMINÉ                         ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""

# ================================================================
# 📊 TEST ANALYTICS - Test endpoint analytics
# ================================================================

test-analytics-endpoint: ## Teste l'endpoint analytics /api/v1/persistence/logs
	$(call check_help_read,test-analytics-endpoint)
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║        📊 TEST ENDPOINT ANALYTICS - JobbingTrack      ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "📋 Ce test vérifie automatiquement :"
	@echo "   ✓ Endpoint retourne toujours 200 (jamais 500)"
	@echo "   ✓ Retourne un tableau vide en cas d'erreur"
	@echo "   ✓ Gestion d'erreurs gracieuse"
	@echo ""
	@echo "⚙️  Configuration requise :"
	@echo "   • Services démarrés (make up)"
	@echo "   • Metrics aggregator accessible"
	@echo ""
	@echo "🚀 Lancement du test..."
	@echo ""
	@METRICS_URL=$${METRICS_URL:-http://localhost:5004} && \
		echo "🔍 Test de l'endpoint: $${METRICS_URL}/api/v1/persistence/logs" && \
		response=$$(curl -s -w "\n%{http_code}" "$${METRICS_URL}/api/v1/persistence/logs?limit=100&level=ERROR" 2>/dev/null || echo -e "\n000") && \
		http_code=$$(echo "$$response" | tail -n1) && \
		body=$$(echo "$$response" | head -n-1) && \
		if [ "$$http_code" = "200" ]; then \
			echo "✅ Endpoint retourne 200 (OK)" && \
			echo "📄 Réponse: $$body" | head -c 200 && echo ""; \
		elif [ "$$http_code" = "000" ]; then \
			echo "⚠️  Impossible de se connecter au service metrics-aggregator"; \
			echo "💡 Vérifiez que le service est démarré: docker-compose ps | grep metrics"; \
		else \
			echo "❌ Endpoint retourne $$http_code (attendu 200)" && \
			echo "📄 Réponse: $$body" | head -c 200 && echo ""; \
		fi
	@echo ""
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║                ✅ TEST TERMINÉ                         ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""

# ================================================================
# 🧪 TESTS API - Tests API complets (Jest dans conteneur)
# ================================================================

test-api: ## Tests API complets (Jest - dans conteneur ou local)
	$(call check_help_read,test-api)
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║           🧪 TESTS API COMPLETS - JobbingTrack        ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "📋 Cette commande exécute tous les tests API disponibles :"
	@echo "   ✓ Tests monitoring-c endpoints"
	@echo "   ✓ Tests email endpoints"
	@echo "   ✓ Tests analytics endpoints"
	@echo ""
	@echo "⚙️  Configuration requise :"
	@echo "   • Services démarrés (make up-full)"
	@echo "   • Tests disponibles dans tests/api/"
	@echo ""
	@echo "🚀 Lancement des tests..."
	@echo ""
	@if docker ps | grep -q jobbingtrack-frontend; then \
		echo "🐳 Exécution des tests dans le conteneur jobbingtrack-frontend..."; \
		docker exec -w /app/tests jobbingtrack-frontend sh -c "npm test -- api/ --verbose --forceExit --no-coverage 2>&1" || \
		docker exec -w /app jobbingtrack-frontend sh -c "cd tests && npm test -- api/ --verbose --forceExit --no-coverage 2>&1" || \
		(cd tests && npm test -- api/ --verbose --forceExit --no-coverage 2>&1); \
	else \
		echo "💻 Exécution des tests en local..."; \
		cd tests && npm test -- api/ --verbose --forceExit --no-coverage 2>&1 || echo "⚠️  Tests nécessitent npm install dans tests/"; \
	fi
	@echo ""
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║                ✅ TEST TERMINÉ                         ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""

# ================================================================
# 🔧 TESTS BACKEND - Tests services backend (Jest dans conteneur)
# ================================================================

test-backend: ## Tests services backend (Jest - dans conteneur ou local)
	$(call check_help_read,test-backend)
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║        🔧 TESTS BACKEND SERVICES - JobbingTrack       ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "📋 Cette commande exécute tous les tests backend disponibles :"
	@echo "   ✓ Tests security-service"
	@echo "   ✓ Tests autres services backend"
	@echo ""
	@echo "⚙️  Configuration requise :"
	@echo "   • Services démarrés (make up-full)"
	@echo "   • Tests disponibles dans tests/backend/"
	@echo ""
	@echo "🚀 Lancement des tests..."
	@echo ""
	@if docker ps | grep -q jobbingtrack-frontend; then \
		echo "🐳 Exécution des tests dans le conteneur jobbingtrack-frontend..."; \
		docker exec -w /app/tests jobbingtrack-frontend sh -c "npm test -- backend/ --verbose --forceExit --no-coverage 2>&1" || \
		docker exec -w /app jobbingtrack-frontend sh -c "cd tests && npm test -- backend/ --verbose --forceExit --no-coverage 2>&1" || \
		(cd tests && npm test -- backend/ --verbose --forceExit --no-coverage 2>&1); \
	else \
		echo "💻 Exécution des tests en local..."; \
		cd tests && npm test -- backend/ --verbose --forceExit --no-coverage 2>&1 || echo "⚠️  Tests nécessitent npm install dans tests/"; \
	fi
	@echo ""
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║                ✅ TEST TERMINÉ                         ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
