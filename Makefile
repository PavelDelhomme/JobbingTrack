# ============================================================================
# Makefile Principal - JobbingTrack
# ============================================================================
# Point d'entrée unique incluant tous les sous-Makefiles
# TOUTES les commandes des makefiles/* sont accessibles depuis la racine
# ============================================================================

# Définir variables globales
ROOT_DIR := $(shell pwd)
export ROOT_DIR

# Variables pour tous les sous-makefiles
export BACKEND_DIR := backend
export FRONTEND_DIR := frontend  
export SCRIPTS_DIR := scripts
export TESTS_DIR := tests
export MONITORING_DIR := monitoring

# ============================================================================
# INCLUDES - Tous les sous-Makefiles (ordre important!)
# ============================================================================

# 1. Fonctions communes (TOUJOURS en premier)
include makefiles/shared/common.mk

# 2. Makefiles par catégorie (ordre logique)
include makefiles/services/Makefile      # up, down, restart, profiles
include makefiles/diagnostic/Makefile    # health, diagnostics, corrections
include makefiles/database/Makefile      # db-*, environnements DB
include makefiles/compilation/Makefile   # build, rebuild, clean
include makefiles/tests/Makefile         # tous les tests
include makefiles/backend/Makefile       # monitoring uniquement
include makefiles/frontend/Makefile      # frontend spécifiques
include makefiles/utils/Makefile         # utils (metrics, cadvisor)
include makefiles/documentation/Makefile # génération PDF documentation
include makefiles/help/Makefile          # système d'aide

# ============================================================================
# COMMANDE PAR DÉFAUT
# ============================================================================

.DEFAULT_GOAL := help

# ============================================================================
# DOCUMENTATION INLINE
# ============================================================================
#
# 🎯 OBJECTIF:
#   Centraliser l'accès à TOUTES les commandes make depuis la racine
#
# 🔧 FONCTIONNEMENT:
#   - Ce Makefile n'a AUCUNE logique métier
#   - Il inclut simplement tous les sous-makefiles
#   - Toutes les commandes deviennent accessibles directement
#
# 📝 EXEMPLES D'USAGE:
#   make monitoring-up          # Défini dans makefiles/backend/Makefile
#   make test-monitoring        # Défini dans makefiles/backend/Makefile  
#   make up                     # Défini dans makefiles/Makefile
#   make dev-frontend           # Défini dans makefiles/frontend/Makefile
#
# ⚠️ CONFLITS DE NOMS:
#   Si plusieurs makefiles définissent la même target, la dernière incluse
#   écrase les précédentes. Pour éviter ça, utilisez des préfixes.
#
# ➕ AJOUTER DES COMMANDES:
#   1. Si backend      → éditer makefiles/backend/Makefile
#   2. Si frontend     → éditer makefiles/frontend/Makefile
#   3. Si général      → éditer makefiles/Makefile
#   4. Si fonction     → éditer makefiles/shared/common.mk
#
# ============================================================================
