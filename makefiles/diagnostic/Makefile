# ============================================================================
# Makefile Diagnostic - JobbingTrack
# ============================================================================
# Diagnostics, vérifications et corrections automatiques
# ============================================================================

.PHONY: health check-deps show-docker-info clean-docker-cache cors-fix cors-fix-auto diagnostic diagnostic-docker diagnostic-docker-compose diagnostic-cors diagnostic-network diagnostic-fix docker-compose-fix diag-services help-diagnostic

# ============================================================================
# AIDE
# ============================================================================

help-diagnostic: ## Afficher l'aide diagnostic
	@echo "================================================================"
	@echo "🔍 DIAGNOSTIC - Commandes disponibles"
	@echo "================================================================"
	@echo ""
	@echo "💚 SANTÉ & VÉRIFICATIONS:"
	@echo "  make health                - Vérifier santé de tous les services"
	@echo "  make check-deps            - Vérifier dépendances (Docker, etc.)"
	@echo "  make show-docker-info      - Afficher infos Docker"
	@echo ""
	@echo "🔧 DIAGNOSTICS SPÉCIALISÉS:"
	@echo "  make diagnostic            - Diagnostic complet système"
	@echo "  make diagnostic-docker     - Diagnostic Docker uniquement"
	@echo "  make diagnostic-cors       - Diagnostic CORS"
	@echo "  make diagnostic-network    - Diagnostic réseau"
	@echo "  make diag-services         - Diagnostic services backend"
	@echo ""
	@echo "🔧 CORRECTIONS AUTOMATIQUES:"
	@echo "  make diagnostic-fix        - Correction automatique complète"
	@echo "  make cors-fix              - Corriger problèmes CORS"
	@echo "  make cors-fix-auto         - Correction CORS automatique"
	@echo "  make docker-compose-fix    - Corriger Docker Compose"
	@echo "  make clean-docker-cache    - Nettoyer cache Docker"
	@echo ""
	@echo "💡 EXEMPLES:"
	@echo "  make health && make diagnostic    # Santé + Diagnostic"
	@echo "  make diagnostic-fix               # Correction auto"
	@echo ""
	@echo "📖 Documentation: docs/troubleshooting/guide.md"
	@echo ""

# ============================================================================
# VÉRIFICATIONS SANTÉ
# ============================================================================

# Vérification de santé complète
health: ## Vérifie la santé de tous les services
	@echo "💚 Vérification complète de la santé du système"
	@echo "=============================================="
	./scripts/core/check.sh --detailed

# Vérifier les dépendances
check-deps: ## Vérifier que toutes les dépendances sont installées
	@echo "🔍 Vérification des dépendances..."
	@echo "📦 Vérification de Docker..."
	@if ! command -v docker &>/dev/null 2>&1; then \
		echo "❌ Docker n'est pas installé ou pas dans le PATH"; \
		echo "💡 Installez Docker: https://docs.docker.com/get-docker/"; \
		exit 1; \
	fi
	@echo "✅ Docker trouvé: $$(docker --version)"
	@echo "📦 Vérification de Docker Compose..."
	@if command -v docker-compose &>/dev/null 2>&1 && docker-compose version &>/dev/null 2>&1; then \
		echo "✅ docker-compose standalone: $$(docker-compose --version)"; \
	elif docker compose version &>/dev/null 2>&1; then \
		echo "✅ docker compose plugin: $$(docker compose version)"; \
	elif [ -x "/usr/bin/docker-compose" ] && /usr/bin/docker-compose version &>/dev/null 2>&1; then \
		echo "✅ docker-compose dans /usr/bin: $$(/usr/bin/docker-compose --version)"; \
	elif [ -x "/usr/local/bin/docker-compose" ] && /usr/local/bin/docker-compose version &>/dev/null 2>&1; then \
		echo "✅ docker-compose dans /usr/local/bin: $$(/usr/local/bin/docker-compose --version)"; \
	else \
		echo "❌ Docker Compose n'est pas disponible"; \
		echo ""; \
		echo "📋 Installation recommandée :"; \
		echo ""; \
		echo "Option 1 - Installation standalone :"; \
		echo "  sudo curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$$(uname -s)-\$$(uname -m)\" -o /usr/local/bin/docker-compose"; \
		echo "  sudo chmod +x /usr/local/bin/docker-compose"; \
		echo ""; \
		echo "Option 2 - Installation via package manager :"; \
		echo "  # Ubuntu/Debian:"; \
		echo "  sudo apt-get update"; \
		echo "  sudo apt-get install docker-compose-plugin"; \
		echo ""; \
		echo "  # CentOS/RHEL/Fedora:"; \
		echo "  sudo dnf install docker-compose"; \
		echo ""; \
		echo "Option 3 - Utiliser Docker Desktop (recommandé):"; \
		echo "  https://docs.docker.com/desktop/"; \
		echo ""; \
		echo "💡 Après installation, relancez la commande"; \
		exit 1; \
	fi
	@echo "✅ Toutes les dépendances sont installées"

