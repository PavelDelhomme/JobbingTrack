#!/bin/bash
# Script pour tester des endpoints API spécifiques
# Usage: ./scripts/test-api-specific.sh <test_type> [endpoint1] [endpoint2] ...
# Pas de set -e : on exécute tous les tests même si certains échouent, pour un rapport complet (total / réussis / échoués).

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
API_URL="${API_URL:-http://localhost:5002}"
TOKEN=""
TEST_TYPES="$1"
shift || true
SPECIFIC_TESTS="$@"

# Compteurs
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Fichier de résultats structurés pour le rapport (env exporté par generate-test-report.sh)
RESULTS_FILE="${TEST_RESULTS_FILE:-}"
[ -n "$RESULTS_FILE" ] && : > "$RESULTS_FILE"

# Fonction pour tester un endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local method="${3:-GET}"
    local data="$4"
    local expected_status="${5:-200}"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${BLUE}[$TOTAL_TESTS] Test: $name${NC}"
    
    local curl_cmd="curl -s -w '%{http_code}' -o /tmp/response.txt --max-time 10"
    
    if [ -n "$TOKEN" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $TOKEN'"
    fi
    
    if [ "$method" != "GET" ]; then
        curl_cmd="$curl_cmd -X $method"
    fi
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
    fi
    
    curl_cmd="$curl_cmd '$url'"
    
    local status_code=$(eval $curl_cmd 2>/dev/null)
    local response=$(cat /tmp/response.txt 2>/dev/null || echo "")
    
    if [[ "$status_code" =~ ^$expected_status ]]; then
        echo -e "${GREEN}   ✓ PASS - Status: $status_code${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        [ -n "$RESULTS_FILE" ] && echo "TEST|$TOTAL_TESTS|$name|pass|$expected_status|$status_code||" >> "$RESULTS_FILE"
        return 0
    else
        echo -e "${RED}   ✗ FAIL - Status: $status_code (attendu: $expected_status)${NC}"
        if [ -n "$response" ] && [ ${#response} -gt 0 ]; then
            echo -e "${YELLOW}   Réponse: ${response:0:200}${NC}"
        fi
        FAILED_TESTS=$((FAILED_TESTS + 1))
        resp_escaped=$(echo "$response" | head -c 500 | tr '\n' ' ' | tr '|' ' ' | tr '\r' ' ')
        [ -n "$RESULTS_FILE" ] && echo "TEST|$TOTAL_TESTS|$name|fail|$expected_status|$status_code|$resp_escaped" >> "$RESULTS_FILE"
        return 1
    fi
}

# Obtenir un token (ne pas faire quitter le script si le login échoue)
get_token() {
    echo -e "${YELLOW}Authentification...${NC}"
    
    LOGIN_DATA="{\"email\":\"admin@jobbingtrack.test\",\"password\":\"password123\"}"
    test_endpoint "Login" "$API_URL/api/v1/auth/login" "POST" "$LOGIN_DATA" "200" "" || true
    
    if [ -f /tmp/response.txt ]; then
        TOKEN=$(cat /tmp/response.txt | python3 -c "import sys, json; print(json.load(sys.stdin).get('token', ''))" 2>/dev/null || echo "")
        if [ -z "$TOKEN" ]; then
            TOKEN=$(cat /tmp/response.txt | grep -o '"token":"[^"]*' | cut -d'"' -f4)
        fi
        if [ -n "$TOKEN" ]; then
            echo -e "${GREEN}   ✓ Token obtenu${NC}"
        fi
    fi
}

# Tests par type
test_health() {
    echo -e "\n${YELLOW}═══ Health Checks ═══${NC}"
    test_endpoint "API Gateway Health" "$API_URL/health" "GET" "" "200" || true
    test_endpoint "API Gateway /api/health" "$API_URL/api/v1/health" "GET" "" "200" || true
    test_endpoint "API Gateway Metrics" "$API_URL/metrics" "GET" "" "200" || true
}

test_services() {
    echo -e "\n${YELLOW}═══ Services Backend ═══${NC}"
    test_endpoint "Auth Service" "$API_URL/api/v1/auth/health" "GET" "" "200" || true
    # Via API Gateway : routes protégées → 401 sans token = service joignable
    test_endpoint "Company Service" "$API_URL/api/v1/companies" "GET" "" "401" || true
    test_endpoint "Application Service" "$API_URL/api/v1/applications" "GET" "" "401" || true
    test_endpoint "Contact Service" "$API_URL/api/v1/contacts" "GET" "" "401" || true
    test_endpoint "Interview Service" "$API_URL/api/v1/interviews" "GET" "" "401" || true
    test_endpoint "Call Service" "$API_URL/api/v1/calls" "GET" "" "401" || true
    test_endpoint "Event Service" "$API_URL/api/v1/events" "GET" "" "401" || true
    test_endpoint "FollowUp Service" "$API_URL/api/v1/followups" "GET" "" "401" || true
    test_endpoint "Profile Service" "$API_URL/api/v1/profile/me" "GET" "" "401" || true
    test_endpoint "Notification Service" "$API_URL/api/v1/notifications" "GET" "" "401" || true
}

test_auth() {
    echo -e "\n${YELLOW}═══ Authentification ═══${NC}"
    get_token
    test_endpoint "Get Profile" "$API_URL/api/v1/auth/profile" "GET" "" "200" "$TOKEN"
}

test_users() {
    echo -e "\n${YELLOW}═══ Utilisateurs ═══${NC}"
    [ -z "$TOKEN" ] && get_token
    test_endpoint "List Users" "$API_URL/api/v1/users" "GET" "" "200" "$TOKEN"
    test_endpoint "Get User Profile" "$API_URL/api/v1/users/profile" "GET" "" "200" "$TOKEN"
}

test_companies() {
    echo -e "\n${YELLOW}═══ Entreprises ═══${NC}"
    [ -z "$TOKEN" ] && get_token
    test_endpoint "List Companies" "$API_URL/api/v1/companies" "GET" "" "200" "$TOKEN"
    COMPANY_DATA="{\"name\":\"Test Company $(date +%s)\",\"industry\":\"IT\",\"website\":\"https://test.com\"}"
    test_endpoint "Create Company" "$API_URL/api/v1/companies" "POST" "$COMPANY_DATA" "201" "$TOKEN"
}

test_applications() {
    echo -e "\n${YELLOW}═══ Candidatures ═══${NC}"
    [ -z "$TOKEN" ] && get_token
    test_endpoint "List Applications" "$API_URL/api/v1/applications" "GET" "" "200" "$TOKEN"
    APPLICATION_DATA="{\"position\":\"Développeur Full Stack\",\"companyName\":\"Tech Corp\",\"status\":\"CANDIDATE_PENDING\",\"location\":\"Paris\",\"contractType\":\"CDI\"}"
    test_endpoint "Create Application" "$API_URL/api/v1/applications" "POST" "$APPLICATION_DATA" "201" "$TOKEN"
}

test_contacts() {
    echo -e "\n${YELLOW}═══ Contacts ═══${NC}"
    [ -z "$TOKEN" ] && get_token
    test_endpoint "List Contacts" "$API_URL/api/v1/contacts" "GET" "" "200" "$TOKEN"
    CONTACT_DATA="{\"firstName\":\"John\",\"lastName\":\"Doe\",\"email\":\"redacted@example.invalid\",\"position\":\"Manager\"}"
    test_endpoint "Create Contact" "$API_URL/api/v1/contacts" "POST" "$CONTACT_DATA" "201" "$TOKEN"
}

test_interviews() {
    echo -e "\n${YELLOW}═══ Entretiens ═══${NC}"
    [ -z "$TOKEN" ] && get_token
    test_endpoint "List Interviews" "$API_URL/api/v1/interviews" "GET" "" "200" "$TOKEN"
    INTERVIEW_DATA="{\"applicationId\":\"test-id\",\"scheduledAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"type\":\"technical\"}"
    test_endpoint "Create Interview" "$API_URL/api/v1/interviews" "POST" "$INTERVIEW_DATA" "201" "$TOKEN" || true
}

test_calls() {
    echo -e "\n${YELLOW}═══ Appels ═══${NC}"
    [ -z "$TOKEN" ] && get_token
    test_endpoint "List Calls" "$API_URL/api/v1/calls" "GET" "" "200" "$TOKEN"
    CALL_DATA="{\"contactId\":\"test-id\",\"type\":\"outbound\",\"duration\":30,\"notes\":\"Test call\"}"
    test_endpoint "Create Call" "$API_URL/api/v1/calls" "POST" "$CALL_DATA" "201" "$TOKEN" || true
}

test_events() {
    echo -e "\n${YELLOW}═══ Événements ═══${NC}"
    [ -z "$TOKEN" ] && get_token
    test_endpoint "List Events" "$API_URL/api/v1/events" "GET" "" "200" "$TOKEN"
    EVENT_DATA="{\"title\":\"Test Event\",\"startDate\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"endDate\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
    test_endpoint "Create Event" "$API_URL/api/v1/events" "POST" "$EVENT_DATA" "201" "$TOKEN" || true
}

test_followups() {
    echo -e "\n${YELLOW}═══ Relances ═══${NC}"
    [ -z "$TOKEN" ] && get_token
    test_endpoint "List Followups" "$API_URL/api/v1/followups" "GET" "" "200" "$TOKEN"
    FOLLOWUP_DATA="{\"applicationId\":\"test-id\",\"type\":\"email\",\"dueDate\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"notes\":\"Test followup\"}"
    test_endpoint "Create Followup" "$API_URL/api/v1/followups" "POST" "$FOLLOWUP_DATA" "201" "$TOKEN" || true
}

test_profiles() {
    echo -e "\n${YELLOW}═══ Profils ═══${NC}"
    [ -z "$TOKEN" ] && get_token
    test_endpoint "Get Profile" "$API_URL/api/v1/profile/me" "GET" "" "200" "$TOKEN"
    PROFILE_DATA="{\"firstName\":\"Updated\",\"lastName\":\"Name\"}"
    test_endpoint "Update Profile" "$API_URL/api/v1/profile/me" "PUT" "$PROFILE_DATA" "200" "$TOKEN" || true
}

test_notifications() {
    echo -e "\n${YELLOW}═══ Notifications ═══${NC}"
    [ -z "$TOKEN" ] && get_token
    test_endpoint "List Notifications" "$API_URL/api/v1/notifications" "GET" "" "200" "$TOKEN"
}

test_metrics() {
    echo -e "\n${YELLOW}═══ Métriques ═══${NC}"
    [ -z "$TOKEN" ] && get_token
    test_endpoint "Get Metrics" "$API_URL/api/v1/metrics" "GET" "" "200" "$TOKEN" || true
    test_endpoint "Get Dashboard Statistics" "$API_URL/api/v1/dashboard/statistics" "GET" "" "200" "$TOKEN" || true
}

# Afficher le résumé à la sortie (même en cas d'échec prématuré) pour que generate-test-report.sh puisse parser
show_summary_on_exit() {
    echo ""
    echo -e "Total de tests    : ${BLUE}$TOTAL_TESTS${NC}"
    echo -e "Tests réussis     : ${GREEN}$PASSED_TESTS${NC}"
    echo -e "Tests échoués     : ${RED}$FAILED_TESTS${NC}"
}
trap show_summary_on_exit EXIT

# Exécuter les tests selon les types sélectionnés
echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     Tests API Spécifiques - JobbingTrack              ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Si des tests spécifiques sont demandés, les exécuter (syntaxe POSIX pour sh, pas de <<<)
if [ -n "$TEST_TYPES" ]; then
    for type in $(echo "$TEST_TYPES" | tr ',' ' '); do
        type=$(echo "$type" | tr -d ' ')
        [ -z "$type" ] && continue
        case "$type" in
            health) test_health ;;
            services) test_services ;;
            auth) test_auth ;;
            users) test_users ;;
            companies) test_companies ;;
            applications) test_applications ;;
            contacts) test_contacts ;;
            interviews) test_interviews ;;
            calls) test_calls ;;
            events) test_events ;;
            followups) test_followups ;;
            profiles) test_profiles ;;
            notifications) test_notifications ;;
            metrics) test_metrics ;;
            *) echo -e "${YELLOW}Type de test inconnu: $type${NC}" ;;
        esac
    done
else
    # Tous les tests par défaut
    test_health
    test_services
    test_auth
    test_users
    test_companies
    test_applications
    test_contacts
    test_interviews
    test_calls
    test_events
    test_followups
    test_profiles
    test_notifications
    test_metrics
fi

# Résumé (le trap EXIT affiche aussi ces lignes en sortie anticipée)
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                      RÉSUMÉ                            ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Total de tests    : ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Tests réussis     : ${GREEN}$PASSED_TESTS${NC}"
echo -e "Tests échoués     : ${RED}$FAILED_TESTS${NC}"
echo ""

if [ "$FAILED_TESTS" -eq 0 ]; then
    echo -e "${GREEN}✓ TOUS LES TESTS SONT PASSÉS !${NC}"
    exit 0
else
    PERCENT=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo -e "${YELLOW}⚠ SYSTÈME OPÉRATIONNEL À $PERCENT%${NC}"
    exit 1
fi

