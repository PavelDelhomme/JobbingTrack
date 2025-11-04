# ============================================================================
# Makefile Backend - JobbingTrack
# ============================================================================
# Commandes SPÉCIFIQUES au monitoring backend
# Les commandes génériques sont dans makefiles/services/, tests/, etc.
# ============================================================================

.PHONY: monitoring-up monitoring-down monitoring-restart monitoring-ps monitoring-logs monitoring-logs-service monitoring-test monitoring-test-auth test-monitoring backend-help help-backend

# ============================================================================
# AIDE
# ============================================================================

help-backend: ## Afficher l'aide backend
	@echo "================================================================"
	@echo "🔧 BACKEND - Commandes monitoring disponibles"
	@echo "================================================================"
	@echo ""
	@echo "📊 MONITORING (Stack):"
	@echo "  make monitoring-up              - Démarrer stack monitoring (Prometheus/Grafana/Loki)"
	@echo "  make monitoring-down            - Arrêter monitoring"
	@echo "  make monitoring-restart         - Redémarrer monitoring"
	@echo "  make monitoring-ps              - Status services monitoring"
	@echo "  make monitoring-logs            - Logs tous services monitoring"
	@echo "  make monitoring-logs-service SERVICE=prometheus - Logs service spécifique"
	@echo ""
	@echo "📈 MONITORING (Statistiques):"
	@echo "  make monitoring-stats           - Lancer le script de monitoring complet"
	@echo "  make monitoring-stats-save      - Sauvegarder les stats dans data/monitoring/"
	@echo "  make monitoring-stats-watch     - Surveillance continue (60s)"
	@echo ""
	@echo "🧪 TESTS:"
	@echo "  make monitoring-test            - Test health endpoints"
	@echo "  make monitoring-test-auth TOKEN=xxx - Test avec auth JWT"
	@echo "  make test-monitoring            - Suite tests complète"
	@echo ""
	@echo "🌍 ACCÈS:"
	@echo "  Prometheus:  http://localhost:9090"
	@echo "  Loki:        http://localhost:3100"
	@echo "  Grafana:     http://localhost:3001 (admin/admin123)"
	@echo ""
	@echo "💡 EXEMPLES:"
	@echo "  make monitoring-up && make monitoring-test   # Démarrer et tester"
	@echo "  make monitoring-stats-save                    # Collecter et sauvegarder"
	@echo "  make monitoring-logs-service SERVICE=grafana # Logs Grafana"
	@echo ""
	@echo "📖 Documentation: docs/monitoring/"
	@echo ""

# ============================================================================
# MONITORING
# ============================================================================

monitoring-up: ## Démarrer stack monitoring
	@echo "📊 Démarrage stack monitoring..."
	@echo "🧹 Nettoyage des conteneurs conflictuels..."
	@docker stop cadvisor-monitoring prometheus grafana loki promtail node-exporter 2>/dev/null || true
	@docker rm cadvisor-monitoring prometheus grafana loki promtail node-exporter 2>/dev/null || true
	@cd monitoring && docker-compose -f docker-compose.monitoring.yml up -d
	@echo "✅ Monitoring démarré"
	@echo ""
	@echo "📊 Accès monitoring:"
	@echo "  Prometheus:     http://localhost:9090"
	@echo "  Grafana:        http://localhost:3013 (admin/admin123)"
	@echo "  cAdvisor:       http://localhost:8082"
	@echo "  Node Exporter:  http://localhost:9100"
	@echo "  Loki:           http://localhost:3100"
	@echo "  API Metrics:    http://localhost:8014"

monitoring-down: ## Arrêter stack monitoring
	@echo "🛑 Arrêt stack monitoring..."
	@cd monitoring && docker-compose -f docker-compose.monitoring.yml down
	@echo "✅ Monitoring arrêté"

monitoring-restart: ## Redémarrer stack monitoring
	@echo "🔄 Redémarrage monitoring..."
	@$(MAKE) monitoring-down
	@sleep 2
	@$(MAKE) monitoring-up

metrics-rebuild: ## Rebuild et redémarrer metrics-aggregator
	@echo "🔨 Rebuild metrics-aggregator..."
	@docker stop jobbingtrack-metrics-aggregator 2>/dev/null || true
	@docker rm jobbingtrack-metrics-aggregator 2>/dev/null || true
	@docker rmi jobbingtrack-metrics-aggregator 2>/dev/null || true
	@docker-compose up -d --build jobbingtrack-metrics-aggregator
	@echo "✅ Metrics-aggregator reconstruit et redémarré"
	@sleep 5
	@docker logs jobbingtrack-metrics-aggregator --tail 20

fix-all: ## Fix complet (frontend + metrics-aggregator)
	@echo "🔧 Fix complet en cours..."
	@chmod +x scripts/fix-all.sh
	@./scripts/fix-all.sh

