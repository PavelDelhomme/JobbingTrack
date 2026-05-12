# ================================================================
# 🧪 TESTS - JobbingTrack
# ================================================================
# Commandes simplifiées pour tester l'application
# ================================================================

# make test / test-all : lancement direct (pas de message d'aide ni attente 3 s)
ifneq (,$(filter test test-all tests,$(MAKECMDGOALS)))
  export TEST_NOPROMPT := 1
endif

.PHONY: tests-help tests-reset tests-user-journey tests-interface-web test-email-verification \
        tests-clean test-clean test tests test-relations test-enums test-email-python \
        test-email-python-reset test-email-python-verification test-email-diagnostic \
        test-email-logs test-email-logs-all test-email-logs-stats test-all test-full \
        test-full-quick test-full-cached test-full-timed up-full-timed \
        test-database test-api test-backend test-frontend test-mobile test-e2e \
        test-performance test-security test-cve-scan test-integration test-docker test-monitoring \
        test-unit test-services test-infrastructure test-cache test-analytics \
        test-suite-quick test-suite-quick-nocontroller test-suite-full

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
	@echo "  make test-frontend            Tests frontend (Jest : unit + analytics + date-metrics-display / fuseaux)"
	@echo "  make test-mobile              Tests mobile Playwright"
	@echo "  make test-e2e                 Tests E2E Playwright"
	@echo "  make test-performance         Tests de performance"
	@echo "  make test-security            Tests de sécurité"
	@echo "  make test-cve-scan            Scan CVE dépendances Node/Rust (+ Docker si CVE_SCAN_DOCKER=1)"
	@echo "  make test-integration         Tests d'intégration"
	@echo "  make test-docker              Tests Docker"
	@echo "  make test-monitoring          Tests monitoring"
	@echo "  make test-unit                Tests unitaires"
	@echo "  make test-services            Tests services détaillés"
	@echo "  make test-infrastructure      Tests infrastructure"
	@echo "  make test-cache               Tests système de cache"
	@echo "  make test-analytics-endpoint  Tests endpoint analytics"
	@echo "  make test-emulator-controller Test contrôleur émulateur (port 5055 ; lancer make emulator-controller avant)"
	@echo "  make test-suite-quick         Suite rapide : contrôleur + frontend + BDD + status (sans interaction)"
	@echo "  make test-suite-full          Suite complète : frontend + BDD + status + test-all (sans logs, sans attente)"
	@echo ""
	@echo "🎯 TEST COMPLET :"
	@echo "  make test-all                 Exécute TOUS les tests avec rapports complets (dont Jest api-gateway **dans le conteneur** si jobbingtrack-api-gateway est up)"
	@echo "  make test-full                Rebuild (--no-cache, lourd) + up + db + seed + test-all"
	@echo "  make test-full-quick          ⚡ SANS rebuild : up-full + db + seed + test-all (léger)"
	@echo "  make test-full-cached         Build avec cache + up + db + seed + test-all (compromis)"
	@echo "  make test-full-timed          test-full avec mesure de durée (début/fin + time)"
	@echo "  make up-full-timed            up-full avec mesure de durée"
	@echo "  ./scripts/ops/timed-make.sh TARGET [--verbose]  Mesure temps (+ mémoire si -v)"
	@echo ""
	@echo "💡 make logs-applicative suit les logs (ne termine jamais) → à lancer dans un autre terminal."
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
	@echo "👤 5/5 - Création/mise à jour utilisateur admin (emailVerified=true)..."
	@docker exec -e ADMIN_EMAIL=$${ADMIN_EMAIL:-admin@jobbingtrack.com} -e ADMIN_PASSWORD=$${ADMIN_PASSWORD:-password123} jobbingtrack-auth-service npx prisma db seed 2>/dev/null && \
		echo "✅ Admin créé ou mis à jour (seed auth)." || \
		(echo "⚠️  Seed auth non exécuté, fallback INSERT SQL..."; \
		 docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c \
			"INSERT INTO \"User\" (id, email, password, \"firstName\", \"lastName\", phone, role, \"isActive\", \"emailVerified\", \"emailVerifiedAt\", \"createdAt\", \"updatedAt\") \
			VALUES (gen_random_uuid(), 'admin@jobbingtrack.com', '\$$2a\$$10\$$IoX96wTcbU7t51e4T02MpemPhTDU/YZQkjhFMxNHV.HtH5vNL78P2', \
			'Super', 'Admin', '0600000000', 'SUPER_ADMIN', true, true, NOW(), NOW(), NOW()) \
			ON CONFLICT (email) DO UPDATE SET \"emailVerified\"=true, \"emailVerifiedAt\"=NOW(), \"updatedAt\"=NOW();")
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
# ⚡ SUITE RAPIDE - Émulateur + frontend + BDD + status (sans interaction)
# ================================================================
# Lance le contrôleur en arrière-plan si besoin, puis enchaîne les tests.
# Pour tout lancer sans interaction : make test-suite-quick
# Sans démarrer le contrôleur : make test-suite-quick-nocontroller
# ================================================================

