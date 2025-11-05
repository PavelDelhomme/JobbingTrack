# ================================================================
# 🧪 TESTS - JobbingTrack
# ================================================================
# Commandes simplifiées pour tester l'application
# ================================================================

.PHONY: tests-help tests-reset tests-user-journey tests-interface-web

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
	@echo "  make tests-help              Affiche ce guide"
	@echo "  make tests-reset             Reset complet (BDD + services)"
	@echo "  make tests-user-journey      Test API automatique"
	@echo "  make tests-interface-web     Interface web de test"
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
	@docker exec jobbingtrack-application-service npx prisma db push --accept-data-loss
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
