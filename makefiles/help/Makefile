# ============================================================================
# Makefile Help - JobbingTrack
# ============================================================================
# Système d'aide contextuelle pour chaque commande
# ============================================================================

.PHONY: menu help help-up help-down help-status help-logs help-monitoring-up help-test help-build help-clean \
        help-tests help-tests-reset help-tests-user-journey help-tests-interface-web help-tests-help help-migrate \
        disable-help enable-help help-status-help

menu: ## Affiche le menu interactif CLI pour toutes les commandes Makefile
	@./scripts/make-menu.sh
help-tests: ## Aide globale pour les commandes de tests
	@echo "================================================================"
	@echo "🧪 AIDE: Suite de tests JobbingTrack"
	@echo "================================================================"
	@echo ""
	@echo "🔧 COMMANDES PRINCIPALES:"
	@echo "  make tests-help           - Guide complet (workflow + explications)"
	@echo "  make tests-reset          - Reset complet (arrêt, up, db-push-all, admin)"
	@echo "  make tests-user-journey   - Test automatique via API"
	@echo "  make tests-interface-web  - Interface web http://localhost:8080/backoffice/user-journey"
	@echo "  make test-email-verification - Test ciblé vérification email"
	@echo ""
	@echo "🔄 WORKFLOW RECOMMANDÉ:"
	@echo "  1. make tests-reset"
	@echo "  2. make tests-user-journey"
	@echo "  3. (Optionnel) make tests-interface-web"
	@echo ""
	@echo "📚 Ressources: STATUS.md (section 1.12), docs/tests/"
	@echo ""
	@echo "💡 Astuce: alias disponibles -> make tests-clean / make test-clean"
	@echo ""

# ============================================================================
# GESTION DU MESSAGE D'AIDE
# ============================================================================

disable-help: ## Désactiver le message d'aide (temporairement ou définitivement)
	@echo "🔕 Désactivation du message d'aide..."
	@echo ""
	@echo "Choisissez une option :"
	@echo "  1) Temporaire (cette session uniquement)"
	@echo "  2) Définitivement (ajout dans ~/.bashrc ou ~/.zshrc)"
	@echo ""
	@read -p "Votre choix (1 ou 2) : " choice; \
	if [ "$$choice" = "1" ]; then \
		echo ""; \
		echo "✅ Message d'aide désactivé pour cette session"; \
		echo ""; \
		echo "Pour l'activer dans cette session, exécutez :"; \
		echo "  export JOBBINGTRACK_HELP_READ="; \
		echo ""; \
		echo "Ou utilisez : make enable-help"; \
		echo ""; \
		echo "⚠️  Note : Cette désactivation sera perdue à la fermeture du terminal"; \
		echo ""; \
		echo "Pour activer maintenant dans cette session, exécutez :"; \
		echo "  export JOBBINGTRACK_HELP_READ=1"; \
	elif [ "$$choice" = "2" ]; then \
		echo ""; \
		echo "✅ Désactivation définitive..."; \
		SHELL_RC=""; \
		if [ -f "$$HOME/.zshrc" ]; then \
			SHELL_RC="$$HOME/.zshrc"; \
		elif [ -f "$$HOME/.bashrc" ]; then \
			SHELL_RC="$$HOME/.bashrc"; \
		fi; \
		if [ -n "$$SHELL_RC" ]; then \
			if grep -q "JOBBINGTRACK_HELP_READ" "$$SHELL_RC"; then \
				echo "⚠️  La variable JOBBINGTRACK_HELP_READ existe déjà dans $$SHELL_RC"; \
				echo "   Elle sera mise à jour..."; \
				sed -i.bak 's/^export JOBBINGTRACK_HELP_READ=.*/export JOBBINGTRACK_HELP_READ=1/' "$$SHELL_RC" || \
				sed -i.bak 's/^JOBBINGTRACK_HELP_READ=.*/export JOBBINGTRACK_HELP_READ=1/' "$$SHELL_RC"; \
			else \
				echo "" >> "$$SHELL_RC"; \
				echo "# Désactivation du message d'aide JobbingTrack" >> "$$SHELL_RC"; \
				echo "export JOBBINGTRACK_HELP_READ=1" >> "$$SHELL_RC"; \
			fi; \
			echo ""; \
			echo "✅ Variable ajoutée dans $$SHELL_RC"; \
			echo ""; \
			echo "Pour activer le message d'aide à nouveau, exécutez :"; \
			echo "  make enable-help"; \
			echo ""; \
			echo "Ou modifiez manuellement $$SHELL_RC"; \
			echo ""; \
			echo "⚠️  Note : Vous devez redémarrer votre terminal ou exécuter :"; \
			echo "  source $$SHELL_RC"; \
		else \
			echo "❌ Impossible de trouver ~/.bashrc ou ~/.zshrc"; \
			echo "   Ajoutez manuellement dans votre fichier de configuration shell :"; \
			echo "   export JOBBINGTRACK_HELP_READ=1"; \
		fi; \
	else \
		echo "❌ Choix invalide. Utilisez 1 ou 2."; \
		exit 1; \
	fi

