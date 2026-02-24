# ============================================================================
# Mobile / Émulateur - Contrôleur pour tests en direct depuis le backoffice
# ============================================================================
# Le contrôleur s'exécute sur la MACHINE HÔTE (Android SDK + Flutter requis).
# Il démarre automatiquement à la fin de "make up-full". Sinon : make emulator-controller.
# Puis ouvrez Backoffice → Émulateur mobile pour le rendu en direct.
# ============================================================================

EMULATOR_CONTROLLER_DIR := $(ROOT_DIR)/tools/emulator-controller
MOBILE_DIR := $(ROOT_DIR)/mobile

.PHONY: emulator-controller emulator-controller-bg emulator-controller-stop help-emulator test-emulator-controller

# Démarrer le contrôleur d'émulateur (foreground - garder le terminal ouvert)
emulator-controller: ## Démarrer le contrôleur d'émulateur Android (port 5055). Démarre aussi automatiquement avec make up-full ; utilisez cette cible pour le lancer manuellement ou en 2e terminal
	@echo "📱 Contrôleur d'émulateur - JobbingTrack"
	@echo "   Connexion backoffice : http://localhost:5055 (ou host.docker.internal:5055 si backoffice en Docker)"
	@echo "   Page : Backoffice → Émulateur mobile"
	@echo ""
	@if [ ! -f "$(EMULATOR_CONTROLLER_DIR)/server.js" ]; then \
		echo "❌ Fichier introuvable : $(EMULATOR_CONTROLLER_DIR)/server.js"; exit 1; \
	fi
	@$(MAKE) -s emulator-controller-stop 2>/dev/null || true
	@sleep 1
	@echo "   Démarrage sur le port 5055 (v2: /flutter-devices, /build-apk avec gradle cache)..."
	@echo "   Si 404 ou 500 dans le backoffice, c'est qu'une ancienne instance tourne encore : make emulator-controller-stop puis relancer."
	@cd "$(EMULATOR_CONTROLLER_DIR)" && node server.js

# Démarrer le contrôleur en arrière-plan (nohup)
emulator-controller-bg: ## Démarrer le contrôleur d'émulateur en arrière-plan (port 5055)
	@echo "📱 Démarrage du contrôleur d'émulateur en arrière-plan..."
	@cd "$(EMULATOR_CONTROLLER_DIR)" && nohup node server.js > /tmp/emulator-controller.log 2>&1 &
	@echo "   PID: $$(pgrep -f 'node server.js' | head -1)"
	@echo "   Logs: tail -f /tmp/emulator-controller.log"
	@echo "   Arrêt: make emulator-controller-stop"

# Arrêter le contrôleur (libère le port 5055 en tuant tout processus qui l'utilise)
emulator-controller-stop: ## Arrêter le contrôleur d'émulateur (libère le port 5055)
	@if command -v lsof >/dev/null 2>&1; then \
		for p in $$(lsof -ti :5055 2>/dev/null); do kill -9 $$p 2>/dev/null || true; done; \
		if lsof -ti :5055 >/dev/null 2>&1; then echo "⚠️  Port 5055 encore utilisé."; else echo "✅ Port 5055 libéré."; fi; \
		sleep 2; \
	elif command -v fuser >/dev/null 2>&1; then \
		fuser -k 5055/tcp 2>/dev/null; sleep 2; echo "✅ Port 5055 libéré."; \
	else \
		pkill -f "node server.js" 2>/dev/null; sleep 2; echo "ℹ️  Si EADDRINUSE persiste : lsof -i :5055 puis kill -9 <PID>"; \
	fi

# Tester le contrôleur (doit être démarré sur le port 5055)
test-emulator-controller: ## Vérifier que le contrôleur répond (GET /health, /avds, /devices, /flutter-devices). Lancez make emulator-controller avant.
	@if [ ! -f "$(EMULATOR_CONTROLLER_DIR)/test-server.js" ]; then \
		echo "❌ Fichier introuvable : $(EMULATOR_CONTROLLER_DIR)/test-server.js"; exit 1; \
	fi
	@cd "$(ROOT_DIR)" && node "$(EMULATOR_CONTROLLER_DIR)/test-server.js"

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
