#!/bin/bash
# Script de vérification de l'intégration du monitoring

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Vérification Intégration Monitoring - JobbingTrack    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

success() { echo -e "${GREEN}✅ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# Compteurs
passed=0
failed=0

echo "📋 Vérification des fichiers..."
echo ""

# Vérifier script principal
if [ -x "scripts/monitoring/monitoring.sh" ]; then
    success "Script monitoring.sh existe et est exécutable"
    ((passed++))
else
    error "Script monitoring.sh manquant ou non exécutable"
    ((failed++))
fi

# Vérifier README
if [ -f "scripts/monitoring/README.md" ]; then
    success "README du script existe"
    ((passed++))
else
    warning "README du script manquant"
    ((failed++))
fi

# Vérifier Makefile utils
if grep -q "^mon:" makefiles/utils/Makefile 2>/dev/null; then
    success "Commandes mon-* ajoutées dans Makefile utils"
    ((passed++))
else
    error "Commandes mon-* manquantes dans Makefile utils"
    ((failed++))
fi

# Vérifier structure data
if [ -d "data/monitoring/history" ]; then
    success "Dossier data/monitoring/history existe"
    ((passed++))
else
    warning "Dossier data/monitoring/history manquant (sera créé au premier save)"
    ((passed++))
fi

# Vérifier documentation
if [ -f "MONITORING_COMMANDS.md" ]; then
    success "Documentation MONITORING_COMMANDS.md existe"
    ((passed++))
else
    error "Documentation MONITORING_COMMANDS.md manquante"
    ((failed++))
fi

if [ -f "INTEGRATION_MONITORING_RESUME.md" ]; then
    success "Documentation INTEGRATION_MONITORING_RESUME.md existe"
    ((passed++))
else
    error "Documentation INTEGRATION_MONITORING_RESUME.md manquante"
    ((failed++))
fi

if [ -f "QUICK_START_MONITORING.md" ]; then
    success "Guide QUICK_START_MONITORING.md existe"
    ((passed++))
else
    warning "Guide QUICK_START_MONITORING.md manquant"
    ((failed++))
fi

echo ""
echo "🧪 Vérification des commandes Make..."
echo ""

# Tester commandes Make
commands=("mon" "mon-quick" "mon-save" "mon-watch" "mon-history" "mon-last" "mon-clean")
for cmd in "${commands[@]}"; do
    if make -n "$cmd" >/dev/null 2>&1; then
        success "Commande 'make $cmd' reconnue"
        ((passed++))
    else
        error "Commande 'make $cmd' non reconnue"
        ((failed++))
    fi
done

echo ""
echo "🔍 Vérification des prérequis..."
echo ""

# Vérifier prérequis
prereqs=("jq" "bc" "curl" "docker")
for prereq in "${prereqs[@]}"; do
    if command -v "$prereq" &> /dev/null; then
        success "$prereq installé"
        ((passed++))
    else
        error "$prereq manquant"
        ((failed++))
    fi
done

# Vérifier iostat (optionnel)
if command -v iostat &> /dev/null; then
    success "iostat installé (optionnel)"
    ((passed++))
else
    warning "iostat non installé (optionnel, pour métriques I/O)"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "📊 RÉSUMÉ"
echo "════════════════════════════════════════════════════════════"
echo ""
success "Tests réussis: $passed"
if [ $failed -gt 0 ]; then
    error "Tests échoués: $failed"
else
    success "Tests échoués: 0"
fi
echo ""

if [ $failed -eq 0 ]; then
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║              ✅ INTÉGRATION COMPLÈTE ✅                    ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "🚀 Commencez par:"
    echo "   make mon-quick     # Test rapide"
    echo "   make mon           # Monitoring complet"
    echo "   make help-utils    # Voir toutes les commandes"
    echo ""
    exit 0
else
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║          ⚠️  INTÉGRATION INCOMPLÈTE ⚠️                     ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "🔧 Corrigez les erreurs ci-dessus avant d'utiliser"
    echo ""
    exit 1
fi