enable-help: ## Réactiver le message d'aide
	@echo "🔔 Réactivation du message d'aide..."
	@echo ""
	@echo "Choisissez une option :"
	@echo "  1) Cette session uniquement"
	@echo "  2) Définitivement (retrait de ~/.bashrc ou ~/.zshrc)"
	@echo ""
	@read -p "Votre choix (1 ou 2) : " choice; \
	if [ "$$choice" = "1" ]; then \
		echo ""; \
		echo "✅ Message d'aide réactivé pour cette session"; \
		echo ""; \
		echo "Pour le désactiver à nouveau, exécutez :"; \
		echo "  export JOBBINGTRACK_HELP_READ=1"; \
		echo ""; \
		echo "Ou utilisez : make disable-help"; \
		echo ""; \
		echo "⚠️  Note : Cette activation sera perdue à la fermeture du terminal"; \
		echo ""; \
		echo "Pour activer maintenant dans cette session, exécutez :"; \
		echo "  export JOBBINGTRACK_HELP_READ="; \
		unset JOBBINGTRACK_HELP_READ; \
	elif [ "$$choice" = "2" ]; then \
		echo ""; \
		echo "✅ Réactivation définitive..."; \
		SHELL_RC=""; \
		if [ -f "$$HOME/.zshrc" ]; then \
			SHELL_RC="$$HOME/.zshrc"; \
		elif [ -f "$$HOME/.bashrc" ]; then \
			SHELL_RC="$$HOME/.bashrc"; \
		fi; \
		if [ -n "$$SHELL_RC" ]; then \
			if grep -q "JOBBINGTRACK_HELP_READ" "$$SHELL_RC"; then \
				echo "✅ Retrait de la variable de $$SHELL_RC..."; \
				sed -i.bak '/^export JOBBINGTRACK_HELP_READ=.*/d' "$$SHELL_RC"; \
				sed -i.bak '/^JOBBINGTRACK_HELP_READ=.*/d' "$$SHELL_RC"; \
				sed -i.bak '/# Désactivation du message d.*aide JobbingTrack/d' "$$SHELL_RC"; \
				echo "✅ Variable retirée de $$SHELL_RC"; \
				echo ""; \
				echo "⚠️  Note : Vous devez redémarrer votre terminal ou exécuter :"; \
				echo "  source $$SHELL_RC"; \
			else \
				echo "⚠️  La variable JOBBINGTRACK_HELP_READ n'existe pas dans $$SHELL_RC"; \
				echo "   Le message d'aide est déjà actif par défaut."; \
			fi; \
		else \
			echo "❌ Impossible de trouver ~/.bashrc ou ~/.zshrc"; \
			echo "   Le message d'aide est déjà actif par défaut."; \
		fi; \
	else \
		echo "❌ Choix invalide. Utilisez 1 ou 2."; \
		exit 1; \
	fi

