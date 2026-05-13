#!/bin/bash

# Script manuel de test du système de reset de mot de passe.
# Usage:
#   API_GATEWAY_URL=http://127.0.0.1:5002 METRICS_API_KEY=... scripts/testing/test-reset-password.sh <email>

set -e

API_URL="${API_GATEWAY_URL:-${API_URL:-http://127.0.0.1:${API_GATEWAY_PORT:-5002}}}"
METRICS_URL="${METRICS_URL:-http://127.0.0.1:${METRICS_AGGREGATOR_PORT:-5004}}"
EMAIL="${1:-test@example.com}"

echo "🧪 Test du système de reset de mot de passe"
echo "============================================"
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

curl_json() {
    local url="$1"
    shift
    curl -sS "$url" "$@"
}

metrics_curl_args=()
if [ -n "${METRICS_API_KEY:-}" ]; then
    metrics_curl_args=(-H "X-API-Key: ${METRICS_API_KEY}")
fi

# 1. Tester la santé de la gateway/auth
echo "📡 Test 1: Vérification gateway/auth (${API_URL})..."
if curl -sf "${API_URL}/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Gateway opérationnelle${NC}"
elif curl -sf "${API_URL}/api/v1/auth/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Service auth opérationnel via gateway${NC}"
else
    echo -e "${RED}❌ Gateway/auth non accessible${NC}"
    echo "   Vérifiez: make up-full, puis API_GATEWAY_URL=${API_URL}"
    exit 1
fi

echo ""

# 2. Demander un reset de mot de passe
echo "📧 Test 2: Demande de reset de mot de passe pour ${EMAIL}..."
RESPONSE=$(curl_json "${API_URL}/api/v1/auth/forgot-password" \
  -X POST \
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

# 4. Test des métriques de persistance (optionnel)
echo "📊 Test 4: Vérification des métriques de persistance..."

if curl -sf "${metrics_curl_args[@]}" "${METRICS_URL}/health" > /dev/null 2>&1 || \
   curl -sf "${metrics_curl_args[@]}" "${METRICS_URL}/api/v1/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Service metrics opérationnel${NC}"

    # Stats globales
    echo ""
    echo "📈 Statistiques de persistance:"
    curl -s "${metrics_curl_args[@]}" "${METRICS_URL}/api/v1/persistence/stats" | sed 's/,/\n/g' | sed -n '1,10p' || true
else
    echo -e "${YELLOW}⚠️  Service metrics non accessible ou clé absente (${METRICS_URL})${NC}"
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
echo "  - Configuration SMTP: docs/emails/SMTP_CONFIGURATION.md"
echo "  - Endpoints API: docs/api/endpoints/README.md"

