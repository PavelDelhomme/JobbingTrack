#!/bin/bash

# Script de test du système de reset de mot de passe
# Usage: ./scripts/test-reset-password.sh <email>

set -e

API_URL="${API_URL:-http://localhost:3001}"
EMAIL="${1:-test@example.com}"

echo "🧪 Test du système de reset de mot de passe"
echo "============================================"
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Tester la santé du service auth
echo "📡 Test 1: Vérification du service auth..."
if curl -sf "${API_URL}/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Service auth opérationnel${NC}"
else
    echo -e "${RED}❌ Service auth non accessible${NC}"
    exit 1
fi

echo ""

# 2. Demander un reset de mot de passe
echo "📧 Test 2: Demande de reset de mot de passe pour ${EMAIL}..."
RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\"}")

echo "Réponse: ${RESPONSE}"

if echo "$RESPONSE" | grep -q "success.*true"; then
    echo -e "${GREEN}✅ Email de reset envoyé avec succès${NC}"
else
    echo -e "${YELLOW}⚠️  Vérifiez la configuration SMTP${NC}"
    echo "Réponse complète: ${RESPONSE}"
fi

echo ""

# 3. Instructions pour MailHog
echo "📬 Test 3: Vérification de l'email..."
echo ""
echo -e "${YELLOW}Si vous utilisez MailHog:${NC}"
echo "  1. Ouvrez http://localhost:8025 dans votre navigateur"
echo "  2. Vous devriez voir l'email de reset"
echo "  3. Cliquez sur le lien dans l'email"
echo ""
echo -e "${YELLOW}Si vous utilisez Gmail:${NC}"
echo "  1. Vérifiez votre boîte mail: ${EMAIL}"
echo "  2. Cherchez un email de JobbingTrack"
echo "  3. Cliquez sur le lien de réinitialisation"
echo ""

# 4. Test des métriques de persistance
echo "📊 Test 4: Vérification des métriques de persistance..."
METRICS_URL="${METRICS_URL:-http://localhost:3014}"

if curl -sf "${METRICS_URL}/api/v1/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Service metrics opérationnel${NC}"
    
    # Stats globales
    echo ""
    echo "📈 Statistiques de persistance:"
    curl -s "${METRICS_URL}/api/v1/persistence/stats" | grep -o '"[^"]*":[^,}]*' | head -10 || true
else
    echo -e "${RED}❌ Service metrics non accessible${NC}"
fi

echo ""
echo "============================================"
echo -e "${GREEN}✅ Tests terminés${NC}"
echo ""
echo "📝 Prochaines étapes:"
echo "  1. Vérifier l'email reçu"
echo "  2. Cliquer sur le lien de reset"
echo "  3. Saisir un nouveau mot de passe"
echo "  4. Se connecter avec le nouveau mot de passe"
echo ""
echo "📚 Documentation complète:"
echo "  - Configuration SMTP: backend/auth-service/SMTP_CONFIGURATION.md"
echo "  - Guide complet: AMELIORATIONS_METRIQUES_ET_RESET_PASSWORD.md"

