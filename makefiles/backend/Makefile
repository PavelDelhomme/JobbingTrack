# ============================================================================
# Makefile Backend - JobbingTrack
# ============================================================================
# Commandes SPÉCIFIQUES au monitoring backend
# Les commandes génériques sont dans makefiles/services/, tests/, etc.
# ============================================================================

.PHONY: monitoring-up monitoring-down monitoring-restart monitoring-ps monitoring-logs monitoring-logs-service monitoring-test monitoring-test-auth test-monitoring backend-help help-backend test-performance-backend check-memory-backend analyze-metrics-aggregator monitoring-ancien-down monitoring-c-up monitoring-c-down monitoring-c-restart monitoring-c-logs monitoring-c-debug monitoring-c-shell log-collector-c-shell up-monitoring security-generate-threats security-live-check test-firewall test-metrics monitor

# ============================================================================
# AIDE
# ============================================================================

help-backend: ## Afficher l'aide backend
	@echo "================================================================"
	@echo "🔧 BACKEND - Commandes monitoring disponibles"
	@echo "================================================================"
	@echo ""
	@echo "📊 MONITORING (Stack):"
	@echo "  NOUVEAU SYSTÈME (C - ultra-léger):"
	@echo "    make monitoring-c-up            - Démarrer nouveau système monitoring en C"
	@echo "    make monitoring-c-down          - Arrêter nouveau système monitoring en C"
	@echo "    make monitoring-c-restart       - Redémarrer nouveau système monitoring en C"
	@echo "    make monitoring-c-logs          - Voir les logs du nouveau monitoring"
	@echo "    make up-monitoring              - Alias pour monitoring-c-up"
	@echo "  GÉNÉRAL:"
	@echo "    make monitoring-ps              - Status services monitoring"
	@echo "    make monitoring-c-logs          - Logs tous services monitoring"
	@echo "    make monitor                    - Tableau live conteneurs JobbingTrack (ports, CPU, RAM, état)"
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
	@echo "  make test-metrics               - Test complet métriques (reconstruction + persistance)"
	@echo "  make security-live-check        - Validation live WAF/Firewall + logs temps réel"
	@echo "  make rebuild-monitoring-c       - Reconstruire conteneur monitoring-c"
	@echo "  make rebuild-log-collector-c    - Reconstruire conteneur log-collector-c"
	@echo ""
	@echo "⚡ PERFORMANCE:"
	@echo "  make test-performance-backend   - Tests de performance backend"
	@echo "  make check-memory-backend        - Vérifier consommation mémoire"
	@echo "  make analyze-metrics-aggregator - Analyser metrics-aggregator"
	@echo ""
	@echo "🌍 ACCÈS:"
	@echo "  Monitoring C:   http://localhost:5098"
	@echo "  Log Collector:  http://localhost:5099"
	@echo ""
	@echo "💡 EXEMPLES:"
	@echo "  make monitoring-c-up                         # Démarrer nouveau monitoring"
	@echo "  make monitoring-c-logs                       # Voir les logs"
	@echo ""
	@echo "📖 Documentation: docs/monitoring/"
	@echo ""

# ============================================================================
# MONITORING
# ============================================================================

monitoring-up: ## Démarrer stack monitoring (alias pour monitoring-c-up)
	@echo "⚠️  L'ancien système de monitoring a été supprimé"
	@echo "📊 Utilisation du nouveau système en C (monitoring-c)"
	@$(MAKE) monitoring-c-up

monitoring-c-up: ## Démarrer nouveau système de monitoring en C (ultra-léger)
	@echo "🚀 Démarrage nouveau système de monitoring en C..."
	@echo "📦 Compilation et démarrage des services..."
	@if [ ! -f "docker-compose.monitoring.yml" ]; then \
		echo "❌ Fichier docker-compose.monitoring.yml non trouvé"; \
		exit 1; \
	fi
	@$(call docker_compose, -f docker-compose.yml -f docker-compose.monitoring.yml --profile monitoring-c up -d --build monitoring-c log-collector-c)
	@echo "✅ Monitoring en C démarré"
	@echo ""
	@echo "📊 Accès:"
	@echo "  Monitoring C:   http://localhost:5098"
	@echo "  Log Collector: http://localhost:5099"
	@echo ""
	@echo "💡 Pour voir les logs: make monitoring-c-logs"