test-suite-quick: ## Suite rapide : démarre le contrôleur si besoin, test émulateur + frontend + BDD + status
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║     ⚡ SUITE RAPIDE - Émulateur + Frontend + BDD       ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@_port=0; command -v lsof >/dev/null 2>&1 && lsof -ti :5055 >/dev/null 2>&1 && _port=1; command -v ss >/dev/null 2>&1 && ss -ltn 2>/dev/null | grep -q ':5055 ' && _port=1; \
	if [ "$$_port" = "0" ]; then \
		echo "📱 Démarrage du contrôleur émulateur en arrière-plan..."; \
		$(MAKE) -s emulator-controller-bg 2>/dev/null || true; \
		sleep 2; \
	else \
		echo "📱 Contrôleur déjà sur le port 5055."; \
	fi
	@echo ""
	@echo "1/4 Test contrôleur émulateur..."
	@$(MAKE) -s test-emulator-controller 2>/dev/null || echo "⚠️  test-emulator-controller ignoré (contrôleur absent ou ancienne version)."
	@echo ""
	@echo "2/4 Tests unitaires frontend..."
	@$(MAKE) -s test-unit-frontend
	@echo ""
	@echo "3/4 Tests BDD..."
	@$(MAKE) -s test-database
	@echo ""
	@echo "4/4 Status..."
	@$(MAKE) -s status
	@echo ""
	@echo "✅ Suite rapide terminée."

test-suite-quick-nocontroller: ## Suite rapide sans démarrer le contrôleur (frontend + BDD + status)
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║     ⚡ SUITE RAPIDE (sans contrôleur)                 ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@$(MAKE) -s test-unit-frontend
	@$(MAKE) -s test-database
	@$(MAKE) -s status
	@echo "✅ Suite rapide (sans contrôleur) terminée."

# Suite complète : frontend + BDD + status + test-all (sans logs ni attente Entrée)
# test-all = script run-all-tests-with-reports.sh (User Journey, Enums, Email Logs, API, Playwright E2E, Playwright MailHog, etc.)
# À lancer dans un terminal ; pour voir les logs en direct, ouvrir un 2e terminal : make logs-applicative
test-suite-full: ## Suite complète : test-frontend + test-database + status + test-all (incl. Playwright, MailHog)
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║     🧪 SUITE COMPLÈTE - tests + test-all               ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo "💡 Logs en direct : dans un autre terminal : make logs-applicative"
	@echo "📋 Ordre : test-frontend → test-database → status → test-all (tous les tests, dont Playwright E2E et MailHog) ; test-frontend inclut **date-metrics-display** (affichage métriques / dates)"
	@echo ""
	@TEST_NOPROMPT=1 $(MAKE) -s test-frontend && \
	 TEST_NOPROMPT=1 $(MAKE) -s test-database && \
	 TEST_NOPROMPT=1 $(MAKE) -s status && \
	 TEST_NOPROMPT=1 $(MAKE) -s test-all
	@echo ""
	@echo "✅ Suite complète terminée."

# ================================================================
# 🎯 TEST ALL - Exécute TOUS les tests de manière complète
# ================================================================

test: test-all ## Alias : make test = make test-all (suite complète avec progression en direct)

