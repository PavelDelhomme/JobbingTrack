#!/bin/bash
# Script de vérification complet du bon fonctionnement API et backend pour user-journey

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Compteurs
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Fonction pour afficher un test
test_endpoint() {
    local name="$1"
    local url="$2"
    local method="${3:-GET}"
    local data="$4"
    local expected_status="${5:-200}"
    local token="$6"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${BLUE}[$TOTAL_TESTS] Test: $name${NC}"
    
    # Construire la commande curl avec timeout
    local curl_cmd="curl -s -w '%{http_code}' -o /tmp/response.txt --max-time 10"
    
    if [ -n "$token" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $token'"
    fi
    
    if [ "$method" != "GET" ]; then
        curl_cmd="$curl_cmd -X $method"
    fi
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
    fi
    
    curl_cmd="$curl_cmd '$url'"
    
    # Exécuter la requête
    local status_code=$(eval $curl_cmd 2>/dev/null)
    local response=$(cat /tmp/response.txt 2>/dev/null || echo "")
    
    # Vérifier le status code
    if [[ "$status_code" =~ ^$expected_status ]]; then
        echo -e "${GREEN}   ✓ PASS - Status: $status_code${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}   ✗ FAIL - Status: $status_code (attendu: $expected_status)${NC}"
        if [ -n "$response" ] && [ ${#response} -gt 0 ]; then
            echo -e "${YELLOW}   Réponse: ${response:0:200}${NC}"
        fi
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Vérification User Journey - JobbingTrack          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✨ Ce script utilise un token permanent qui n'expire jamais !${NC}"
echo ""

# Variables
# Tester directement l'API Gateway (pas besoin du frontend)
API_URL="http://localhost:3000"
TOKEN=""
TEST_TOKEN=""

# ==============================================================================
# 1. HEALTH CHECKS
# ==============================================================================
echo -e "${YELLOW}═══ 1. Health Checks ═══${NC}"

test_endpoint "API Health" "$API_URL/health"

# ==============================================================================
# 2. AUTH ENDPOINTS
# ==============================================================================
echo -e "\n${YELLOW}═══ 2. Authentification ═══${NC}"

# Register
REGISTER_EMAIL="verify-$(date +%s)@test.com"
REGISTER_DATA="{\"email\":\"$REGISTER_EMAIL\",\"password\":\"Test123456\",\"firstName\":\"Test\",\"lastName\":\"User\",\"phone\":\"0612345678\"}"
test_endpoint "Register" "$API_URL/api/v1/auth/register" "POST" "$REGISTER_DATA" "201"

# Extraction du token
if [ -f /tmp/response.txt ]; then
    TOKEN=$(cat /tmp/response.txt | python3 -c "import sys, json; print(json.load(sys.stdin).get('token', ''))" 2>/dev/null || echo "")
    if [ -n "$TOKEN" ]; then
        echo -e "${GREEN}   Token obtenu: ${TOKEN:0:20}...${NC}"
    fi
fi

# Login avec compte admin (pour avoir un SUPER_ADMIN)
LOGIN_DATA="{\"email\":\"admin@jobbingtrack.test\",\"password\":\"password123\"}"
test_endpoint "Login" "$API_URL/api/v1/auth/login" "POST" "$LOGIN_DATA" "200"

# Extraction du token admin (plus robuste)
if [ -f /tmp/response.txt ]; then
    TOKEN=$(cat /tmp/response.txt | python3 -c "import sys, json; print(json.load(sys.stdin).get('token', ''))" 2>/dev/null || echo "")
    if [ -z "$TOKEN" ]; then
        echo -e "${YELLOW}   ⚠ Token non extrait, tentative avec grep...${NC}"
        TOKEN=$(cat /tmp/response.txt | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    fi
    if [ -n "$TOKEN" ]; then
        echo -e "${GREEN}   ✓ Token admin obtenu: ${TOKEN:0:20}...${NC}"
    else
        echo -e "${RED}   ✗ Impossible d'extraire le token${NC}"
    fi
fi

# Générer un token permanent (n'expire jamais)
echo -e "\n${YELLOW}═══ Génération Token Permanent ═══${NC}"
echo -e "${BLUE}Génération d'un token de test permanent (100 ans)...${NC}"

# Faire la requête et récupérer le status code séparément
TEST_TOKEN_STATUS=$(curl -s -w '%{http_code}' -o /tmp/test_token_response.txt \
    --max-time 10 \
    -X POST \
    -H "Authorization: Bearer $TOKEN" \
    "$API_URL/api/v1/auth/generate-test-token")

if [ "$TEST_TOKEN_STATUS" = "200" ]; then
    TEST_TOKEN=$(cat /tmp/test_token_response.txt | python3 -c "import sys, json; print(json.load(sys.stdin).get('testToken', ''))" 2>/dev/null || echo "")
    if [ -n "$TEST_TOKEN" ]; then
        TOKEN="$TEST_TOKEN"
        echo -e "${GREEN}   ✓ Token permanent généré avec succès !${NC}"
        echo -e "${GREEN}   ✓ Ce token n'expirera jamais (valide 100 ans)${NC}"
        echo -e "${GREEN}   ✓ Token: ${TEST_TOKEN:0:30}...${NC}"
    else
        echo -e "${YELLOW}   ⚠ Impossible d'extraire le token permanent, utilisation du token normal${NC}"
    fi
else
    echo -e "${YELLOW}   ⚠ Génération du token permanent échouée (status $TEST_TOKEN_STATUS)${NC}"
    echo -e "${YELLOW}   ⚠ Utilisation du token normal (expire dans 7 jours)${NC}"
fi

# Profile
test_endpoint "Get Profile" "$API_URL/api/v1/auth/profile" "GET" "" "200" "$TOKEN"

# ==============================================================================
# 3. COMPANIES
# ==============================================================================
echo -e "\n${YELLOW}═══ 3. Companies ═══${NC}"

test_endpoint "List Companies" "$API_URL/api/v1/companies" "GET" "" "200" "$TOKEN"

COMPANY_DATA="{\"name\":\"Test Company $(date +%s)\",\"industry\":\"IT\",\"website\":\"https://test.com\"}"
test_endpoint "Create Company" "$API_URL/api/v1/companies" "POST" "$COMPANY_DATA" "201" "$TOKEN"

# ==============================================================================
# 4. APPLICATIONS
# ==============================================================================
echo -e "\n${YELLOW}═══ 4. Applications ═══${NC}"

test_endpoint "List Applications" "$API_URL/api/v1/applications" "GET" "" "200" "$TOKEN"

APPLICATION_DATA="{\"position\":\"Développeur Full Stack\",\"companyName\":\"Tech Corp\",\"status\":\"CANDIDATE_PENDING\",\"location\":\"Paris\",\"contractType\":\"CDI\"}"
test_endpoint "Create Application" "$API_URL/api/v1/applications" "POST" "$APPLICATION_DATA" "201" "$TOKEN"

# ==============================================================================
# 5. CONTACTS
# ==============================================================================
echo -e "\n${YELLOW}═══ 5. Contacts ═══${NC}"

test_endpoint "List Contacts" "$API_URL/api/v1/contacts" "GET" "" "200" "$TOKEN"

CONTACT_DATA="{\"firstName\":\"John\",\"lastName\":\"Doe\",\"email\":\"redacted@example.invalid\",\"position\":\"Manager\"}"
test_endpoint "Create Contact" "$API_URL/api/v1/contacts" "POST" "$CONTACT_DATA" "201" "$TOKEN"

# ==============================================================================
# 6. INTERVIEWS
# ==============================================================================
echo -e "\n${YELLOW}═══ 6. Interviews ═══${NC}"

test_endpoint "List Interviews" "$API_URL/api/v1/interviews" "GET" "" "200" "$TOKEN"

# ==============================================================================
# 7. EVENTS
# ==============================================================================
echo -e "\n${YELLOW}═══ 7. Events ═══${NC}"

test_endpoint "List Events" "$API_URL/api/v1/events" "GET" "" "200" "$TOKEN"

# ==============================================================================
# 8. FOLLOWUPS
# ==============================================================================
echo -e "\n${YELLOW}═══ 8. Followups ═══${NC}"

test_endpoint "List Followups" "$API_URL/api/v1/followups" "GET" "" "200" "$TOKEN"

# ==============================================================================
# 9. CALLS
# ==============================================================================
echo -e "\n${YELLOW}═══ 9. Calls ═══${NC}"

test_endpoint "List Calls" "$API_URL/api/v1/calls" "GET" "" "200" "$TOKEN"

# ==============================================================================
# 10. DASHBOARD / STATISTICS
# ==============================================================================
echo -e "\n${YELLOW}═══ 10. Dashboard & Statistics ═══${NC}"

test_endpoint "Get Statistics" "$API_URL/api/v1/dashboard/statistics" "GET" "" "200" "$TOKEN"

# ==============================================================================
# RÉSUMÉ
# ==============================================================================
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                      RÉSUMÉ                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Total de tests    : ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Tests réussis     : ${GREEN}$PASSED_TESTS${NC}"
echo -e "Tests échoués     : ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ TOUS LES TESTS SONT PASSÉS !${NC}"
    echo -e "${GREEN}Le système est opérationnel à 100%${NC}"
    exit 0
else
    PERCENT=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo -e "${YELLOW}⚠ SYSTÈME OPÉRATIONNEL À $PERCENT%${NC}"
    echo -e "${YELLOW}$FAILED_TESTS test(s) ont échoué${NC}"
    exit 1
fi

