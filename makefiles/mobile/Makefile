# ============================================================================
# Mobile / Émulateur - Contrôleur pour tests en direct depuis le backoffice
# ============================================================================
# Le contrôleur s'exécute sur la MACHINE HÔTE (Android SDK + Flutter requis).
# Il démarre automatiquement à la fin de "make up-full". Sinon : make emulator-controller.
# Puis ouvrez Backoffice → Émulateur mobile pour le rendu en direct.
# ============================================================================

EMULATOR_CONTROLLER_DIR := $(ROOT_DIR)/tools/emulator-controller
MOBILE_DIR := $(ROOT_DIR)/mobile

.PHONY: emulator-controller emulator-controller-bg emulator-controller-stop restart-emulator verify-mobile-emulator verify-mobile-scenarios help-emulator test-emulator-controller mobile-device-ready run-mobile mobile-login-admin mobile-login-user mobile-test-accounts mobile-smoke-full-journey mobile-register-smoke mobile-verify-email-smoke mobile-sync-test-env mobile-verify-email

# Démarrer le lanceur (port 5056) qui démarre le contrôleur (5055). Depuis le backoffice on peut Démarrer/Arrêter le contrôleur sans terminal.
emulator-controller: ## Démarrer le lanceur + contrôleur (5056 + 5055). Backoffice → Démarrer/Arrêter le contrôleur sans terminal
	@echo "📱 Contrôleur d'émulateur - JobbingTrack (lanceur + contrôleur)"
	@echo "   Contrôleur : http://localhost:5055  |  Lanceur (start/stop) : http://localhost:5056"
	@echo "   Page : Backoffice → Émulateur mobile (boutons Démarrer / Arrêter le contrôleur)"
	@echo ""
	@if [ ! -f "$(EMULATOR_CONTROLLER_DIR)/launcher.js" ]; then \
		echo "❌ Fichier introuvable : $(EMULATOR_CONTROLLER_DIR)/launcher.js"; exit 1; \
	fi
	@$(MAKE) -s emulator-controller-stop 2>/dev/null || true
	@sleep 1
	@echo "   Lanceur sur 5056, contrôleur sur 5055. Depuis l'interface : Démarrer / Arrêter le contrôleur."
	@cd "$(EMULATOR_CONTROLLER_DIR)" && node launcher.js

# Démarrer le lanceur en arrière-plan (lanceur 5056 + contrôleur 5055)
emulator-controller-bg: ## Démarrer le lanceur + contrôleur en arrière-plan
	@echo "📱 Démarrage du lanceur + contrôleur d'émulateur en arrière-plan..."
	@cd "$(EMULATOR_CONTROLLER_DIR)" && nohup node launcher.js > /tmp/emulator-controller.log 2>&1 &
	@echo "   Lanceur: 5056  |  Contrôleur: 5055"
	@echo "   Logs: tail -f /tmp/emulator-controller.log"
	@echo "   Arrêt: make emulator-controller-stop"

# Arrêter le lanceur (5056) et le contrôleur (5055)
emulator-controller-stop: ## Arrêter le lanceur et le contrôleur (libère 5055 et 5056)
	@for port in 5056 5055; do \
		if command -v lsof >/dev/null 2>&1; then \
			pids=$$(lsof -i :$$port -sTCP:LISTEN -t 2>/dev/null); \
			if [ -z "$$pids" ]; then pids=$$(lsof -i :$$port 2>/dev/null | grep LISTEN | awk '{print $$2}' | sort -u); fi; \
			for p in $$pids; do kill -9 $$p 2>/dev/null || true; done; \
		fi; \
	done; \
	sleep 1; \
	if command -v lsof >/dev/null 2>&1; then \
		still=$$(lsof -i :5055 -sTCP:LISTEN -t 2>/dev/null; lsof -i :5056 -sTCP:LISTEN -t 2>/dev/null); \
		if [ -z "$$still" ]; then echo "✅ Ports 5055 et 5056 libérés."; else echo "⚠️  Vérifiez : lsof -i :5055 -i :5056"; fi; \
	else \
		pkill -f "emulator-controller.*launcher.js\|emulator-controller.*server.js" 2>/dev/null; echo "ℹ️  Processus contrôleur/lanceur arrêtés."; \
	fi

# Arrêter l'ancien processus puis relancer le contrôleur en arrière-plan (une seule commande)
restart-emulator: ## Arrêter le contrôleur sur 5055 puis le relancer (pour prendre en compte les changements de server.js)
	@echo "🔄 Redémarrage du contrôleur d'émulateur (port 5055)..."
	@$(MAKE) -s emulator-controller-stop
	@sleep 2
	@$(MAKE) -s emulator-controller-bg
	@echo "✅ Contrôleur redémarré. Logs: tail -f /tmp/emulator-controller.log"

# Vérifier que tout est prêt pour les parcours mobile-emulator (contrôleur + routes force-restart, ui-dump)
verify-mobile-emulator: ## Vérifier contrôleur (health, avds, devices, force-restart-app) — à lancer avant les parcours
	@echo "📋 Vérification des prérequis pour Backoffice → Émulateur mobile..."
	@$(MAKE) -s test-emulator-controller
	@echo ""
	@echo "💡 Si tout est vert : ouvrez http://localhost:5003/backoffice/mobile-emulator"
	@echo "   Connectez-vous en admin, sélectionnez un appareil ADB, puis lancez un parcours."

# Vérifier que tous les scénarios mobiles référencent des étapes implémentées (sans appareil)
verify-mobile-scenarios: ## Vérifier cohérence parcours mobiles (adb-scenarios vs adb-steps)
	@node "$(ROOT_DIR)/tools/emulator-controller/validate-mobile-scenarios.js"