tests: test-all ## Alias : make tests = make test-all (suite complète)

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
	@echo "   ✓ Tests API Complets (archivage, cascade statuts, auto-events)"
	@echo "   ✓ Tests Backend Services"
	@echo ""
	@echo "🎨 FRONTEND :"
	@echo "   ✓ Tests Playwright E2E Frontend"
	@echo "   ✓ Tests Playwright Emails (MailHog)"
	@echo "   ✓ Tests Playwright Mobile"
	@echo "   ✓ Tests Frontend Jest (unit + smoke /backoffice/analytics + **date-metrics-display** — npm run test:unit-and-analytics)"
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
	@TEST_NOPROMPT=1; \
	if [ -n "$${TEST_NOPROMPT}" ] || [ -n "$${CI}" ] || ! [ -t 0 ]; then \
		echo "🚀 Lancement automatique (pas d'attente Entrée)."; \
	else \
		echo "Appuyez sur Entrée pour continuer ou Ctrl+C pour annuler..."; \
		read confirm; \
	fi
	@echo ""
	@echo "🚀 Exécution de tous les tests avec génération de rapports..."
	@echo ""
	@( cd "$(ROOT_DIR)" && bash scripts/run-all-tests-with-reports.sh )
	@echo ""
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║           ✅ TOUS LES TESTS TERMINÉS !                  ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "💡 Consultez les rapports dans tests/results/"
	@echo ""

# ================================================================
# 🚀 TEST FULL - Rebuild + stack + BDD + status + tous les tests (une commande)
# ================================================================
# test-full       = rebuild (--no-cache, très lourd) + up + db + seed + tests
# test-full-quick = PAS de rebuild : up-full + db + seed + tests (léger si images déjà présentes)
# test-full-cached= build-full (avec cache) + up + db + seed + tests (compromis après changement de code)
# test-full-timed = test-full avec mesure de durée (début/fin + time)
# ================================================================

# Étapes communes 2→6 (sans rebuild) — utilisées par test-full-quick et test-full-cached
define test_full_steps
	@echo "2/5 Démarrage de la stack (make up-full)..."
	@$(MAKE) up-full
	@echo ""
	@echo "3/5 Synchronisation BDD (make db-push-all)..."
	@$(MAKE) db-push-all
	@echo ""
	@echo "3b/5 Seed auth (admin emailVerified pour les tests)..."
	@docker exec -e ADMIN_EMAIL=$${ADMIN_EMAIL:-admin@jobbingtrack.com} -e ADMIN_PASSWORD=$${ADMIN_PASSWORD:-password123} jobbingtrack-auth-service npx prisma db seed 2>/dev/null && \
		echo "   ✅ Seed auth OK." || \
		(echo "   ⚠️  Seed auth ignoré ou échoué."; echo "   💡 Si besoin : cd backend/auth-service && npx prisma db seed")
	@echo ""
	@echo "4/5 Vérification des services (make status)..."
	@$(MAKE) status
	@echo ""
	@echo "5/5 Installation deps + lancement de tous les tests (make test-all)..."
	@(cd tests && npm install --no-audit --no-fund 2>/dev/null) || true
	@(cd frontend && npm install --no-audit --no-fund 2>/dev/null) || true
	@TEST_NOPROMPT=1 $(MAKE) test-all
	@echo ""
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║     ✅ TESTS TERMINÉS – Consulter tests/results/      ║"
	@echo "╚════════════════════════════════════════════════════════╝"
endef

test-full: ## Rebuild (--no-cache, lourd) + up-full + db-push-all + seed + status + test-all
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║     🚀 TEST FULL - Rebuild, stack, BDD, tests         ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "1/6 Rebuild des images (make rebuild — très lourd, 10–20 min)..."
	@$(MAKE) rebuild
	@echo ""
	@echo "2/6 Démarrage de la stack (make up-full)..."
	@$(MAKE) up-full
	@echo ""
	@echo "3/6 Synchronisation BDD (make db-push-all)..."
	@$(MAKE) db-push-all
	@echo ""
	@echo "3b/6 Seed auth (admin emailVerified pour les tests)..."
	@docker exec -e ADMIN_EMAIL=$${ADMIN_EMAIL:-admin@jobbingtrack.com} -e ADMIN_PASSWORD=$${ADMIN_PASSWORD:-password123} jobbingtrack-auth-service npx prisma db seed 2>/dev/null && \
		echo "   ✅ Seed auth OK." || \
		(echo "   ⚠️  Seed auth ignoré ou échoué."; echo "   💡 Si besoin : cd backend/auth-service && npx prisma db seed")
	@echo ""
	@echo "4/6 Vérification des services (make status)..."
	@$(MAKE) status
	@echo ""
	@echo "5/6 Installation des deps (tests + frontend)..."
	@(cd tests && npm install --no-audit --no-fund 2>/dev/null) || true
	@(cd frontend && npm install --no-audit --no-fund 2>/dev/null) || true
	@echo ""
	@echo "6/6 Lancement de tous les tests avec rapports (make test-all)..."
	@TEST_NOPROMPT=1 $(MAKE) test-all
	@echo ""
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║     ✅ TEST FULL TERMINÉ – Consulter tests/results/   ║"
	@echo "╚════════════════════════════════════════════════════════╝"