monitoring-full: ## Démarrer JobbingTrack + Monitoring (propre)
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║   Démarrage Complet: JobbingTrack + Monitoring        ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "🧹 Nettoyage des conteneurs conflictuels..."
	@docker stop cadvisor-monitoring prometheus grafana loki promtail node-exporter 2>/dev/null || true
	@docker rm cadvisor-monitoring prometheus grafana loki promtail node-exporter 2>/dev/null || true
	@echo "🛑 Arrêt de la stack monitoring..."
	@cd monitoring && docker-compose -f docker-compose.monitoring.yml down 2>/dev/null || true
	@echo ""
	@echo "🚀 Démarrage de la stack principale..."
	@$(MAKE) up-full
	@echo "⏳ Attente de l'initialisation (10s)..."
	@sleep 10
	@echo ""
	@echo "📊 Démarrage du monitoring..."
	@$(MAKE) monitoring-up
	@echo "⏳ Attente de Prometheus (15s)..."
	@sleep 15
	@echo ""
	@echo "✅ Système complet démarré !"
	@echo ""
	@make status

monitoring-ps: ## Status des services monitoring
	@echo "📊 Status services monitoring:"
	@cd monitoring && docker-compose -f docker-compose.monitoring.yml ps

monitoring-logs: ## Logs de tous les services monitoring
	@echo "📋 Logs monitoring en temps réel..."
	@cd monitoring && docker-compose -f docker-compose.monitoring.yml logs -f

monitoring-logs-service: ## Logs d'un service monitoring (SERVICE=prometheus)
	@if [ -z "$(SERVICE)" ]; then \
		echo "❌ Spécifiez SERVICE=<nom>"; \
		echo "Exemples: prometheus, loki, grafana"; \
		exit 1; \
	fi
	@echo "📋 Logs $(SERVICE)..."
	@cd monitoring && docker-compose -f docker-compose.monitoring.yml logs -f $(SERVICE)

monitoring-test: ## Test health des endpoints monitoring
	@echo "🧪 Test des endpoints monitoring..."
	@echo "Testing Prometheus..."
	@curl -s http://localhost:9090/-/healthy >/dev/null && echo "✅ Prometheus OK" || echo "❌ Prometheus DOWN"
	@echo "Testing Loki..."
	@curl -s http://localhost:3100/ready >/dev/null && echo "✅ Loki OK" || echo "❌ Loki DOWN"
	@echo "Testing Grafana..."
	@curl -s http://localhost:3001/api/health >/dev/null && echo "✅ Grafana OK" || echo "❌ Grafana DOWN"

monitoring-test-auth: ## Test API avec authentification JWT (TOKEN=xxx)
	@if [ -z "$(TOKEN)" ]; then \
		echo "❌ Spécifiez TOKEN=<jwt_token>"; \
		exit 1; \
	fi
	@echo "🧪 Test avec authentification..."
	@curl -s -H "Authorization: Bearer $(TOKEN)" http://localhost:3008/metrics

test-monitoring: ## Suite de tests complète du monitoring
	@echo "🧪 Suite de tests monitoring complète..."
	@echo ""
	@echo "1️⃣ Vérification des conteneurs..."
	@docker ps --filter "name=prometheus" --filter "name=loki" --filter "name=grafana" --format "table {{.Names}}\t{{.Status}}"
	@echo ""
	@echo "2️⃣ Test des endpoints..."
	@$(MAKE) monitoring-test
	@echo ""
	@echo "3️⃣ Vérification des logs (dernières 5 lignes)..."
	@cd monitoring && docker-compose -f docker-compose.monitoring.yml logs --tail=5
	@echo ""
	@echo "✅ Tests terminés"

monitoring-stats: ## Exécuter le script de monitoring complet
	@echo "📊 Lancement du monitoring complet JobbingTrack..."
	@chmod +x scripts/monitoring/monitoring.sh
	@./scripts/monitoring/monitoring.sh

monitoring-stats-save: ## Sauvegarder les stats dans data/monitoring/history
	@echo "📊 Collecte et sauvegarde des stats..."
	@mkdir -p data/monitoring/history
	@chmod +x scripts/monitoring/monitoring.sh
	@./scripts/monitoring/monitoring.sh > data/monitoring/history/stats-$$(date +%Y%m%d-%H%M%S).log
	@echo "✅ Stats sauvegardées dans data/monitoring/history/"

monitoring-stats-watch: ## Surveillance continue (toutes les 60s)
	@echo "👀 Surveillance en temps réel (Ctrl+C pour arrêter)..."
	@watch -n 60 'make monitoring-stats'

backend-help: ## Aide complète backend + monitoring
	@echo "================================================================"
	@echo "🔧 BACKEND - Commandes monitoring"
	@echo "================================================================"
	@echo ""
	@echo "📊 MONITORING:"
	@echo "  make monitoring-up              - Démarrer monitoring"
	@echo "  make monitoring-down            - Arrêter monitoring"
	@echo "  make monitoring-restart         - Redémarrer monitoring"
	@echo "  make monitoring-ps              - Status services"
	@echo "  make monitoring-logs            - Logs tous services"
	@echo "  make monitoring-logs-service SERVICE=prometheus"
	@echo "  make monitoring-test            - Test health"
	@echo "  make monitoring-test-auth TOKEN=xxx"
	@echo "  make test-monitoring            - Suite tests complète"
	@echo ""
	@echo "💡 Les commandes générales sont dans make help"
	@echo ""