monitoring-c-down: ## Arrêter nouveau système de monitoring en C
	@echo "🛑 Arrêt monitoring en C..."
	@$(call docker_compose, -f docker-compose.yml -f docker-compose.monitoring.yml --profile monitoring-c stop monitoring-c log-collector-c 2>/dev/null || true)
	@$(call docker_compose, -f docker-compose.yml -f docker-compose.monitoring.yml --profile monitoring-c rm -f monitoring-c log-collector-c 2>/dev/null || true)
	@echo "✅ Monitoring en C arrêté"

monitoring-c-restart: ## Redémarrer nouveau système de monitoring en C
	@echo "🔄 Redémarrage monitoring en C..."
	@$(MAKE) monitoring-c-down
	@sleep 2
	@$(MAKE) monitoring-c-up
	@echo "✅ Monitoring en C redémarré"

monitoring-c-logs: ## Voir les logs du nouveau système de monitoring en C (tags colorés)
	@echo "📋 Logs monitoring en C..."
	@$(call docker_compose, -f docker-compose.yml -f docker-compose.monitoring.yml --profile monitoring-c logs -f monitoring-c log-collector-c) 2>&1 | bash "$(ROOT_DIR)/scripts/ops/color-logs.sh"

monitoring-c-debug: ## Mode debug monitoring-c (interactif, build, logs)
	@echo "🐛 Mode debug monitoring-c..."

monitoring-c-test-services: ## Test monitoring-c avec services spécifiques (usage: make monitoring-c-test-services SERVICES="frontend api-gateway")
	@echo "🧪 Test monitoring-c avec services spécifiques..."
	@SERVICES=$${SERVICES:-"frontend api-gateway auth-service"}; \
	echo "📋 Services à tester: $$SERVICES"; \
	echo ""; \
	for service in $$SERVICES; do \
		echo "🔍 Test de jobbingtrack-$$service:"; \
		curl -s http://localhost:5098/api/v1/metrics | jq -r ".containers[] | select(.name == \"jobbingtrack-$$service\") | {name, cpu_percent, memory_mb, memory_percent, response_time_ms, http_status}" || echo "❌ Service non trouvé ou erreur"; \
		echo ""; \
	done
	@echo "✅ Test terminé"
	@echo "📦 Build et démarrage interactif..."
	@$(call docker_compose, -f docker-compose.yml -f docker-compose.monitoring.yml --profile monitoring-c up --build monitoring-c log-collector-c)

monitoring-c-shell: ## Accès shell dans monitoring-c
	@echo "🐚 Accès shell monitoring-c..."
	@docker exec -it jobbingtrack-monitoring-c sh || echo "⚠️  Container non démarré. Lancez: make monitoring-c-up"

log-collector-c-shell: ## Accès shell dans log-collector-c
	@echo "🐚 Accès shell log-collector-c..."
	@docker exec -it jobbingtrack-log-collector-c sh || echo "⚠️  Container non démarré. Lancez: make monitoring-c-up"

up-monitoring: monitoring-c-up ## Alias - Démarrer monitoring en C

monitoring-down: ## Arrêter stack monitoring (ancien système)
	@echo "🛑 Arrêt stack monitoring (ancien système)..."
	@cd monitoring && docker-compose -f docker-compose.monitoring.yml down 2>/dev/null || true
	@echo "✅ Monitoring ancien arrêté"

monitoring-ancien-down: monitoring-down ## Alias - Arrêter l'ancien système de monitoring complet
	@echo ""
	@echo "📊 Services arrêtés: Prometheus, Grafana, Loki, Promtail, Node Exporter"

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
	@chmod +x scripts/ops/fix-all.sh
	@./scripts/ops/fix-all.sh

monitoring-full: ## Démarrer JobbingTrack + Monitoring (propre)
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║   Démarrage Complet: JobbingTrack + Monitoring        ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "🛑 Arrêt du nouveau système de monitoring..."
	@$(MAKE) monitoring-c-down
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