# Tester le contrôleur (doit être démarré sur le port 5055)
test-emulator-controller: ## Vérifier que le contrôleur répond (GET /health, /avds, /devices, /flutter-devices). Lancez make emulator-controller avant.
	@if [ ! -f "$(EMULATOR_CONTROLLER_DIR)/test-server.js" ]; then \
		echo "❌ Fichier introuvable : $(EMULATOR_CONTROLLER_DIR)/test-server.js"; exit 1; \
	fi
	@cd "$(ROOT_DIR)" && node "$(EMULATOR_CONTROLLER_DIR)/test-server.js"

# Appareil physique : adb reverse + build/install APK
mobile-device-ready: ## Préparer appareil USB (adb reverse 5002/5003, build APK, install)
	@bash "$(ROOT_DIR)/scripts/mobile/setup-physical-device.sh"

# Alias porteur : build + install + lancement sur téléphone USB
run-mobile: ## Build, installe et lance l'app Flutter sur appareil USB (adb reverse inclus)
	@bash "$(ROOT_DIR)/scripts/mobile/setup-physical-device.sh"

# Connexion automatique admin (TEST_ADMIN_* puis repli ADMIN_* si login gateway OK)
mobile-login-admin: ## Login auto sur appareil ADB avec credentials admin (.env)
	@echo "📱 Connexion admin mobile (TEST_ADMIN_* puis ADMIN_*)..."
	@adb reverse tcp:5002 tcp:5002 2>/dev/null || true
	@adb reverse tcp:5003 tcp:5003 2>/dev/null || true
	@/usr/bin/node "$(ROOT_DIR)/scripts/mobile/smoke-login-admin-adb.js"

mobile-login-user: ## Login auto ADB avec TEST_USER_EMAIL/PASSWORD (.env)
	@echo "📱 Connexion utilisateur test mobile (TEST_USER_*)..."
	@adb reverse tcp:5002 tcp:5002 2>/dev/null || true
	@adb reverse tcp:5003 tcp:5003 2>/dev/null || true
	@/usr/bin/node "$(ROOT_DIR)/scripts/mobile/smoke-login-user-adb.js"

mobile-test-accounts: ## Smoke ADB admin + user (menu ADMIN visible / masqué)
	@echo "📱 Smoke dual comptes mobile (admin puis utilisateur test)..."
	@adb reverse tcp:5002 tcp:5002 2>/dev/null || true
	@adb reverse tcp:5003 tcp:5003 2>/dev/null || true
	@/usr/bin/node "$(ROOT_DIR)/scripts/mobile/smoke-mobile-accounts-adb.js"

mobile-smoke-full-journey: ## Parcours API complet (candidature, contact, entretien, relance, appels, analytics)
	@echo "📱 Smoke parcours complet API mobile..."
	@/usr/bin/node "$(ROOT_DIR)/scripts/mobile/smoke-full-journey-api.js"

mobile-register-smoke: ## Smoke inscription UI (télémétrie + écran vérif email)
	@adb reverse tcp:5002 tcp:5002 2>/dev/null || true
	@/usr/bin/node "$(ROOT_DIR)/scripts/mobile/smoke-register-adb.js"

mobile-verify-email-smoke: ## E2E : inscription TEST_REAL_EMAIL → email (MailHog/Log) → deep link → login ADB
	@adb reverse tcp:5002 tcp:5002 2>/dev/null || true
	@/usr/bin/node "$(ROOT_DIR)/scripts/mobile/smoke-verify-email-adb.js"

mobile-sync-test-env: ## Comparer / aligner TEST_ADMIN_* et TEST_VERIFICATION_PASSWORD (.env)
	@/usr/bin/node "$(ROOT_DIR)/scripts/mobile/sync-test-env.js" $(if $(WRITE),--write,)

# Ouvrir un lien de vérification email dans l'app (TOKEN=xxx requis)
mobile-verify-email: ## Ouvrir deep link verify-email sur appareil (TOKEN=xxx)
	@test -n "$(TOKEN)" || (echo "❌ Usage: make mobile-verify-email TOKEN=<token_du_mail>"; exit 1)
	@echo "📧 Ouverture jobbingtrack://verify-email?token=$(TOKEN)"
	@adb shell am start -a android.intent.action.VIEW \
		-d "jobbingtrack://verify-email?token=$(TOKEN)" \
		-n com.example.jobbingtrack_mobile/.MainActivity

# Aide émulateur mobile
help-emulator: ## Aide : tester l'app mobile en direct depuis le backoffice (émulateur ou téléphone connecté)
	@echo "📱 Émulateur mobile - Tester en direct comme Android Studio"
	@echo ""
	@echo "1️⃣  Démarrer tout (un seul terminal) :"
	@echo "   make up-full && make db-push-all && make status"
	@echo "   → Le contrôleur d'émulateur démarre automatiquement (port 5055)."
	@echo ""
	@echo "2️⃣  Ouvrir le backoffice :"
	@echo "   http://localhost:5003/backoffice/mobile-emulator"
	@echo ""
	@echo "3️⃣  Dans l'interface :"
	@echo "   - Sélectionner un AVD (plusieurs niveaux API) ou un téléphone déjà connecté en USB (adb)"
	@echo "   - Démarrer l'émulateur si besoin, puis Build APK → Installer et lancer l'app"
	@echo "   - Le rendu en direct de l'écran Android s'affiche (comme Android Studio)"
	@echo ""
	@echo "   Si le contrôleur n'a pas démarré : make emulator-controller (2e terminal)"
	@echo ""