help-status-help: ## Afficher le statut actuel du message d'aide
	@echo "📊 Statut du message d'aide :"
	@echo ""
	@if [ -n "$$JOBBINGTRACK_HELP_READ" ]; then \
		echo "  🔕 DÉSACTIVÉ (session actuelle)"; \
		echo "     Variable JOBBINGTRACK_HELP_READ=$$JOBBINGTRACK_HELP_READ"; \
	else \
		echo "  🔔 ACTIVÉ (session actuelle)"; \
		echo "     Variable JOBBINGTRACK_HELP_READ non définie"; \
	fi; \
	echo ""; \
	SHELL_RC=""; \
	if [ -f "$$HOME/.zshrc" ]; then \
		SHELL_RC="$$HOME/.zshrc"; \
	elif [ -f "$$HOME/.bashrc" ]; then \
		SHELL_RC="$$HOME/.bashrc"; \
	fi; \
	if [ -n "$$SHELL_RC" ]; then \
		if grep -q "JOBBINGTRACK_HELP_READ" "$$SHELL_RC"; then \
			echo "  🔕 DÉSACTIVÉ (définitivement dans $$SHELL_RC)"; \
		else \
			echo "  🔔 ACTIVÉ (pas de configuration dans $$SHELL_RC)"; \
		fi; \
	fi; \
	echo ""; \
	echo "💡 Commandes disponibles :"; \
	echo "  make disable-help  - Désactiver le message d'aide"; \
	echo "  make enable-help   - Réactiver le message d'aide"

# ============================================================================
# AIDE GÉNÉRALE
# ============================================================================

