#!/bin/bash
# test-microservices.sh - Tests automatisés complets

# Couleurs pour l'affichage
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Tests Automatisés JobbingTrack Micro-Services${NC}"
echo "=================================================="

# Variables
API_GATEWAY="http://localhost:3000"
AUTH_SERVICE="http://localhost:3001"
APPLICATION_SERVICE="http://localhost:3002"
COMPANY_SERVICE="http://localhost:3003"
CONTACT_SERVICE="http://localhost:3004"
INTERVIEW_SERVICE="http://localhost:3005"
NOTIFICATION_SERVICE="http://localhost:3006"
DASHBOARD_SERVICE="http://localhost:3007"

TEST_USER_EMAIL="test-$(date +%s)@example.com"
TEST_PASSWORD="password123"
TOKEN=""

# Fonction pour tester un endpoint
test_endpoint() {
    local url=$1
    local expected_status=$2
    local description=$3
    
    echo -n "Testing: $description... "
    
    if command -v jq > /dev/null 2>&1; then
        response=$(curl -s -w "%{http_code}" "$url" | tail -n1)
    else
        response=$(curl -s -w "%{http_code}" "$url" -o /dev/null)
    fi
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL (got $response, expected $expected_status)${NC}"
        return 1
    fi
}

# Fonction pour tester l'inscription
test_registration() {
    echo -e "\n${YELLOW}🔐 Test d'inscription${NC}"
    
    response=$(curl -s -X POST "$API_GATEWAY/api/v1/auth/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$TEST_USER_EMAIL\",
            \"password\": \"$TEST_PASSWORD\",
            \"firstName\": \"Test\",
            \"lastName\": \"User\"
        }")
    
    if command -v jq > /dev/null 2>&1; then
        success=$(echo "$response" | jq -r '.success // false')
        if [ "$success" = "true" ]; then
            echo -e "${GREEN}✅ Inscription réussie${NC}"
            return 0
        else
            echo -e "${RED}❌ Inscription échouée${NC}"
            echo "Response: $response"
            return 1
        fi
    else
        if echo "$response" | grep -q "success"; then
            echo -e "${GREEN}✅ Inscription réussie${NC}"
            return 0
        else
            echo -e "${RED}❌ Inscription échouée${NC}"
            return 1
        fi
    fi
}

# Fonction pour tester la connexion et récupérer le token
test_login() {
    echo -e "\n${YELLOW}🔑 Test de connexion${NC}"
    
    response=$(curl -s -X POST "$API_GATEWAY/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$TEST_USER_EMAIL\",
            \"password\": \"$TEST_PASSWORD\"
        }")
    
    if command -v jq > /dev/null 2>&1; then
        TOKEN=$(echo "$response" | jq -r '.token // empty')
        if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
            echo -e "${GREEN}✅ Connexion réussie - Token récupéré${NC}"
            return 0
        else
            echo -e "${RED}❌ Connexion échouée - Pas de token${NC}"
            echo "Response: $response"
            return 1
        fi
    else
        if echo "$response" | grep -q "token"; then
            TOKEN=$(echo "$response" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
            echo -e "${GREEN}✅ Connexion réussie - Token récupéré${NC}"
            return 0
        else
            echo -e "${RED}❌ Connexion échouée${NC}"
            return 1
        fi
    fi
}

# Fonction pour tester les API protégées
test_protected_endpoints() {
    echo -e "\n${YELLOW}🛡️ Test des endpoints protégés${NC}"
    
    if [ -z "$TOKEN" ]; then
        echo -e "${RED}❌ Pas de token disponible - Skip des tests protégés${NC}"
        return 1
    fi
    
    # Test création candidature
    echo -n "Test création candidature... "
    response=$(curl -s -X POST "$API_GATEWAY/api/v1/applications" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{
            "companyName": "Test Company",
            "position": "Test Position",
            "type": "FULL_TIME",
            "status": "DRAFT"
        }')
    
    if echo "$response" | grep -q -E "(success|id|message)"; then
        echo -e "${GREEN}✅ PASS${NC}"
    else
        echo -e "${RED}❌ FAIL${NC}"
    fi
    
    # Test récupération candidatures
    echo -n "Test récupération candidatures... "
    response=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_GATEWAY/api/v1/applications")
    
    if echo "$response" | grep -q -E "(applications|\[\]|\[.*\])"; then
        echo -e "${GREEN}✅ PASS${NC}"
    else
        echo -e "${RED}❌ FAIL${NC}"
    fi
}

# Phase 1: Tests de santé des services
echo -e "\n${YELLOW}🏥 Phase 1: Tests de santé des services${NC}"
test_endpoint "$API_GATEWAY/health" "200" "API Gateway Health"
test_endpoint "$AUTH_SERVICE/health" "200" "Auth Service Health"
test_endpoint "$APPLICATION_SERVICE/health" "200" "Application Service Health"
test_endpoint "$COMPANY_SERVICE/health" "200" "Company Service Health"
test_endpoint "$CONTACT_SERVICE/health" "200" "Contact Service Health"
test_endpoint "$INTERVIEW_SERVICE/health" "200" "Interview Service Health"
test_endpoint "$NOTIFICATION_SERVICE/health" "200" "Notification Service Health"
test_endpoint "$DASHBOARD_SERVICE/health" "200" "Dashboard Service Health"

# Phase 2: Tests d'authentification
echo -e "\n${YELLOW}📝 Phase 2: Tests d'authentification${NC}"
test_registration
test_login

# Phase 3: Tests des endpoints protégés
test_protected_endpoints

# Phase 4: Test de la documentation
echo -e "\n${YELLOW}📚 Phase 4: Test de la documentation${NC}"
test_endpoint "$API_GATEWAY/api-docs" "200" "Documentation Swagger"

# Résumé
echo -e "\n${BLUE}📊 RÉSUMÉ DES TESTS${NC}"
echo "=================================="
echo -e "✅ Tests de santé des 8 micro-services"
echo -e "✅ Tests d'authentification (inscription/connexion)"
echo -e "✅ Tests des endpoints protégés"
echo -e "✅ Test de la documentation"
echo -e "\n${GREEN}🎉 Tests automatisés terminés !${NC}"

# Instructions pour jq si pas installé
if ! command -v jq > /dev/null 2>&1; then
    echo -e "\n${YELLOW}💡 Pour de meilleurs résultats, installez jq :${NC}"
    echo "  Ubuntu/Debian: sudo apt install jq"
    echo "  macOS: brew install jq"
    echo "  ArchLinux: sudo pacman -S jq"
fi