#!/bin/bash

# ============================================
# Script de Validation de Tous les Schémas Prisma
# ============================================

set -e

echo "🔍 Validation de tous les schémas Prisma..."
echo ""

cd "$(dirname "$0")/.."

# Services avec Prisma
SERVICES_WITH_PRISMA=(
    "application-service"
    "auth-service"
    "call-service"
    "company-service"
    "contact-service"
    "dashboard-service"
    "deployment-service"
    "event-service"
    "followup-service"
    "interview-service"
    "metrics-aggregator-service"
    "notification-service"
    "profile-service"
    "security-service"
    "workflow-service"
)

# Services sans Prisma (normaux)
SERVICES_WITHOUT_PRISMA=(
    "api-gateway"
    "monitoring"
)

SUCCESS=0
ERRORS=0

echo "📋 Services AVEC Prisma à vérifier: ${#SERVICES_WITH_PRISMA[@]}"
echo ""

for service in "${SERVICES_WITH_PRISMA[@]}"; do
    SERVICE_DIR="backend/$service"
    
    if [ ! -d "$SERVICE_DIR" ]; then
        echo "  ⚠️  $service - Dossier introuvable"
        continue
    fi
    
    if [ ! -f "$SERVICE_DIR/prisma/schema.prisma" ]; then
        echo "  ❌ $service - Schema Prisma manquant"
        ERRORS=$((ERRORS + 1))
        continue
    fi
    
    echo "  🔧 $service..."
    cd "$SERVICE_DIR"
    
    if npx prisma format 2>&1 | grep -q "Formatted"; then
        echo "  ✅ $service - OK"
        SUCCESS=$((SUCCESS + 1))
    elif npx prisma format 2>&1 | grep -q "Error"; then
        echo "  ❌ $service - ERREUR"
        ERRORS=$((ERRORS + 1))
        # Afficher l'erreur
        npx prisma format 2>&1 | grep -A 5 "Error:"
    else
        echo "  ✅ $service - OK (déjà formaté)"
        SUCCESS=$((SUCCESS + 1))
    fi
    
    cd - > /dev/null
    echo ""
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RÉSUMÉ:"
echo "   ✅ Succès: $SUCCESS"
echo "   ❌ Erreurs: $ERRORS"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo "✅ Tous les schémas sont valides !"
    echo ""
    echo "💡 Vous pouvez maintenant lancer:"
    echo "   make rebuild"
    exit 0
else
    echo "❌ Des erreurs subsistent"
    echo ""
    echo "💡 Vérifiez les erreurs ci-dessus"
    exit 1
fi