help: ## Afficher l'aide complète
	@echo "================================================================"
	@echo "🚀 JOBBINGTRACK - PLATEFORME DE GESTION DE CANDIDATURES"
	@echo "================================================================"
	@echo ""
	@echo "🎮 MENU INTERACTIF (RECOMMANDÉ):"
	@echo "  make menu              - Menu interactif CLI avec toutes les commandes"
	@echo "                          Parfait pour naviguer facilement dans le projet !"
	@echo "                          Organisé par catégories (Démarrage, Tests, DB, etc.)"
	@echo ""
	@echo "📋 AIDE PAR CATÉGORIE (toutes ces commandes sont opérationnelles):"
	@echo "  make help-db           - Aide base de données (alias: make help-database)"
	@echo "  make help-tests        - Aide globale tests (make tests-help, workflow)"
	@echo "  make help-test         - Aide détaillée commandes make test-*"
	@echo "  make help-migrate      - Aide migrations Prisma (db-migrate, db-push-all)"
	@echo "  make help-frontend     - Aide frontend (build, dev, tests)"
	@echo "  make help-backend      - Aide backend / monitoring"
	@echo "  make help-services     - Aide services (up, down, restart, status)"
	@echo "  make help-utils        - Aide utilitaires (metrics, logs)"
	@echo "  make help-diagnostic   - Aide diagnostic (health, cors, docker)"
	@echo "  make help-compilation  - Aide compilation (build, rebuild, clean)"
	@echo "  make help-documentation - Aide documentation (PDF)"
	@echo "  make help-mobile       - Aide tests mobile Playwright (si Makefile.mobile-tests inclus)"
	@echo "  make help-emulator     - Aide émulateur mobile (tests en direct, rendu comme Android Studio)"
	@echo ""
	@echo "🔕 GESTION DU MESSAGE D'AIDE:"
	@echo "  make disable-help      - Désactiver le message d'aide (temporaire ou définitif)"
	@echo "  make enable-help       - Réactiver le message d'aide"
	@echo "  make help-status-help  - Afficher le statut actuel du message d'aide"
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo ""
	@echo "📦 DÉMARRAGE:"
	@echo "  make up                - Démarrer services essentiels"
	@echo "  make up-full           - Démarrer TOUS les services"
	@echo "  make down              - Arrêter tous les services"
	@echo "  make restart           - Redémarrer services actifs"
	@echo ""
	@echo "🔍 DIAGNOSTIC:"
	@echo "  make status            - Statut des services"
	@echo "  make health            - Vérifier santé"
	@echo "  make diagnostic        - Diagnostic complet"
	@echo ""
	@echo "🗄️  BASE DE DONNÉES:"
	@echo "  make db-migrate        - Migrations Prisma (tous services)"
	@echo "  make db-push-all       - Synchroniser schémas (prisma db push)"
	@echo "  make migrate-all       - Alias pour db-migrate"
	@echo "  make migrate-restart   - Migrations + restart services"
	@echo "  make db-seed           - Insérer données test"
	@echo "  make db-backup         - Sauvegarder DB"
	@echo "  make db-reset          - Reset DB"
	@echo ""
	@echo "🧪 TESTS:"
	@echo "  make tests-help              - Guide complet des tests"
	@echo "  make tests-reset             - Reset complet pour tests (auto)"
	@echo "  make tests-user-journey      - Test parcours utilisateur (API)"
	@echo "  make tests-interface-web     - Interface web de test"
	@echo "  make test-all                - Exécute TOUS les tests (complet)"
	@echo ""
	@echo "📊 TESTS PAR CATÉGORIE (avec rapports) :"
	@echo "  make test-database          - Tests base de données"
	@echo "  make test-api               - Tests API complets"
	@echo "  make test-backend           - Tests services backend"
	@echo "  make test-frontend          - Tests frontend (Jest)"
	@echo "  make test-mobile            - Tests mobile Playwright"
	@echo "  make test-e2e               - Tests E2E Playwright"
	@echo "  make test-e2e-mobile-email  - Tests E2E émulateur + inscription / Email Monitor"
	@echo "  make test-performance       - Tests de performance"
	@echo "  make test-security          - Tests de sécurité"
	@echo "  make test-integration       - Tests d'intégration"
	@echo "  make test-docker            - Tests Docker"
	@echo "  make test-monitoring        - Tests monitoring"
	@echo "  make test-unit              - Tests unitaires"
	@echo "  make test-services          - Tests services détaillés"
	@echo "  make test-infrastructure    - Tests infrastructure"
	@echo ""
	@echo "🎯 TEST COMPLET :"
	@echo "  make test-all                - Exécute TOUS les tests avec rapports complets"
	@echo "  make test-relations          - Test relations many-to-many"
	@echo "  make test-enums              - Validation des enums"
	@echo "  make test-email-verification - Test vérification email"
	@echo ""
	@echo "📱 ÉMULATEUR MOBILE (rendu en direct - comme Android Studio):"
	@echo "  make emulator-controller      - Démarrer le contrôleur (2e terminal après make up-full)"
	@echo "  make emulator-controller-bg   - Contrôleur en arrière-plan"
	@echo "  make emulator-controller-stop - Arrêter le contrôleur"
	@echo "  make restart-emulator         - Arrêter puis relancer le contrôleur (après modif server.js)"
	@echo "  make verify-mobile-emulator   - Vérifier que le contrôleur et les routes parcours sont OK"
	@echo "  make verify-mobile-scenarios  - Vérifier cohérence parcours (scénarios vs steps)"
	@echo "  make help-emulator            - Aide : tester l'app en direct (AVD ou téléphone connecté)"
	@echo "  → Tests interface mobile : via système de scénarios (backoffice/mobile-emulator + verify-mobile-scenarios + test-e2e-mobile-email)"
	@echo ""
	@echo "📱 TESTS MOBILE (Playwright):"
	@echo "  make test-mobile             - Tous les tests mobile (iPhone 13 Pro)"
	@echo "  make test-mobile-auth        - Tests authentification mobile"
	@echo "  make test-mobile-applications - Tests candidatures mobile"
	@echo "  make test-mobile-contacts    - Tests contacts mobile"
	@echo "  make test-mobile-calls       - Tests appels mobile"
	@echo "  make test-mobile-interviews  - Tests entretiens mobile"
	@echo "  make test-mobile-followups   - Tests relances mobile"
	@echo "  make test-mobile-notifications - Tests notifications mobile"
	@echo "  make test-mobile-ui          - Mode UI interactif Playwright"
	@echo "  make test-mobile-debug       - Mode debug step-by-step"
	@echo "  make test-mobile-report      - Rapport HTML des tests"
	@echo "  make test-mobile-interactive  - Menu interactif CLI mobile"
	@echo "  make test-mobile-install     - Installer Playwright"
	@echo "  make help-mobile             - Aide complète tests mobile"
	@echo ""
	@echo "📊 MONITORING:"
	@echo "  make monitoring-up     - Démarrer monitoring"
	@echo "  make test-monitoring   - Tests monitoring"
	@echo ""
	@echo "🔨 BUILD:"
	@echo "  make build             - Build services"
	@echo "  make rebuild           - Rebuild sans cache"
	@echo "  make clean             - Nettoyer"
	@echo ""
	@echo "💡 AIDE DÉTAILLÉE:"
	@echo "  make help-<commande>   - Aide pour une commande"
	@echo "  Exemple: make help-up"
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo ""
	@echo "🎮 MENU INTERACTIF (RECOMMANDÉ):"
	@echo "  make menu              - Menu interactif CLI complet et organisé"
	@echo ""
	@echo "  📋 Ce menu vous permet de:"
	@echo "     • Naviguer facilement dans toutes les commandes disponibles"
	@echo "     • Organiser les commandes par catégories (Démarrage, Tests, DB, etc.)"
	@echo "     • Rechercher rapidement une commande spécifique"
	@echo "     • Accéder à toutes les fonctionnalités du projet en un seul endroit"
	@echo ""
	@echo "  💡 Idéal si vous revenez sur le projet après plusieurs mois !"
	@echo "     Tapez simplement 'make menu' pour commencer."
	@echo ""
	@echo ""