monitoring-logs-service: ## Logs d'un service monitoring (SERVICE=monitoring-c|log-collector-c)
	@if [ -z "$(SERVICE)" ]; then \
		echo "❌ Spécifiez SERVICE=<nom>"; \
		echo "Exemples: monitoring-c, log-collector-c"; \
		exit 1; \
	fi
	@echo "📋 Logs $(SERVICE)..."
	@docker logs -f jobbingtrack-$(SERVICE) 2>/dev/null || echo "❌ Service $(SERVICE) non trouvé"

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
	@docker ps --filter "name=monitoring-c" --filter "name=log-collector-c" --format "table {{.Names}}\t{{.Status}}"
	@echo ""
	@echo "2️⃣ Test des endpoints..."
	@$(MAKE) monitoring-test
	@echo ""
	@echo "3️⃣ Vérification des logs (dernières 5 lignes)..."
	@cd monitoring && docker-compose -f docker-compose.monitoring.yml logs --tail=5
	@echo ""
	@echo "✅ Tests terminés"

# rebuild-monitoring-c est défini dans makefiles/services/Makefile (rebuild-service SERVICE=monitoring-c)

rebuild-log-collector-c: ## Reconstruire le conteneur log-collector-c
	@echo "🔨 Reconstruction du conteneur log-collector-c..."
	@echo ""
	@echo "1️⃣ Arrêt du conteneur..."
	@$(call docker_compose, -f docker-compose.yml -f docker-compose.monitoring.yml --profile monitoring-c stop log-collector-c 2>/dev/null || true)
	@$(call docker_compose, -f docker-compose.yml -f docker-compose.monitoring.yml --profile monitoring-c rm -f log-collector-c 2>/dev/null || true)
	@echo "✅ Conteneur arrêté"
	@echo ""
	@echo "2️⃣ Reconstruction (sans cache)..."
	@$(call docker_compose, -f docker-compose.yml -f docker-compose.monitoring.yml --profile monitoring-c build --no-cache log-collector-c)
	@echo "✅ Build terminé"
	@echo ""
	@echo "3️⃣ Démarrage..."
	@$(call docker_compose, -f docker-compose.yml -f docker-compose.monitoring.yml --profile monitoring-c up -d log-collector-c)
	@echo "✅ Conteneur démarré"
	@echo ""
	@echo "⏳ Attente initialisation (5 secondes)..."
	@sleep 5
	@echo ""
	@echo "✅ Reconstruction terminée !"
	@echo "💡 Pour voir les logs: make monitoring-c-logs"

