# ============================================
# Makefile - Documentation et génération PDF
# ============================================

.PHONY: help-documentation docs-pdf-all docs-pdf docs-pdf-clean docs-pdf-check

## === AIDE DOCUMENTATION ===
help-documentation: ## Afficher l'aide pour la documentation
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)"
	@echo "$(YELLOW)📚 DOCUMENTATION - Génération et gestion de la documentation$(RESET)"
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)"
	@echo ""
	@echo "$(CYAN)📄 Génération PDF :$(RESET)"
	@echo "  $(GREEN)make docs-pdf-all$(RESET)           - Générer tous les PDFs (unitaires + global)"
	@echo "  $(GREEN)make docs-pdf$(RESET)               - Générer un PDF spécifique (path=chemin/vers/fichier.md)"
	@echo "  $(GREEN)make docs-pdf-clean$(RESET)         - Nettoyer tous les PDFs générés"
	@echo "  $(GREEN)make docs-pdf-check$(RESET)         - Vérifier les dépendances PDF"
	@echo ""
	@echo "$(CYAN)📖 Exemples :$(RESET)"
	@echo "  make docs-pdf-all                              # Générer tous les PDFs"
	@echo "  make docs-pdf path=docs/api/api-reference/README.md  # PDF d'un fichier spécifique"
	@echo "  make docs-pdf-clean                            # Supprimer tous les PDFs"
	@echo ""
	@echo "$(YELLOW)💡 Note :$(RESET) La génération PDF nécessite Node.js et les dépendances npm (puppeteer)"
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)"

## === GÉNÉRATION PDF ===

docs-pdf-check: ## Vérifier les dépendances pour la génération PDF
	@echo "$(CYAN)🔍 Vérification des dépendances PDF...$(RESET)"
	@if ! command -v node &> /dev/null; then \
		echo "$(RED)❌ Node.js n'est pas installé$(RESET)"; \
		echo "$(YELLOW)Installez Node.js : https://nodejs.org$(RESET)"; \
		exit 1; \
	fi
	@echo "$(GREEN)✅ Node.js trouvé : $$(node --version)$(RESET)"
	@if [ ! -d "node_modules" ]; then \
		echo "$(YELLOW)⚠️  node_modules manquant - exécutez 'npm install'$(RESET)"; \
	else \
		echo "$(GREEN)✅ node_modules présent$(RESET)"; \
	fi
	@if [ ! -f "docs/generate-pdfs.js" ]; then \
		echo "$(RED)❌ Script generate-pdfs.js manquant$(RESET)"; \
		exit 1; \
	fi
	@echo "$(GREEN)✅ Script de génération PDF trouvé$(RESET)"

docs-pdf-all: docs-pdf-check ## Générer tous les PDFs (unitaires + global)
	@echo "$(CYAN)📄 Génération de tous les PDFs...$(RESET)"
	@echo "$(YELLOW)⏳ Cela peut prendre quelques minutes...$(RESET)"
	@cd docs && node generate-pdfs.js
	@echo "$(GREEN)✅ Tous les PDFs générés avec succès !$(RESET)"
	@echo "$(CYAN)📁 PDFs disponibles dans : docs/pdfs/$(RESET)"
	@ls -lh docs/pdfs/*.pdf 2>/dev/null || true
	@echo ""
	@echo "$(GREEN)✅ PDF global : docs/pdfs/documentation-complete.pdf$(RESET)"

docs-pdf: docs-pdf-check ## Générer un PDF spécifique (usage: make docs-pdf path=docs/xxx/README.md)
	@if [ -z "$(path)" ]; then \
		echo "$(RED)❌ Erreur : paramètre 'path' requis$(RESET)"; \
		echo "$(YELLOW)Usage : make docs-pdf path=docs/api/api-reference/README.md$(RESET)"; \
		exit 1; \
	fi
	@if [ ! -f "$(path)" ]; then \
		echo "$(RED)❌ Fichier introuvable : $(path)$(RESET)"; \
		exit 1; \
	fi
	@echo "$(CYAN)📄 Génération PDF pour : $(path)$(RESET)"
	@cd docs && node generate-pdfs.js "$(path)"
	@echo "$(GREEN)✅ PDF généré avec succès !$(RESET)"

docs-pdf-clean: ## Nettoyer tous les PDFs générés
	@echo "$(CYAN)🧹 Nettoyage des PDFs...$(RESET)"
	@if [ -d "docs/pdfs" ]; then \
		rm -rf docs/pdfs/*.pdf; \
		rm -rf docs/pdfs/**/*.pdf; \
		echo "$(GREEN)✅ PDFs supprimés$(RESET)"; \
	else \
		echo "$(YELLOW)⚠️  Dossier pdfs/ introuvable$(RESET)"; \
	fi

## === RACCOURCIS ===
pdf: docs-pdf-all ## Raccourci pour docs-pdf-all
pdf-clean: docs-pdf-clean ## Raccourci pour docs-pdf-clean
