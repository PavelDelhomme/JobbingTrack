# ============================================================================
# Makefile Utils - JobbingTrack
# ============================================================================
# Utilitaires divers (monitoring quick access, etc.)
# ============================================================================

.PHONY: metrics cadvisor logs-metrics

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