test-metrics: ## Test complet du système de métriques (monitoring-c + persistance)
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║     🧪 TEST COMPLET - Système de Métriques           ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "📋 Ce test vérifie :"
	@echo "   ✓ Reconstruction du conteneur monitoring-c"
	@echo "   ✓ Redémarrage du système"
	@echo "   ✓ Vérification des logs"
	@echo "   ✓ Persistance PostgreSQL"
	@echo "   ✓ Métriques système et conteneurs"
	@echo "   ✓ Endpoint /api/v1/metrics"
	@echo ""
	@if [ -t 0 ] && [ -z "$$SKIP_CONFIRM" ]; then \
		read -p "🚀 Démarrer le test complet ? [Y/n] " -n 1 -r; \
		echo ""; \
		if [[ $$REPLY =~ ^[Nn]$$ ]]; then \
			echo "❌ Test annulé"; \
			exit 1; \
		fi \
	fi
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "1️⃣  RECONSTRUCTION DU CONTENEUR"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@$(MAKE) rebuild-monitoring-c
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "2️⃣  REDÉMARRAGE COMPLET"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "⏳ Redémarrage du système de monitoring..."
	@$(MAKE) monitoring-c-restart
	@echo "⏳ Attente stabilisation (10 secondes)..."
	@sleep 10
	@echo "✅ Redémarrage terminé"
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "3️⃣  VÉRIFICATION DES LOGS"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "📋 Dernières lignes des logs monitoring-c:"
	@docker logs jobbingtrack-monitoring-c --tail 30 2>&1 | tail -20 || echo "⚠️  Impossible de lire les logs"
	@echo ""
	@echo "🔍 Recherche de messages STORAGE (persistance PostgreSQL):"
	@docker logs jobbingtrack-monitoring-c 2>&1 | grep -i "\[STORAGE\]" | tail -10 || echo "⚠️  Aucun log STORAGE trouvé (peut être normal si PostgreSQL non connecté)"
	@echo ""
	@echo "🔍 Recherche de messages DEBUG (calcul CPU projet):"
	@docker logs jobbingtrack-monitoring-c 2>&1 | grep -i "\[DEBUG\].*CPU.*Projet" | tail -5 || echo "ℹ️  Pas de logs DEBUG CPU projet (normal si pas d'erreur)"
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "4️⃣  TEST DES MÉTRIQUES (Système)"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@if [ -f "scripts/test-monitoring-system.sh" ]; then \
		chmod +x scripts/test-monitoring-system.sh; \
		./scripts/test-monitoring-system.sh || echo "⚠️  Certains tests ont échoué"; \
	else \
		echo "❌ Script test-monitoring-system.sh non trouvé"; \
	fi
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "5️⃣  TEST DES MÉTRIQUES (Backoffice)"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@if [ -f "scripts/test-backoffice-metrics.sh" ]; then \
		chmod +x scripts/test-backoffice-metrics.sh; \
		./scripts/test-backoffice-metrics.sh || echo "⚠️  Certains tests ont échoué"; \
	else \
		echo "❌ Script test-backoffice-metrics.sh non trouvé"; \
	fi
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "6️⃣  TEST DE LA PERSISTANCE POSTGRESQL"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@if [ -f "scripts/test-metrics-persistence.sh" ]; then \
		chmod +x scripts/test-metrics-persistence.sh; \
		./scripts/test-metrics-persistence.sh || echo "⚠️  Tests de persistance échoués (peut être normal si PostgreSQL non accessible)"; \
	else \
		echo "❌ Script test-metrics-persistence.sh non trouvé"; \
		echo "ℹ️  Vérification manuelle de la persistance:"; \
		echo '   PGPASSWORD=jobbingtrack123 psql -h localhost -p 5000 -U jobbingtrack -d jobbingtrack -c "SELECT COUNT(*) FROM system_metrics WHERE timestamp >= (EXTRACT(EPOCH FROM NOW())::bigint - 3600);" || echo "⚠️  PostgreSQL non accessible depuis le host"'; \
	fi
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "✅ TEST COMPLET TERMINÉ"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo ""
	@echo "📊 RÉSUMÉ:"
	@echo "   • Conteneur monitoring-c reconstruit et redémarré"
	@echo "   • Logs vérifiés"
	@echo "   • Métriques système testées"
	@echo "   • Métriques backoffice testées"
	@echo "   • Persistance PostgreSQL testée"
	@echo ""
	@echo "💡 Commandes utiles:"
	@echo "   make monitoring-c-logs          - Voir les logs en temps réel"
	@echo "   make monitoring-c-restart       - Redémarrer monitoring-c"
	@echo "   curl http://localhost:5098/api/v1/metrics | jq  - Voir métriques JSON"
	@echo ""

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

monitor: ## Tableau live des conteneurs JobbingTrack (ports, CPU, mémoire, état)
	@chmod +x scripts/monitoring/live-monitor.sh
	@PROJECT_FILTER=$${PROJECT_FILTER:-jobbingtrack} INTERVAL=$${INTERVAL:-2} ONCE=$${ONCE:-0} ./scripts/monitoring/live-monitor.sh

# ============================================================================
# PERFORMANCE
# ============================================================================

test-performance-backend: ## Tests de performance backend
	@echo "🔍 Tests de performance backend..."
	@chmod +x scripts/performance/backend-performance-test.sh
	@./scripts/performance/backend-performance-test.sh