help-migrate: ## Aide détaillée pour les migrations Prisma
	@echo "================================================================"
	@echo "🗄️  AIDE: Migrations Prisma"
	@echo "================================================================"
	@echo ""
	@echo "📝 DESCRIPTION:"
	@echo "  Exécute les migrations Prisma sur chaque micro-service backend"
	@echo ""
	@echo "🔧 COMMANDES DISPONIBLES:"
	@echo "  make db-migrate        - Commande principale (tous les services)"
	@echo "  make db-push-all       - Forcer la création des tables (prisma db push)"
	@echo "  make migrate-all       - Alias pratique (équivalent à db-migrate)"
	@echo "  make migrate-restart   - Migrations puis redémarrage des services actifs"
	@echo ""
	@echo "⚠️  PRÉREQUIS:"
	@echo "  - Services Docker doivent être démarrés (make up ou make up-full)"
	@echo "  - PostgreSQL doit être prêt (la commande vérifie automatiquement)"
	@echo ""
	@echo "🔄 WORKFLOW CONSEILLÉ:"
	@echo "  1. make db-push-all    (si tables manquantes / nouvelle base)"
	@echo "  2. make migrate-all"
	@echo "  3. make restart        (ou make migrate-restart directement)"
	@echo ""
	@echo "🧪 APRÈS MIGRATION:"
	@echo "  - make tests-user-journey   → Vérifier API"
	@echo "  - make tests-interface-web  → Vérifier parcours manuel"
	@echo ""
	@echo "📖 Documentation détaillée: STATUS.md section 1.12"
	@echo ""

# ============================================================================
# AIDES CONTEXTUELLES
# ============================================================================

help-up: ## Aide détaillée pour 'make up'
	@echo "================================================================"
	@echo "🚀 AIDE: make up"
	@echo "================================================================"
	@echo ""
	@echo "📝 DESCRIPTION:"
	@echo "  Démarre les services essentiels de JobbingTrack:"
	@echo "  - PostgreSQL (base de données)"
	@echo "  - Redis (cache)"
	@echo "  - API Gateway"
	@echo "  - Frontend Next.js"
	@echo "  - Auth Service"
	@echo "  - Dashboard Service"
	@echo ""
	@echo "🔧 USAGE:"
	@echo "  make up"
	@echo ""
	@echo "🌐 ACCÈS:"
	@echo "  Frontend:    http://localhost:8080"
	@echo "  API Gateway: http://localhost:3000"
	@echo ""
	@echo "⚙️  OPTIONS:"
	@echo "  make up-no-check  - Démarre sans vérification Docker"
	@echo "  make up-full      - Démarre TOUS les services"
	@echo ""
	@echo "📋 VOIR AUSSI:"
	@echo "  make help-down       - Arrêter les services"
	@echo "  make help-status     - Vérifier l'état"
	@echo ""

