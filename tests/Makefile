# Makefile pour Tests Automatisés JobbingTrack
# tests/Makefile

.PHONY: help test-all test-auth test-applications test-workflow test-companies test-contacts clean-test setup-test

# Couleurs
GREEN := \033[0;32m
RED := \033[0;31m
YELLOW := \033[1;33m
BLUE := \033[0;34m
NC := \033[0m

# Configuration
API_GATEWAY := http://localhost:3000
TEST_EMAIL := dumb@example.invalid
TEST_PASSWORD := TestPassword123!
TEST_DIR := $(shell pwd)

# Aide
help:
	@echo "$(BLUE)🧪 Tests Automatisés JobbingTrack$(NC)"
	@echo "=================================="
	@echo ""
	@echo "  $(GREEN)test-all$(NC)          - Suite complète de tests automatisés"
	@echo "  $(GREEN)test-workflow$(NC)     - Tests workflow utilisateur complet"
	@echo "  $(GREEN)test-auth$(NC)         - Tests authentification (inscription/connexion)"
	@echo "  $(GREEN)test-applications$(NC) - Tests candidatures + auto-création entreprises"
	@echo "  $(GREEN)test-companies$(NC)    - Tests gestion entreprises"
	@echo "  $(GREEN)test-contacts$(NC)     - Tests gestion contacts"
	@echo ""
	@echo "  $(YELLOW)clean-test$(NC)        - Nettoyage données de test"
	@echo "  $(YELLOW)setup-test$(NC)        - Préparation environnement de test"
	@echo ""
	@echo "$(BLUE)Email de test configuré: $(TEST_EMAIL)$(NC)"

# ===== TESTS PRINCIPAUX =====

# Suite complète de tests automatisés
test-all: setup-test clean-test test-auth test-applications test-workflow
	@echo ""
	@echo "$(GREEN)🎉 TOUS LES TESTS AUTOMATISÉS SONT PASSÉS !$(NC)"
	@echo "============================================="
	@echo "✅ Infrastructure opérationnelle"
	@echo "✅ Authentification fonctionnelle"
	@echo "✅ Candidatures avec auto-création entreprises"
	@echo "✅ Workflow utilisateur complet"
	@echo ""
	@echo "$(BLUE)📊 Email de test: $(TEST_EMAIL)$(NC)"
	@echo "$(BLUE)🔗 API Gateway: $(API_GATEWAY)$(NC)"

# Tests workflow utilisateur complet
test-workflow: setup-test
	@echo "$(BLUE)📝 Tests workflow utilisateur complet...$(NC)"
	@./automated-tests.sh || (echo "$(RED)❌ Échec workflow$(NC)" && exit 1)
	@echo "$(GREEN)✅ Workflow utilisateur validé$(NC)"

# Tests authentification
test-auth: setup-test
	@echo "$(BLUE)🔐 Tests authentification...$(NC)"
	@./auth-tests.sh $(TEST_EMAIL) $(TEST_PASSWORD) || (echo "$(RED)❌ Échec authentification$(NC)" && exit 1)
	@echo "$(GREEN)✅ Authentification validée$(NC)"

# Tests candidatures + auto-création entreprises
test-applications: setup-test test-auth
	@echo "$(BLUE)📋 Tests candidatures + auto-création entreprises...$(NC)"
	@TOKEN=$$(./auth-tests.sh $(TEST_EMAIL) $(TEST_PASSWORD) --get-token 2>/dev/null) && \
	./application-tests.sh "$$TOKEN" || (echo "$(RED)❌ Échec candidatures$(NC)" && exit 1)
	@echo "$(GREEN)✅ Candidatures + auto-création entreprises validées$(NC)"

# Tests gestion entreprises
test-companies: setup-test test-auth
	@echo "$(BLUE)🏢 Tests gestion entreprises...$(NC)"
	@TOKEN=$$(./auth-tests.sh $(TEST_EMAIL) $(TEST_PASSWORD) --get-token 2>/dev/null) && \
	./company-tests.sh "$$TOKEN" || (echo "$(RED)❌ Échec entreprises$(NC)" && exit 1)
	@echo "$(GREEN)✅ Gestion entreprises validée$(NC)"

# Tests gestion contacts
test-contacts: setup-test test-auth
	@echo "$(BLUE)👥 Tests gestion contacts...$(NC)"
	@TOKEN=$$(./auth-tests.sh $(TEST_EMAIL) $(TEST_PASSWORD) --get-token 2>/dev/null) && \
	./contact-tests.sh "$$TOKEN" || (echo "$(RED)❌ Échec contacts$(NC)" && exit 1)
	@echo "$(GREEN)✅ Gestion contacts validée$(NC)"

# ===== UTILITAIRES =====

# Préparation environnement de test
setup-test:
	@echo "$(BLUE)🔧 Préparation environnement de test...$(NC)"
	@chmod +x *.sh 2>/dev/null || true
	@# Vérifier que l'API Gateway est accessible
	@curl -s $(API_GATEWAY)/health > /dev/null || \
		(echo "$(RED)❌ API Gateway non accessible sur $(API_GATEWAY)$(NC)" && \
		 echo "$(YELLOW)💡 Démarrez le backend avec: cd ../backend && make up$(NC)" && exit 1)
	@echo "$(GREEN)✅ Environnement de test prêt$(NC)"

# Nettoyage données de test
clean-test:
	@echo "$(BLUE)🧹 Nettoyage données de test...$(NC)"
	@./cleanup.sh || echo "$(YELLOW)⚠️ Nettoyage partiel - continuons$(NC)"
	@echo "$(GREEN)✅ Nettoyage terminé$(NC)"

# ===== TESTS INDIVIDUELS AVANCÉS =====

# Test inscription seule
test-register:
	@echo "$(BLUE)📝 Test inscription seule...$(NC)"
	@curl -s -X POST $(API_GATEWAY)/api/v1/auth/register \
		-H "Content-Type: application/json" \
		-d '{"email":"$(TEST_EMAIL)","password":"$(TEST_PASSWORD)","firstName":"Test","lastName":"User"}' \
		| grep -q "success\|token\|message" && echo "$(GREEN)✅ Inscription OK$(NC)" || echo "$(RED)❌ Inscription KO$(NC)"

# Test connexion seule
test-login:
	@echo "$(BLUE)🔑 Test connexion seule...$(NC)"
	@curl -s -X POST $(API_GATEWAY)/api/v1/auth/login \
		-H "Content-Type: application/json" \
		-d '{"email":"$(TEST_EMAIL)","password":"$(TEST_PASSWORD)"}' \
		| grep -q "token" && echo "$(GREEN)✅ Connexion OK$(NC)" || echo "$(RED)❌ Connexion KO$(NC)"

# Test création candidature Google
test-google-application:
	@echo "$(BLUE)🔍 Test création candidature Google...$(NC)"
	@TOKEN=$$(./auth-tests.sh $(TEST_EMAIL) $(TEST_PASSWORD) --get-token 2>/dev/null) && \
	curl -s -X POST $(API_GATEWAY)/api/v1/applications \
		-H "Content-Type: application/json" \
		-H "Authorization: Bearer $$TOKEN" \
		-d '{"companyName":"Google","position":"Software Engineer","type":"FULL_TIME","status":"DRAFT"}' \
		| grep -q "success\|id" && echo "$(GREEN)✅ Candidature Google créée$(NC)" || echo "$(RED)❌ Candidature Google échouée$(NC)"

# ===== DIAGNOSTICS =====

# Diagnostic complet
diagnostic:
	@echo "$(BLUE)🔍 Diagnostic environnement...$(NC)"
	@echo "API Gateway: $(API_GATEWAY)"
	@echo "Email test: $(TEST_EMAIL)"
	@echo "Dossier tests: $(TEST_DIR)"
	@echo ""
	@echo "Vérification services:"
	@curl -s $(API_GATEWAY)/health | head -c 100 || echo "❌ API Gateway inaccessible"
	@echo ""
	@echo "Scripts disponibles:"
	@ls -la *.sh 2>/dev/null || echo "❌ Aucun script trouvé"

# ===== TESTS DE PERFORMANCE =====

# Tests de charge sur authentification
test-load-auth:
	@echo "$(BLUE)⚡ Tests de charge authentification...$(NC)"
	@for i in {1..10}; do \
		echo "Test $$i/10..."; \
		$(MAKE) test-login > /dev/null 2>&1 || echo "Échec $$i"; \
	done
	@echo "$(GREEN)✅ Tests de charge terminés$(NC)"

# ===== AIDE DÉVELOPPEUR =====

# Afficher le token actuel
show-token:
	@echo "$(BLUE)🔑 Token utilisateur actuel:$(NC)"
	@./auth-tests.sh $(TEST_EMAIL) $(TEST_PASSWORD) --get-token 2>/dev/null || echo "$(RED)❌ Impossible de récupérer le token$(NC)"

# Lister les candidatures actuelles
list-applications:
	@echo "$(BLUE)📋 Candidatures actuelles:$(NC)"
	@TOKEN=$$(./auth-tests.sh $(TEST_EMAIL) $(TEST_PASSWORD) --get-token 2>/dev/null) && \
	curl -s -H "Authorization: Bearer $$TOKEN" $(API_GATEWAY)/api/v1/applications || echo "$(RED)❌ Impossible de lister$(NC)"

# Lister les entreprises actuelles
list-companies:
	@echo "$(BLUE)🏢 Entreprises actuelles:$(NC)"
	@TOKEN=$$(./auth-tests.sh $(TEST_EMAIL) $(TEST_PASSWORD) --get-token 2>/dev/null) && \
	curl -s -H "Authorization: Bearer $$TOKEN" $(API_GATEWAY)/api/v1/companies || echo "$(RED)❌ Impossible de lister$(NC)"