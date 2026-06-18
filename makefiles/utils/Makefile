# ============================================================================
# Makefile Utils - JobbingTrack
# ============================================================================
# Utilitaires divers (monitoring quick access, scripts, etc.)
# ============================================================================

.PHONY: metrics logs-metrics mon mon-save mon-watch mon-quick mon-history mon-last mon-clean help-utils git-checkout

# ============================================================================
# AIDE
# ============================================================================

help-utils: ## Afficher l'aide utilitaires
	@echo "================================================================"
	@echo "🛠️  UTILS - Commandes disponibles"
	@echo "================================================================"
	@echo ""
	@echo "📊 ACCÈS RAPIDE MONITORING:"
	@echo "  make metrics               - Ouvrir Performances backoffice (http://localhost:5003/backoffice/performances)"
	@echo "  make logs-metrics          - Logs du système de métriques"
	@echo ""
	@echo "📈 SCRIPTS MONITORING:"
	@echo "  make mon                   - Lancer monitoring.sh (complet ~60s)"
	@echo "  make mon-quick             - Test rapide (sans collectes temporelles)"
	@echo "  make mon-save              - Sauvegarder stats dans data/monitoring/"
	@echo "  make mon-watch             - Surveillance continue (60s)"
	@echo "  make mon-history           - Liste des logs sauvegardés"
	@echo "  make mon-last              - Afficher le dernier log"
	@echo "  make mon-clean             - Nettoyer vieux logs (garde 30)"
	@echo ""
	@echo "🌍 URLS DISPONIBLES:"
	@echo "  Backoffice:        http://localhost:5003"
	@echo "  API Gateway:       http://localhost:5002"
	@echo "  Metrics Aggregator: http://localhost:5004"
	@echo ""
	@echo "🔧 CONFIGURATION:"
	@echo "  make setup-ports   - Mettre à jour .env avec les ports cohérents"
	@echo "  Performances BO:   http://localhost:5003/backoffice/performances"
	@echo "  Metrics API:       http://localhost:5004/health"
	@echo ""
	@echo "💡 EXEMPLES:"
	@echo "  make metrics               # Ouvrir Performances backoffice"
	@echo "  make mon                   # Monitoring complet"
	@echo "  make mon-save              # Sauvegarder les stats"
	@echo "  make mon-quick             # Test rapide"
	@echo ""
	@echo "📖 Documentation: docs/administration/README.md"
	@echo ""
	@echo "🔀 GIT:"
	@echo "  make git-checkout         - Navigation interactive (retour à un commit ou branche)"
	@echo ""

# ============================================================================
# CONFIGURATION PORTS
# ============================================================================

setup-ports: ## Mettre à jour .env avec les ports cohérents (5000-5019)
	@chmod +x $(ROOT_DIR)/scripts/setup/setup-ports.sh 2>/dev/null || true
	@$(ROOT_DIR)/scripts/setup/setup-ports.sh

setup-port: setup-ports ## Alias : même chose que setup-ports

# ============================================================================
# GIT - Navigation interactive
# ============================================================================

git-checkout: ## Revenir à un commit ou une branche de manière interactive
	@chmod +x $(ROOT_DIR)/scripts/utils/git-interactive-checkout.sh 2>/dev/null || true
	@$(ROOT_DIR)/scripts/utils/git-interactive-checkout.sh

# ============================================================================
# ACCÈS RAPIDE MONITORING
# ============================================================================

# Ouvrir le backoffice Performances (stack monitoring custom)
metrics: ## Ouvrir Performances backoffice dans le navigateur
	@echo "📊 Ouverture Performances backoffice..."
	@echo "🌐 URL: http://localhost:5003/backoffice/performances"
	@if command -v xdg-open >/dev/null 2>&1; then \
		xdg-open http://localhost:5003/backoffice/performances 2>/dev/null & \
	else \
		echo "💡 Ouvrez votre navigateur à l'adresse ci-dessus"; \
	fi

# cAdvisor supprimé (obsolète)

# Logs métriques
# logs-metrics est défini dans makefiles/services/Makefile (ligne 544)
# Suppression de la définition en double pour éviter le warning