help-down: ## Aide détaillée pour 'make down'
	@echo "================================================================"
	@echo "🛑 AIDE: make down"
	@echo "================================================================"
	@echo ""
	@echo "📝 DESCRIPTION:"
	@echo "  Arrête tous les services JobbingTrack proprement"
	@echo "  Supprime les conteneurs mais conserve les volumes"
	@echo ""
	@echo "🔧 USAGE:"
	@echo "  make down"
	@echo ""
	@echo "⚠️  ATTENTION:"
	@echo "  Les données ne sont PAS supprimées"
	@echo "  Pour nettoyer complètement: make clean"
	@echo ""
	@echo "📋 VOIR AUSSI:"
	@echo "  make help-clean      - Nettoyage complet"
	@echo "  make help-restart    - Redémarrer services"
	@echo ""

help-status: ## Aide détaillée pour 'make status'
	@echo "================================================================"
	@echo "📊 AIDE: make status"
	@echo "================================================================"
	@echo ""
	@echo "📝 DESCRIPTION:"
	@echo "  Affiche l'état de tous les services Docker"
	@echo "  - Services essentiels"
	@echo "  - Services optionnels"
	@echo "  - Status (running/stopped)"
	@echo "  - Ports exposés"
	@echo ""
	@echo "🔧 USAGE:"
	@echo "  make status"
	@echo ""
	@echo "📋 VOIR AUSSI:"
	@echo "  make help-health     - Vérifier santé"
	@echo "  make help-logs       - Voir les logs"
	@echo ""

help-logs: ## Aide détaillée pour 'make logs'
	@echo "================================================================"
	@echo "📋 AIDE: make logs"
	@echo "================================================================"
	@echo ""
	@echo "📝 DESCRIPTION:"
	@echo "  Affiche les logs en temps réel de tous les services"
	@echo ""
	@echo "🔧 USAGE:"
	@echo "  make logs                      - Tous les logs"
	@echo "  make logs-applicative          - Logs sans metrics-aggregator ni monitoring-c"
	@echo "  make logs-persistence          - Uniquement les lignes [PERSISTENCE]"
	@echo "  make logs-tests                - Uniquement les lignes [TESTS ...] (pendant les runs)"
	@echo "  make logs-metrics              - Uniquement metrics-aggregator"
	@echo "  make logs-service SERVICE=api-gateway - Un service"
	@echo ""
	@echo "⌨️  RACCOURCIS:"
	@echo "  Ctrl+C pour quitter"
	@echo ""
	@echo "📋 VOIR AUSSI:"
	@echo "  make help-status     - État des services"
	@echo ""

help-monitoring-up: ## Aide détaillée pour 'make monitoring-up'
	@echo "================================================================"
	@echo "📊 AIDE: make monitoring-up"
	@echo "================================================================"
	@echo ""
	@echo "📝 DESCRIPTION:"
	@echo "  Démarre la stack de monitoring:"
	@echo "  - Prometheus (métriques)"
	@echo "  - Loki (logs)"
	@echo "  - Grafana (visualisation)"
	@echo ""
	@echo "🔧 USAGE:"
	@echo "  make monitoring-up"
	@echo ""
	@echo "🌐 ACCÈS:"
	@echo "  Prometheus: http://localhost:9090"
	@echo "  Grafana:    http://localhost:3001"
	@echo "  Login:      admin / admin123"
	@echo ""
	@echo "📋 VOIR AUSSI:"
	@echo "  make test-monitoring        - Tester monitoring"
	@echo "  make monitoring-logs        - Voir logs"
	@echo ""

help-test: ## Aide détaillée pour 'make test'
	@echo "================================================================"
	@echo "🧪 AIDE: make test"
	@echo "================================================================"
	@echo ""
	@echo "📝 DESCRIPTION:"
	@echo "  Lance tous les tests du projet"
	@echo ""
	@echo "🔧 USAGE:"
	@echo "  make test              - Tous les tests (ancien)"
	@echo ""
	@echo "✨ NOUVELLES COMMANDES (recommandées):"
	@echo "  make tests-help              - Guide complet des tests"
	@echo "  make tests-reset             - Reset complet pour tests"
	@echo "  make tests-user-journey      - Test parcours utilisateur"
	@echo "  make tests-interface-web     - Interface web de test"
	@echo ""
	@echo "📋 VOIR AUSSI:"
	@echo "  make help-tests-user-journey  - Aide détaillée tests User Journey"
	@echo "  make help-tests-reset         - Aide détaillée reset tests"
	@echo ""