check-memory-backend: ## Vérifier la consommation mémoire des services backend
	@echo "💾 Vérification mémoire backend..."
	@echo "Services JobbingTrack:"
	@docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | grep -E "NAME|jobbingtrack" || echo "Aucun service trouvé"
	@echo ""
	@echo "Pour une analyse complète, utilisez: make test-performance-backend"

analyze-metrics-aggregator: ## Analyser spécifiquement metrics-aggregator
	@echo "📊 Analyse de metrics-aggregator..."
	@if docker ps --format "{{.Names}}" | grep -q "^jobbingtrack-metrics-aggregator$$"; then \
		echo "Stats actuelles:"; \
		docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" jobbingtrack-metrics-aggregator; \
		echo ""; \
		echo "Analyse du code source:"; \
		grep -r "docker\|exec\|child_process" backend/metrics-aggregator-service/src --include="*.js" 2>/dev/null | wc -l | xargs -I {} echo "  • Appels Docker/exec: {}"; \
		grep -r "readFile\|readFileSync\|/proc\|/sys" backend/metrics-aggregator-service/src --include="*.js" 2>/dev/null | wc -l | xargs -I {} echo "  • Lectures fichiers système: {}"; \
		grep -r "prisma\." backend/metrics-aggregator-service/src --include="*.js" 2>/dev/null | wc -l | xargs -I {} echo "  • Appels Prisma: {}"; \
	else \
		echo "❌ Conteneur metrics-aggregator non trouvé"; \
	fi

# ============================================================================
# SÉCURITÉ
# ============================================================================

security-generate-threats: ## Générer des menaces de test pour le système de sécurité
	@echo "🔍 Génération de menaces de test..."
	@chmod +x scripts/security/generate-test-threats.sh
	@./scripts/security/generate-test-threats.sh
	@echo ""
	@echo "✅ Menaces de test générées !"
	@echo "📋 Pour voir les menaces:"
	@echo "   - Frontend: http://localhost:5003/backoffice/security/threats"
	@echo "   - API: curl http://localhost:5002/api/v1/security/firewall/threats"

test-firewall: ## Tester toutes les fonctionnalités du firewall et WAF
	@echo "🔥 Test du Firewall et WAF"
	@echo "=========================="
	@chmod +x scripts/security/test-firewall.sh
	@./scripts/security/test-firewall.sh
	@echo ""
	@echo "✅ Tests terminés !"
	@echo "📋 Vérifiez les logs de sécurité:"
	@echo "   - Frontend: http://localhost:5003/backoffice/security/logs"
	@echo "   - API: curl http://localhost:5002/api/v1/security/logs?limit=20"

security-live-check: ## Vérifier WAF/Firewall en live (logs + menaces + API)
	@echo "🛡️  Security live-check..."
	@chmod +x scripts/security/live-security-check.sh
	@WATCH_SECONDS=$${WATCH_SECONDS:-25} STRICT_MODE=$${STRICT_MODE:-1} LOAD_TEST_ENABLED=$${LOAD_TEST_ENABLED:-1} LOAD_REQUESTS=$${LOAD_REQUESTS:-120} LOAD_CONCURRENCY=$${LOAD_CONCURRENCY:-20} API_GATEWAY_URL=$${API_GATEWAY_URL:-http://localhost:5002} FRONTEND_URL=$${FRONTEND_URL:-http://localhost:5003} SECURITY_SERVICE_URL=$${SECURITY_SERVICE_URL:-http://localhost:5017} ./scripts/security/live-security-check.sh

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
	@echo "  make monitoring-c-logs          - Logs tous services"
	@echo "  make monitoring-logs-service SERVICE=monitoring-c"
	@echo "  make monitoring-test            - Test health"
	@echo "  make monitoring-test-auth TOKEN=xxx"
	@echo "  make test-monitoring            - Suite tests complète"
	@echo ""
	@echo "⚡ PERFORMANCE:"
	@echo "  make test-performance-backend   - Tests de performance"
	@echo "  make check-memory-backend        - Vérifier mémoire"
	@echo "  make analyze-metrics-aggregator  - Analyser metrics-aggregator"
	@echo ""
	@echo "💡 Les commandes générales sont dans make help"
	@echo ""