# ============================================================================
# INFORMATIONS DOCKER
# ============================================================================

# Afficher informations Docker
show-docker-info: ## Affiche les informations Docker et Docker Compose détectées
	@echo "🐳 Informations Docker détectées"
	@echo "================================"
	@echo "Commande Docker Compose: $(DOCKER_COMPOSE_CMD)"
	@if [ -f "/tmp/jobbingtrack_docker_compose_cache" ]; then \
		echo "Cache: $$(cat /tmp/jobbingtrack_docker_compose_cache)"; \
	else \
		echo "Cache: Non encore créé (sera créé au premier make up)"; \
	fi
	@echo ""
	@echo "🔍 Test des commandes:"
	@if command -v docker &>/dev/null 2>&1; then \
		echo "✅ docker: $(shell docker --version | head -1)"; \
	else \
		echo "❌ docker: Non installé"; \
	fi
	@if command -v docker-compose &>/dev/null 2>&1 && docker-compose version &>/dev/null 2>&1; then \
		echo "✅ docker-compose: $(shell docker-compose --version)"; \
	else \
		echo "❌ docker-compose: Non fonctionnel"; \
	fi
	@if docker compose version &>/dev/null 2>&1; then \
		echo "✅ docker compose: Plugin disponible"; \
	else \
		echo "❌ docker compose: Non disponible"; \
	fi

# Nettoyer cache Docker Compose
clean-docker-cache: ## Nettoie le cache Docker Compose et force une redétection
	@echo "🧹 Nettoyage du cache Docker Compose..."
	$(call clean_docker_compose_cache)
	@echo "🔄 Recréation du cache..."
	@$(shell \
		if command -v docker-compose &>/dev/null 2>&1 && timeout 10 docker-compose version &>/dev/null 2>&1; then \
			echo "docker-compose" > /tmp/jobbingtrack_docker_compose_cache; \
		elif timeout 10 docker compose version &>/dev/null 2>&1; then \
			echo "docker compose" > /tmp/jobbingtrack_docker_compose_cache; \
		elif [ -x "/usr/bin/docker-compose" ] && timeout 10 /usr/bin/docker-compose version &>/dev/null 2>&1; then \
			echo "/usr/bin/docker-compose" > /tmp/jobbingtrack_docker_compose_cache; \
		elif [ -x "/usr/local/bin/docker-compose" ] && timeout 10 /usr/local/bin/docker-compose version &>/dev/null 2>&1; then \
			echo "/usr/local/bin/docker-compose" > /tmp/jobbingtrack_docker_compose_cache; \
		elif [ -x "/opt/bin/docker-compose" ] && timeout 10 /opt/bin/docker-compose version &>/dev/null 2>&1; then \
			echo "/opt/bin/docker-compose" > /tmp/jobbingtrack_docker_compose_cache; \
		elif [ -x "/snap/bin/docker-compose" ] && timeout 10 /snap/bin/docker-compose version &>/dev/null 2>&1; then \
			echo "/snap/bin/docker-compose" > /tmp/jobbingtrack_docker_compose_cache; \
		else \
			echo "docker-compose" > /tmp/jobbingtrack_docker_compose_cache; \
		fi \
	)
	@echo "✅ Cache nettoyé et recréé"

