# ============================================================================
# Security audit commands - JobbingTrack
# ============================================================================

.PHONY: security-audit security-scan-secrets security-scan-images security-scan-ports \
        security-scan-jwt security-zap-active security-report

security-audit: ## Audit sécurité passif : secrets + CVE + ports compose prod (pas de scan actif)
	@echo "🔒 Audit sécurité passif JobbingTrack"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@make security-scan-secrets
	@make test-cve-scan
	@make security-scan-ports
	@make security-report

security-scan-secrets: ## Scan secrets Git via gitleaks/truffleHog si installés (historique complet)
	@cd "$(ROOT_DIR)" && PROJECT_ROOT="$(ROOT_DIR)" ./scripts/security/secrets-scan.sh

security-scan-images: ## Scan CVE images Docker locales via Trivy (CVE_SCAN_DOCKER=1)
	@cd "$(ROOT_DIR)" && PROJECT_ROOT="$(ROOT_DIR)" CVE_SCAN_DOCKER=1 CVE_SCAN_DOCKER_ALL_IMAGES=1 python3 scripts/security/cve-scan.py

security-scan-ports: ## Analyse exposition docker-compose.prod.yml + nmap si SECURITY_NMAP_TARGET est défini
	@cd "$(ROOT_DIR)" && PROJECT_ROOT="$(ROOT_DIR)" ./scripts/security/ports-scan.sh

security-scan-jwt: ## Audit JWT statique + jwt_tool si JWT_AUDIT_TOKEN est défini
	@cd "$(ROOT_DIR)" && PROJECT_ROOT="$(ROOT_DIR)" ./scripts/security/jwt-audit.sh

security-zap-active: ## OWASP ZAP active scan local/test. Requiert SECURITY_ACTIVE_SCAN=1
	@cd "$(ROOT_DIR)" && PROJECT_ROOT="$(ROOT_DIR)" ./scripts/security/zap-active-scan.sh

security-report: ## Affiche les derniers rapports sécurité générés
	@echo "📄 Rapports sécurité récents"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@if [ -d "$(ROOT_DIR)/reports/security" ]; then \
		find "$(ROOT_DIR)/reports/security" -maxdepth 2 -name summary.md -type f -printf '%T@ %p\n' 2>/dev/null | sort -nr | head -10 | cut -d' ' -f2-; \
		find "$(ROOT_DIR)/tests/results/security" -maxdepth 3 -name summary.md -type f -printf '%T@ %p\n' 2>/dev/null | sort -nr | head -10 | cut -d' ' -f2-; \
	else \
		echo "Aucun rapport dans reports/security"; \
	fi
