#!/bin/bash

# ============================================
# Script de Réorganisation de la Documentation
# ============================================

set -e

echo "📚 Réorganisation de la documentation..."
echo ""

cd "$(dirname "$0")/.."

# Déplacer COMMANDES_MAKEFILE.md vers development/
if [ -f "docs/COMMANDES_MAKEFILE.md" ]; then
    mv "docs/COMMANDES_MAKEFILE.md" "docs/development/"
    echo "  ✅ COMMANDES_MAKEFILE.md → docs/development/"
fi

# Déplacer MONITORING_SETUP.md vers monitoring/
if [ -f "docs/MONITORING_SETUP.md" ]; then
    mv "docs/MONITORING_SETUP.md" "docs/monitoring/"
    echo "  ✅ MONITORING_SETUP.md → docs/monitoring/"
fi

# Déplacer METRICS_SETUP_COMPLETE.md vers monitoring/
if [ -f "docs/METRICS_SETUP_COMPLETE.md" ]; then
    mv "docs/METRICS_SETUP_COMPLETE.md" "docs/monitoring/"
    echo "  ✅ METRICS_SETUP_COMPLETE.md → docs/monitoring/"
fi

# Déplacer FRONTEND_REORGANIZATION.md vers frontend/
if [ -f "docs/FRONTEND_REORGANIZATION.md" ]; then
    mv "docs/FRONTEND_REORGANIZATION.md" "docs/frontend/"
    echo "  ✅ FRONTEND_REORGANIZATION.md → docs/frontend/"
fi

echo ""
echo "✅ Réorganisation terminée !"
echo ""
echo "📂 Structure mise à jour:"
echo "  docs/"
echo "  ├── GETTING_STARTED.md (nouveau)"
echo "  ├── README.md"
echo "  ├── navigation.md"
echo "  ├── development/"
echo "  │   └── COMMANDES_MAKEFILE.md"
echo "  ├── monitoring/"
echo "  │   ├── MONITORING_SETUP.md"
echo "  │   └── METRICS_SETUP_COMPLETE.md"
echo "  └── frontend/"
echo "      └── FRONTEND_REORGANIZATION.md"