# ============================================================================
# CORRECTIONS CORS
# ============================================================================

# Correction CORS interactive
cors-fix: ## Diagnostiquer et corriger automatiquement les problèmes CORS
	@echo "🔧 Correction CORS interactive..."
	./scripts/utils/cors-diagnostic.sh

# Correction CORS automatique
cors-fix-auto: ## Corriger automatiquement les problèmes CORS sans confirmation
	@echo "🔧 Correction CORS automatique..."
	./scripts/utils/cors-fix-direct.sh

# ============================================================================
# DIAGNOSTICS CENTRALISÉS
# ============================================================================

# Diagnostic complet
diagnostic: ## Diagnostic complet et interactif de tous les problèmes système
	@echo "🔍 Diagnostic complet du système..."
	./scripts/utils/diagnostic.sh

# Diagnostic Docker
diagnostic-docker: ## Diagnostic Docker uniquement
	@echo "🐳 Diagnostic Docker..."
	./scripts/utils/diagnostic.sh --docker

# Diagnostic Docker Compose
diagnostic-docker-compose: ## Diagnostic Docker Compose uniquement
	@echo "🐳 Diagnostic Docker Compose..."
	./scripts/utils/diagnostic.sh --docker-compose

# Diagnostic CORS
diagnostic-cors: ## Diagnostic CORS uniquement
	@echo "🌐 Diagnostic CORS..."
	./scripts/utils/diagnostic.sh --cors

# Diagnostic réseau
diagnostic-network: ## Diagnostic réseau et ports uniquement
	@echo "🌐 Diagnostic réseau et ports..."
	./scripts/utils/diagnostic.sh --network

# Correction automatique complète
diagnostic-fix: ## Diagnostic et correction automatique de tous les problèmes
	@echo "🔧 Diagnostic et correction automatique..."
	./scripts/utils/diagnostic.sh --auto-fix

# Correction Docker Compose
docker-compose-fix: ## Diagnostiquer et corriger automatiquement Docker Compose
	@echo "🔧 Correction Docker Compose..."
	./scripts/utils/docker-compose-fix.sh

# ============================================================================
# DIAGNOSTIC DÉTAILLÉ DES SERVICES
# ============================================================================

# Diagnostic services
diag-services: ## Diagnostic détaillé des services Docker en cours
	@echo "🔍 DIAGNOSTIC DÉTAILLÉ DES SERVICES"
	@echo "==================================="
	@echo ""
	@echo "🔴 Services essentiels:"
	@docker ps --filter "name=jobbingtrack" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}" 2>/dev/null | grep -E "postgres|redis|api-gateway|frontend|auth-service|dashboard-service" || echo "  Aucun service essentiel en cours"
	@echo ""
	@echo "🟡 Services optionnels:"
	@docker ps --filter "name=jobbingtrack" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}" 2>/dev/null | grep -v -E "postgres|redis|api-gateway|frontend|auth-service|dashboard-service" || echo "  Aucun service optionnel en cours"
	@echo ""
	@echo "📋 Vérification des logs d'erreur (dernières 10 lignes):"
	@echo "API Gateway:"
	@docker logs --tail 10 jobbingtrack-api-gateway 2>/dev/null | head -5 || echo "  API Gateway non démarré ou logs indisponibles"
	@echo ""
	@echo "Frontend:"
	@docker logs --tail 10 jobbingtrack-frontend 2>/dev/null | head -5 || echo "  Frontend non démarré ou logs indisponibles"
	@echo ""
	@echo "📝 Commandes de diagnostic disponibles:"
	@echo "  make diagnostic              # Diagnostic complet interactif"
	@echo "  make diagnostic-docker       # Docker uniquement"
	@echo "  make diagnostic-cors         # CORS uniquement"
	@echo "  make diagnostic-fix          # Correction automatique"
	@echo "  make logs                    # Logs en temps réel"
	@echo "  make status                  # Statut des services"