help-tests-help: ## Aide détaillée pour 'make tests-help'
	@echo "================================================================"
	@echo "📚 AIDE: make tests-help"
	@echo "================================================================"
	@echo ""
	@echo "📝 DESCRIPTION:"
	@echo "  Affiche le guide complet des tests avec:"
	@echo "  - Processus étape par étape"
	@echo "  - Toutes les commandes disponibles"
	@echo "  - Exemples d'usage"
	@echo "  - Différences entre les commandes"
	@echo "  - Workflow recommandé"
	@echo ""
	@echo "🔧 USAGE:"
	@echo "  make tests-help"
	@echo ""
	@echo "💡 CETTE COMMANDE EST VOTRE POINT D'ENTRÉE POUR LES TESTS !"
	@echo ""

help-tests-reset: ## Aide détaillée pour 'make tests-reset'
	@echo "================================================================"
	@echo "🔄 AIDE: make tests-reset"
	@echo "================================================================"
	@echo ""
	@echo "📝 DESCRIPTION:"
	@echo "  Reset complet et automatique du système pour les tests"
	@echo "  Cette commande fait TOUT automatiquement !"
	@echo ""
	@echo "🔧 USAGE:"
	@echo "  make tests-reset"
	@echo ""
	@echo "⚙️  CE QUE CETTE COMMANDE FAIT:"
	@echo "  1/5 - Arrête tous les services (make down)"
	@echo "  2/5 - Redémarre pour tests (make up-for-tests)"
	@echo "  3/5 - Attend 15 secondes (initialisation)"
	@echo "  4/5 - Crée toutes les tables (prisma db push)"
	@echo "  5/5 - Crée l'utilisateur admin automatiquement"
	@echo ""
	@echo "✅ RÉSULTAT:"
	@echo "  Système 100% prêt pour les tests !"
	@echo ""
	@echo "🎯 APRÈS CETTE COMMANDE:"
	@echo "  make tests-user-journey      - Lancer les tests"
	@echo "  make tests-interface-web     - Ouvrir l'interface"
	@echo ""
	@echo "⏱️  DURÉE: ~40 secondes"
	@echo ""

help-tests-user-journey: ## Aide détaillée pour 'make tests-user-journey'
	@echo "================================================================"
	@echo "🎯 AIDE: make tests-user-journey"
	@echo "================================================================"
	@echo ""
	@echo "📝 DESCRIPTION:"
	@echo "  Teste automatiquement le parcours utilisateur complet via API"
	@echo "  15 tests couvrant toutes les fonctionnalités principales"
	@echo ""
	@echo "🔧 USAGE:"
	@echo "  make tests-user-journey"
	@echo ""
	@echo "📊 TESTS EFFECTUÉS (15 tests):"
	@echo "  ✓ [1]  API Health"
	@echo "  ✓ [2]  Register"
	@echo "  ✓ [3]  Login"
	@echo "  ✓ [4]  Get Profile"
	@echo "  ✓ [5]  Companies - List"
	@echo "  ✓ [6]  Companies - Create"
	@echo "  ✓ [7]  Applications - List"
	@echo "  ✓ [8]  Applications - Create"
	@echo "  ✓ [9]  Contacts - List"
	@echo "  ✓ [10] Contacts - Create"
	@echo "  ✓ [11] Interviews - List"
	@echo "  ✓ [12] Events - List"
	@echo "  ✓ [13] Followups - List"
	@echo "  ✓ [14] Calls - List"
	@echo "  ✓ [15] Statistics"
	@echo ""
	@echo "✅ RÉSULTAT ACTUEL: 15/15 tests passent (100%)"
	@echo ""
	@echo "⚠️  PRÉREQUIS:"
	@echo "  Services doivent être démarrés !"
	@echo "  Si première fois: make tests-reset d'abord"
	@echo ""
	@echo "⏱️  DURÉE: ~15-20 secondes"
	@echo ""