test-full-quick: ## Pas de rebuild : up-full + db-push-all + seed + status + test-all (léger, images existantes)
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║     ⚡ TEST FULL QUICK - Stack + BDD + tests (sans rebuild) ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "💡 Aucun rebuild : utilise les images déjà présentes. Si erreur, lancez make test-full-cached ou make test-full."
	@echo ""
	$(test_full_steps)

test-full-cached: ## Build avec cache + up-full + db + seed + status + test-all (compromis rapide après changement de code)
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║     🔨 TEST FULL CACHED - Build (cache) + stack + tests ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "1/5 Build des images avec cache (make build-full)..."
	@$(MAKE) build-full
	@echo ""
	$(test_full_steps)

test-full-timed: ## Mesure la durée de test-full (début, fin, time)
	@echo "⏱️  Début: $$(date -Iseconds)"
	@echo "📊 Mesure des ressources (time) pour: make test-full"
	@echo ""
	@bash -c 'time $(MAKE) test-full'
	@echo ""
	@echo "⏱️  Fin: $$(date -Iseconds)"

up-full-timed: ## Mesure la durée de up-full (début, fin, time)
	@echo "⏱️  Début: $$(date -Iseconds)"
	@echo "📊 Mesure (time) pour: make up-full"
	@echo ""
	@bash -c 'time $(MAKE) up-full'
	@echo ""
	@echo "⏱️  Fin: $$(date -Iseconds)"

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
# 🗄️ TESTS BDD - Tests base de données (connexion, enums, relations)
# ================================================================

test-database: ## Tests base de données (connexion, schéma, enums, relations)
	$(call check_help_read,test-database)
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║        🗄️  TESTS BDD - JobbingTrack                   ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "📋 Cette commande exécute les tests base de données :"
	@echo "   ✓ Connexion et schéma (tests/database/)"
	@echo "   ✓ Validation enums, relations (si scripts présents)"
	@echo ""
	@echo "⚙️  Configuration requise :"
	@echo "   • Postgres démarré (make up ou make up-full)"
	@echo "   • make db-push-all si besoin (tables à jour)"
	@echo ""
	@echo "🚀 Lancement des tests..."
	@echo ""
	@echo "💻 Exécution en local (les tests lisent aussi docker-compose.yml et docs/)..."
	@(export DATABASE_URL="$${DATABASE_URL:-postgresql://jobbingtrack:jobbingtrack123@localhost:$${POSTGRES_PORT:-5000}/jobbingtrack}"; \
		cd tests && npm run test:database 2>&1) || \
		(echo "❌ Tests BDD échoués. Vérifiez: make up-full puis make db-push-all"; exit 1)
	@echo ""
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║                ✅ TEST BDD TERMINÉ                    ║"
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
		docker exec -e API_GATEWAY_URL=http://api-gateway:5002 -e MONITORING_C_URL=http://monitoring-c:8015 -w /app/tests jobbingtrack-frontend sh -c "npm test -- api/ --verbose --forceExit --no-coverage 2>&1" || \
		docker exec -e API_GATEWAY_URL=http://api-gateway:5002 -e MONITORING_C_URL=http://monitoring-c:8015 -w /app jobbingtrack-frontend sh -c "cd tests && npm test -- api/ --verbose --forceExit --no-coverage 2>&1" || \
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

