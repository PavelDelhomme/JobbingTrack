# ================================================================
# 🧪 TESTS - JobbingTrack
# ================================================================
# Commandes simplifiées pour tester l'application
# ================================================================

.PHONY: tests-help tests-reset tests-user-journey tests-interface-web test-email-verification \
        tests-clean test-clean test-relations test-enums test-email-python \
        test-email-python-reset test-email-python-verification test-email-diagnostic \
        test-email-logs test-email-logs-all test-email-logs-stats

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
	@echo "  ✓ Crée l'utilisateur admin (admin@jobbingtrack.test / password123)"
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
		VALUES (gen_random_uuid(), 'admin@jobbingtrack.test', '\$$2a\$$10\$$IoX96wTcbU7t51e4T02MpemPhTDU/YZQkjhFMxNHV.HtH5vNL78P2', \
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
	@echo "   Email:    admin@jobbingtrack.test"
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
		echo "⚠️  Variable TEST_EMAIL non définie, utilisation de redacted@example.invalid"; \
		echo "   Pour spécifier un email : TEST_EMAIL=redacted@example.invalid make test-email-python-reset"; \
		echo ""; \
	fi
	@docker exec -e TEST_EMAIL="$(TEST_EMAIL)" jobbingtrack-auth-service node /app/test-email-python.js test_reset || \
		(echo ""; \
		 echo "❌ Erreur : Le service Python n'est pas disponible."; \
		 echo "💡 Solution : Reconstruire le conteneur avec 'make rebuild auth-service'"; \
		 exit 1)

test-email-logs: ## Afficher les logs d'emails récents
	@echo "📧 Logs d'emails récents..."
	@docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c "SELECT id, \"to\", subject, type, status, \"sentAt\", \"createdAt\" FROM \"EmailLog\" ORDER BY \"createdAt\" DESC LIMIT 10;" 2>/dev/null || \
		echo "❌ Erreur lors de la récupération des logs. Vérifiez que la table EmailLog existe."

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
		echo "⚠️  Variable TEST_EMAIL non définie, utilisation de redacted@example.invalid"; \
		echo "   Pour spécifier un email : TEST_EMAIL=redacted@example.invalid make test-email-python-verification"; \
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