# ============================================================================
# SCRIPTS MONITORING
# ============================================================================

# Lancer le script de monitoring complet
mon: ## Lancer monitoring.sh (analyse complète)
	@echo "📊 Lancement du monitoring complet JobbingTrack..."
	@echo "⏱️  Durée estimée: ~60 secondes (13 tests + collectes temporelles)"
	@echo ""
	@chmod +x scripts/monitoring/monitoring.sh
	@./scripts/monitoring/monitoring.sh

# Sauvegarder les stats dans data/monitoring/history
mon-save: ## Sauvegarder les stats de monitoring
	@echo "📊 Collecte et sauvegarde des stats..."
	@mkdir -p data/monitoring/history
	@chmod +x scripts/monitoring/monitoring.sh
	@./scripts/monitoring/monitoring.sh > data/monitoring/history/stats-$$(date +%Y%m%d-%H%M%S).log
	@echo ""
	@echo "✅ Stats sauvegardées dans data/monitoring/history/"
	@echo "📁 Fichier: stats-$$(date +%Y%m%d-%H%M%S).log"
	@ls -lh data/monitoring/history/ | tail -1

# Surveillance continue
mon-watch: ## Surveillance continue (60s entre chaque collecte)
	@echo "👀 Surveillance en temps réel - Monitoring toutes les 60s"
	@echo "⏹️  Ctrl+C pour arrêter"
	@echo ""
	@while true; do \
		clear; \
		echo "╔════════════════════════════════════════════════════════════╗"; \
		echo "║          SURVEILLANCE CONTINUE - JobbingTrack             ║"; \
		echo "║          Actualisation: $$(date '+%H:%M:%S')                      ║"; \
		echo "╚════════════════════════════════════════════════════════════╝"; \
		echo ""; \
		chmod +x scripts/monitoring/monitoring.sh; \
		./scripts/monitoring/monitoring.sh 5 2>/dev/null || echo "❌ Erreur lors de la collecte"; \
		echo ""; \
		echo "⏳ Prochaine collecte dans 60 secondes... (Ctrl+C pour arrêter)"; \
		sleep 60; \
	done

# Test rapide (sans les collectes temporelles longues)
mon-quick: ## Test rapide du monitoring (sans collectes 50s)
	@echo "⚡ Monitoring rapide (tests 1-11 seulement)..."
	@echo ""
	@chmod +x scripts/monitoring/monitoring.sh
	@./scripts/monitoring/monitoring.sh quick

# Afficher les derniers logs de monitoring sauvegardés
mon-history: ## Afficher les derniers logs de monitoring
	@echo "📜 Historique des logs de monitoring:"
	@echo ""
	@if [ -d "data/monitoring/history" ]; then \
		ls -lt data/monitoring/history/*.log 2>/dev/null | head -10 || echo "Aucun log trouvé"; \
	else \
		echo "❌ Dossier data/monitoring/history non trouvé"; \
		echo "💡 Lancez 'make mon-save' pour créer le premier log"; \
	fi

# Voir le dernier log
mon-last: ## Afficher le dernier log de monitoring
	@echo "📊 Dernier log de monitoring:"
	@echo ""
	@if [ -f "$$(ls -t data/monitoring/history/*.log 2>/dev/null | head -1)" ]; then \
		cat "$$(ls -t data/monitoring/history/*.log | head -1)"; \
	else \
		echo "❌ Aucun log trouvé"; \
		echo "💡 Lancez 'make mon-save' pour créer un log"; \
	fi

# Nettoyer les anciens logs (garder les 30 derniers)
mon-clean: ## Nettoyer les anciens logs (garde les 30 derniers)
	@echo "🧹 Nettoyage des anciens logs de monitoring..."
	@if [ -d "data/monitoring/history" ]; then \
		cd data/monitoring/history && \
		ls -t *.log 2>/dev/null | tail -n +31 | xargs -r rm && \
		echo "✅ Nettoyage terminé" && \
		echo "📊 Logs restants: $$(ls -1 *.log 2>/dev/null | wc -l)"; \
	else \
		echo "❌ Dossier data/monitoring/history non trouvé"; \
	fi
