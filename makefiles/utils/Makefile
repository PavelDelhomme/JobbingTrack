# ============================================================================
# Makefile Utils - JobbingTrack
# ============================================================================
# Utilitaires divers (monitoring quick access, etc.)
# ============================================================================

.PHONY: metrics cadvisor logs-metrics help-utils

# ============================================================================
# AIDE
# ============================================================================

help-utils: ## Afficher l'aide utilitaires
	@echo "================================================================"
	@echo "🛠️  UTILS - Commandes disponibles"
	@echo "================================================================"
	@echo ""
	@echo "📊 ACCÈS RAPIDE MONITORING:"
	@echo "  make metrics               - Ouvrir Prometheus (http://localhost:9090)"
	@echo "  make cadvisor              - Ouvrir cAdvisor (http://localhost:8081)"
	@echo "  make logs-metrics          - Logs du système de métriques"
	@echo ""
	@echo "🌍 URLS DISPONIBLES:"
	@echo "  Prometheus:        http://localhost:9090"
	@echo "  cAdvisor:          http://localhost:8081"
	@echo "  Grafana:           http://localhost:8083"
	@echo "  Metrics Aggreg.:   http://localhost:8082"
	@echo ""
	@echo "💡 EXEMPLES:"
	@echo "  make metrics               # Ouvrir Prometheus"
	@echo "  make cadvisor              # Ouvrir cAdvisor"
	@echo ""
	@echo "📖 Documentation: docs/administration/README.md"
	@echo ""

# ============================================================================
# ACCÈS RAPIDE MONITORING
# ============================================================================

# Ouvrir Prometheus
metrics: ## Ouvrir Prometheus dans le navigateur
	@echo "📊 Ouverture de Prometheus..."
	@echo "🌐 URL: http://localhost:9090"
	@if command -v xdg-open >/dev/null 2>&1; then \
		xdg-open http://localhost:9090 2>/dev/null & \
	else \
		echo "💡 Ouvrez votre navigateur à l'adresse ci-dessus"; \
	fi

# Ouvrir cAdvisor
cadvisor: ## Ouvrir cAdvisor dans le navigateur
	@echo "📊 Ouverture de cAdvisor..."
	@echo "🌐 URL: http://localhost:8081"
	@if command -v xdg-open >/dev/null 2>&1; then \
		xdg-open http://localhost:8081 2>/dev/null & \
	else \
		echo "💡 Ouvrez votre navigateur à l'adresse ci-dessus"; \
	fi

# Logs métriques
logs-metrics: ## Logs du système de métriques
	@echo "📋 Logs du système de métriques..."
	$(call docker_compose, $(COMPOSE_FILES_FULL) logs -f jobbingtrack-metrics-aggregator)