# ================================================================
# 🎨 TEST FRONTEND - Tests unitaires frontend (Jest)
# ================================================================
test-frontend: ## Tests frontend (Jest - délègue à test-unit-frontend)
	$(call check_help_read,test-frontend)
	@$(MAKE) test-unit-frontend

# ================================================================
# 🎭 TEST E2E - Tests E2E Playwright
# ================================================================
test-e2e: ## Tests E2E Playwright (délègue à test-e2e-frontend)
	$(call check_help_read,test-e2e)
	@$(MAKE) test-e2e-frontend

# Tests E2E emails (inscription + vérif email, mails réels possibles)
test-e2e-email-workflows: ## Tests E2E workflows email (MailHog + emails réels via TEST_REAL_EMAILS)
	$(call check_help_read,test-e2e-email-workflows)
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║      ✉️  TESTS E2E WORKFLOWS EMAIL - JobbingTrack      ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "📋 Ce test couvre :"
	@echo "   • Inscription + envoi email de vérification"
	@echo "   • Vérification via EmailLog (token) puis login"
	@echo "   • Mode MailHog (dev) + mode SMTP réel (OVH/Gmail/Proton) via TEST_REAL_EMAILS"
	@echo ""
	@echo "⚙️  Configuration :"
	@echo "   • STACK démarrée (make up-full)"
	@echo "   • Auth-service avec EmailLog synchronisé (make db-push-auth ou make db-push-all)"
	@echo "   • Pour tester des boîtes réelles :"
	@echo "       make test-e2e-email-workflows TEST_REAL_EMAILS=\"pauldelhomme.pro@gmail.com,paul.delhomme@proton.me,test@delhomme.ovh\""
	@echo ""
	@cd tests && TEST_REAL_EMAILS="$(TEST_REAL_EMAILS)" npx playwright test e2e/specs/email-workflows.spec.ts --project=chromium
	@echo ""
	@echo "✅ Tests E2E email-workflows terminés"

# Specs dédiés mobile : vérification email par fournisseur (Gmail, Proton, BlueMail)
test-e2e-mobile-email-verification: ## Tests E2E mobile – inscription + vérif email (Gmail, Proton, BlueMail)
	$(call check_help_read,test-e2e-mobile-email-verification)
	@echo "📱 Specs mobile email (e2e/specs/mobile/) – Gmail, Proton, BlueMail"
	@cd tests && TEST_REAL_EMAILS="$(TEST_REAL_EMAILS)" npx playwright test e2e/specs/mobile/ --project=chromium
	@echo "✅ Tests E2E mobile email verification terminés"

# ================================================================
# 🔒 TEST SÉCURITÉ - Tests de sécurité (WAF, auth, injection, etc.)
# ================================================================
test-security: ## Tests de sécurité API gateway (XSS, SQLi, rate limit, headers…). API_GATEWAY_URL par défaut http://127.0.0.1:5002 — ne pas lancer depuis la même IP admin que le pare-feu en mode blocage strict (voir TODOS / docs sécurité lab).
	$(call check_help_read,test-security)
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║        🔒 TESTS SÉCURITÉ - JobbingTrack               ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@if [ -f "tests/security/test-security.js" ]; then \
		cd "$(ROOT_DIR)" && \
		API_GATEWAY_URL="$${API_GATEWAY_URL:-http://127.0.0.1:5002}" \
		PROJECT_ROOT="$(ROOT_DIR)" \
		node tests/security/test-security.js 2>&1 || exit 1; \
	else \
		echo "⚠️  tests/security/test-security.js non trouvé"; exit 1; \
	fi
	@$(MAKE) test-cve-scan
	@echo ""
	@echo "✅ Tests sécurité terminés"

test-cve-scan: ## Scan CVE supply-chain : Node package-lock, Rust cargo-audit si disponible, Docker via CVE_SCAN_DOCKER=1. Strict: CVE_SCAN_STRICT=1 CVE_SCAN_FAIL_ON=high
	$(call check_help_read,test-cve-scan)
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║        🧬 SCAN CVE / SUPPLY CHAIN - JobbingTrack      ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@cd "$(ROOT_DIR)" && PROJECT_ROOT="$(ROOT_DIR)" python3 scripts/security/cve-scan.py