help-tests-interface-web: ## Aide détaillée pour 'make tests-interface-web'
	@echo "================================================================"
	@echo "🌐 AIDE: make tests-interface-web"
	@echo "================================================================"
	@echo ""
	@echo "📝 DESCRIPTION:"
	@echo "  Démarre l'interface web de test pour tester manuellement"
	@echo "  via le navigateur (mode visuel)"
	@echo ""
	@echo "🔧 USAGE:"
	@echo "  make tests-interface-web"
	@echo ""
	@echo "🌐 ACCÈS APRÈS DÉMARRAGE:"
	@echo "  http://localhost:8080/backoffice/user-journey"
	@echo ""
	@echo "🔑 IDENTIFIANTS:"
	@echo "  Email:    admin@jobbingtrack.test"
	@echo "  Password: password123"
	@echo ""
	@echo "🔍 DIFFÉRENCE AVEC tests-user-journey:"
	@echo "  tests-user-journey       → Automatique, rapide, via API"
	@echo "  tests-interface-web      → Manuel, visuel, via navigateur"
	@echo ""
	@echo "💡 UTILITÉ:"
	@echo "  - Débugger visuellement"
	@echo "  - Tester manuellement un cas spécifique"
	@echo "  - Voir l'interface utilisateur"
	@echo ""
	@echo "⏱️  DURÉE: ~60 secondes (rebuild auth-service + démarrage)"
	@echo ""


help-build: ## Aide détaillée pour 'make build'
	@echo "================================================================"
	@echo "🔨 AIDE: make build"
	@echo "================================================================"
	@echo ""
	@echo "📝 DESCRIPTION:"
	@echo "  Construit toutes les images Docker"
	@echo ""
	@echo "🔧 USAGE:"
	@echo "  make build             - Build avec cache"
	@echo "  make rebuild           - Build sans cache"
	@echo ""
	@echo "⏱️  TEMPS:"
	@echo "  Première fois: ~10-15 minutes"
	@echo "  Avec cache:    ~2-3 minutes"
	@echo ""
	@echo "📋 VOIR AUSSI:"
	@echo "  make help-clean        - Nettoyer"
	@echo ""

help-clean: ## Aide détaillée pour 'make clean'
	@echo "================================================================"
	@echo "🧹 AIDE: make clean"
	@echo "================================================================"
	@echo ""
	@echo "📝 DESCRIPTION:"
	@echo "  Nettoie complètement l'environnement Docker"
	@echo ""
	@echo "🔧 USAGE:"
	@echo "  make clean             - Nettoyage normal"
	@echo "  make clean-force       - Nettoyage d'urgence"
	@echo ""
	@echo "⚠️  ATTENTION:"
	@echo "  Supprime:"
	@echo "  - Tous les conteneurs"
	@echo "  - Tous les volumes"
	@echo "  - Toutes les images JobbingTrack"
	@echo ""
	@echo "💾 RECOMMANDATION:"
	@echo "  Faites 'make db-backup' avant"
	@echo ""
	@echo "📋 VOIR AUSSI:"
	@echo "  make help-build        - Reconstruire"
	@echo ""

# ============================================================================
# AIDE DYNAMIQUE
# ============================================================================

help-%: ## Aide dynamique pour toute commande (make help-<commande>)
	@echo "================================================================"
	@echo "❓ Aide non disponible pour: $*"
	@echo "================================================================"
	@echo ""
	@echo "Commandes avec aide détaillée:"
	@echo ""
	@echo "  Services & Infrastructure:"
	@echo "    make help-up"
	@echo "    make help-down"
	@echo "    make help-status"
	@echo "    make help-logs"
	@echo "    make help-monitoring-up"
	@echo "    make help-migrate"
	@echo "    make help-build"
	@echo "    make help-clean"
	@echo ""
	@echo "  Tests (nouvelles commandes):"
	@echo "    make help-tests-help              - Guide complet tests"
	@echo "    make help-tests-reset             - Reset automatique"
	@echo "    make help-tests-user-journey      - Tests API auto"
	@echo "    make help-tests-interface-web     - Interface web"
	@echo "    make help-test                    - Anciennes commandes"
	@echo ""
	@echo "Pour la liste complète: make help"
	@echo ""
