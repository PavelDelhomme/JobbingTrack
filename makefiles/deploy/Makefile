# ============================================================================
# Environnements multi-stack (local / préprod / prod compose)
# Wrappers scripts/deploy/stack-env.sh — ne remplacent pas Portainer VPS.
# ============================================================================

.PHONY: init up-preprod up-prod down-preprod down-prod \
	status-preprod status-prod logs-preprod logs-prod \
	check-preprod check-prod config-preprod config-prod \
	upgrade-to-dev upgrade-to-preprod upgrade-to-prod \
	env-help stack-env-help

init: ## Initialise .env local (+ rappel préprod/prod). Alias bootstrap env.
	@bash "$(ROOT_DIR)/scripts/deploy/stack-env.sh" local init
	@echo ""
	@echo "Préprod : make check-preprod  (après make init-preprod)"
	@echo "Prod    : make check-prod     (après make init-prod)"
	@echo "Doc     : docs/production/PORTEUR_ACTIONS_DEPLOIEMENT.md"

init-preprod: ## Crée deploy/production/.env.preprod depuis .env.example (sans écraser)
	@bash "$(ROOT_DIR)/scripts/deploy/stack-env.sh" preprod init

init-prod: ## Crée deploy/production/.env.prod depuis .env.example (sans écraser)
	@bash "$(ROOT_DIR)/scripts/deploy/stack-env.sh" prod init

check-preprod: ## Vérifie clés obligatoires .env.preprod
	@bash "$(ROOT_DIR)/scripts/deploy/stack-env.sh" preprod check

check-prod: ## Vérifie clés obligatoires .env.prod
	@bash "$(ROOT_DIR)/scripts/deploy/stack-env.sh" prod check

config-preprod: ## Valide docker compose préprod (config)
	@bash "$(ROOT_DIR)/scripts/deploy/stack-env.sh" preprod config

config-prod: ## Valide docker compose prod (config)
	@bash "$(ROOT_DIR)/scripts/deploy/stack-env.sh" prod config

up-preprod: ## Démarre stack compose préprod (deploy/production, project jobbingtrack-preprod)
	@bash "$(ROOT_DIR)/scripts/deploy/stack-env.sh" preprod up

up-prod: ## Démarre stack compose prod locale (ATTENTION ≠ Portainer VPS)
	@bash "$(ROOT_DIR)/scripts/deploy/stack-env.sh" prod up

down-preprod: ## Arrête stack préprod compose
	@bash "$(ROOT_DIR)/scripts/deploy/stack-env.sh" preprod down

down-prod: ## Arrête stack prod compose
	@bash "$(ROOT_DIR)/scripts/deploy/stack-env.sh" prod down

status-preprod: ## Statut conteneurs préprod
	@bash "$(ROOT_DIR)/scripts/deploy/stack-env.sh" preprod status

status-prod: ## Statut conteneurs prod compose
	@bash "$(ROOT_DIR)/scripts/deploy/stack-env.sh" prod status

logs-preprod: ## Logs préprod (suivi)
	@bash "$(ROOT_DIR)/scripts/deploy/stack-env.sh" preprod logs

logs-prod: ## Logs prod compose (suivi)
	@bash "$(ROOT_DIR)/scripts/deploy/stack-env.sh" prod logs

# --- Bascules de mode (local) ---

upgrade-to-dev: ## Repasse en mode local full (up-full) — écrit .jobbingtrack-stack-mode=local
	@echo "→ Mode local / up-full"
	@$(MAKE) up-full
	@printf '%s\n' local > "$(ROOT_DIR)/.jobbingtrack-stack-mode"
	@echo "OK — mode local. status: make status · watch: make status-watch"

upgrade-to-preprod: ## init+check+up préprod compose (ou rappel Portainer si VPS)
	@echo "→ Préprod compose locale (pour VPS : Portainer + PORTEUR_ACTIONS_DEPLOIEMENT.md)"
	@bash "$(ROOT_DIR)/scripts/deploy/stack-env.sh" preprod init
	@bash "$(ROOT_DIR)/scripts/deploy/stack-env.sh" preprod check || true
	@bash "$(ROOT_DIR)/scripts/deploy/stack-env.sh" preprod config
	@bash "$(ROOT_DIR)/scripts/deploy/stack-env.sh" preprod up
	@echo "OK préprod. Logs: make logs-preprod · Status: make status-preprod"

upgrade-to-prod: ## Garde-fou : n'auto-déploie PAS la prod VPS — guide checklist
	@echo "╔══════════════════════════════════════════════════════════╗"
	@echo "║  upgrade-to-prod = PAS un déploiement VPS automatique   ║"
	@echo "╚══════════════════════════════════════════════════════════╝"
	@echo "1. Checklist : docs/production/PORTEUR_ACTIONS_DEPLOIEMENT.md"
	@echo "2. Gate      : docs/production/A_VALIDER_AVANT_PRODUCTION.md"
	@echo "3. Portainer : stack Git deploy/production/docker-compose.yml"
	@echo "4. NPM       : HTTPS api.* + app.*"
	@echo "5. Option    : make check-prod && make config-prod (compose local)"
	@echo "Pour un up compose local de test : make up-prod (après make init-prod)"
	@exit 0

env-help stack-env-help: ## Aide environnements local/préprod/prod
	@bash "$(ROOT_DIR)/scripts/deploy/stack-env.sh" help
	@echo ""
	@echo "Cibles Make :"
	@echo "  make init | init-preprod | init-prod"
	@echo "  make up / up-full / up-dev / logs / status / status-watch  (local)"
	@echo "  make up-preprod | up-prod | down-preprod | down-prod"
	@echo "  make status-preprod | logs-preprod | check-preprod | config-preprod"
	@echo "  make upgrade-to-dev | upgrade-to-preprod | upgrade-to-prod"
