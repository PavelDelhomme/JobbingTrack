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

# Configuration (API_GATEWAY_URL utilisé par le backoffice / CI)
API_URL="${API_URL:-${API_GATEWAY_URL:-http://localhost:5002}}"
if echo "${API_URL}" | grep -q 'api-gateway'; then
	_gp=$(printf '%s' "${API_URL}" | sed -n 's/.*api-gateway:\([0-9][0-9]*\).*/\1/p')
	API_URL="http://127.0.0.1:${_gp:-${API_GATEWAY_PORT:-5002}}"
	export API_URL
fi
TOKEN=""
TEST_TYPES="$1"
shift || true
SPECIFIC_TESTS="$@"

# Compteurs
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# ID de la candidature créée (réutilisé pour Interview, Call, Followup)
CREATED_APPLICATION_ID=""

# Fichier de résultats structurés pour le rapport (env exporté par generate-test-report.sh)
RESULTS_FILE="${TEST_RESULTS_FILE:-}"
[ -n "$RESULTS_FILE" ] && : > "$RESULTS_FILE"

# Extrait un id générique depuis un JSON de réponse API
extract_generic_id_from_file() {
    local f="$1"
    [ ! -f "$f" ] && return
    if command -v node >/dev/null 2>&1; then
        node -e "
try {
  const d = JSON.parse(require('fs').readFileSync('$f', 'utf8'));
  const pick = (o) => o && (o.id || o._id || o.Id || o.ID || '');
  const candidates = [d, d.data, d.item, d.result, d.company, d.application, d.contact, d.interview, d.call, d.followup, d.event];
  for (const c of candidates) {
    const id = pick(c);
    if (id) { process.stdout.write(String(id).trim()); process.exit(0); }
  }
} catch (e) {}
" 2>/dev/null
        return
    fi
    python3 -c "
import json
try:
    d = json.load(open('$f'))
    keys = ['id','_id','Id','ID']
    candidates = [d, d.get('data') if isinstance(d, dict) else None, d.get('item') if isinstance(d, dict) else None, d.get('result') if isinstance(d, dict) else None, d.get('company') if isinstance(d, dict) else None, d.get('application') if isinstance(d, dict) else None, d.get('contact') if isinstance(d, dict) else None, d.get('interview') if isinstance(d, dict) else None, d.get('call') if isinstance(d, dict) else None, d.get('followup') if isinstance(d, dict) else None, d.get('event') if isinstance(d, dict) else None]
    for c in candidates:
        if isinstance(c, dict):
            for k in keys:
                if c.get(k):
                    print(str(c.get(k)).strip(), end='')
                    raise SystemExit(0)
except: pass
" 2>/dev/null
}

# Fonction pour tester un endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local method="${3:-GET}"
    local data="$4"
    local expected_status="${5:-200}"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${BLUE}[$TOTAL_TESTS] Test: $name${NC}"
    
    local resp_file
    resp_file=$(mktemp /tmp/jt_api_XXXXXX.txt 2>/dev/null || echo "/tmp/jt_api_${TOTAL_TESTS}_$$.txt")
    local -a curl_args=(-s -w '%{http_code}' -o "$resp_file" --max-time 10)
    [ -n "$TOKEN" ] && curl_args+=(-H "Authorization: Bearer $TOKEN")
    [ "$method" != "GET" ] && curl_args+=(-X "$method")
    if [ -n "$data" ]; then
        curl_args+=(-H "Content-Type: application/json" -d "$data")
    fi
    curl_args+=("$url")

    local status_code
    status_code=$(curl "${curl_args[@]}" 2>/dev/null | tr -d '\n\r ')
    local response
    response=$(cat "$resp_file" 2>/dev/null || echo "")
    rm -f "$resp_file" 2>/dev/null || true
    
    # Accepter plusieurs codes (ex: "200 503" pour workflow-service absent)
    local ok=0
    for exp in $expected_status; do
        if [[ "$status_code" =~ ^$exp ]]; then ok=1; break; fi
    done
    if [ "$ok" -eq 1 ]; then
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

# Créer et obtenir un token utilisateur classique (rôle USER) pour tests fonctionnels
# Utilise d'abord l'utilisateur seedé (emailVerified: true) pour éviter 401 "email not verified"
get_token() {
    echo -e "${YELLOW}Authentification (utilisateur classique)...${NC}"

    SEEDED_EMAIL="${TEST_USER_EMAIL:-testuser@jobbingtrack.test}"
    SEEDED_PASSWORD="${TEST_USER_PASSWORD:-TestPassword123!}"

    # 1) Login avec l'utilisateur seedé (email déjà vérifié) — évite les échecs 401 email not verified
    LOGIN_DATA="{\"email\":\"$SEEDED_EMAIL\",\"password\":\"$SEEDED_PASSWORD\"}"
    curl -s -X POST "$API_URL/api/v1/auth/login" -H "Content-Type: application/json" -d "$LOGIN_DATA" --max-time 10 -o /tmp/response.txt 2>/dev/null || true

    if [ -f /tmp/response.txt ]; then
        if command -v node >/dev/null 2>&1; then
            TOKEN=$(node -e "try { const d=JSON.parse(require('fs').readFileSync('/tmp/response.txt','utf8')); process.stdout.write(d.token||''); } catch(e){}" 2>/dev/null)
        fi
        [ -z "$TOKEN" ] && TOKEN=$(python3 -c "import sys,json; print(json.load(open('/tmp/response.txt')).get('token',''), end='')" 2>/dev/null)
        [ -z "$TOKEN" ] && TOKEN=$(grep -o '"token":"[^"]*' /tmp/response.txt 2>/dev/null | cut -d'"' -f4)
        if [ -n "$TOKEN" ]; then
            echo -e "${GREEN}   ✓ Token utilisateur seedé obtenu (rôle USER, email vérifié)${NC}"
            return
        fi
    fi

    # 2) Fallback : admin (si seed non exécuté ou utilisateur test absent)
    get_admin_token
    if [ -n "$ADMIN_TOKEN" ]; then
        TOKEN="$ADMIN_TOKEN"
        echo -e "${YELLOW}   ⚠ Utilisation du token admin (lancez 'make db-seed' ou seed auth pour l'utilisateur test)${NC}"
    fi
}

# Obtenir un token admin (rôle SUPER_ADMIN) pour tests backoffice
get_admin_token() {
    echo -e "${YELLOW}Authentification admin...${NC}"
    ADMIN_EMAIL="${ADMIN_EMAIL:-admin@jobbingtrack.com}"
    ADMIN_PASSWORD="${ADMIN_PASSWORD:-password123}"
    LOGIN_DATA="{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}"
    test_endpoint "Login admin" "$API_URL/api/v1/auth/login" "POST" "$LOGIN_DATA" "200" "" || true

    if [ -f /tmp/response.txt ]; then
        if command -v node >/dev/null 2>&1; then
            ADMIN_TOKEN=$(node -e "try { const d=JSON.parse(require('fs').readFileSync('/tmp/response.txt','utf8')); process.stdout.write(d.token||''); } catch(e){}" 2>/dev/null)
        fi
        [ -z "$ADMIN_TOKEN" ] && ADMIN_TOKEN=$(python3 -c "import sys,json; print(json.load(open('/tmp/response.txt')).get('token',''), end='')" 2>/dev/null)
        [ -z "$ADMIN_TOKEN" ] && ADMIN_TOKEN=$(grep -o '"token":"[^"]*' /tmp/response.txt 2>/dev/null | cut -d'"' -f4)
        if [ -n "$ADMIN_TOKEN" ]; then
            echo -e "${GREEN}   ✓ Token admin obtenu (rôle SUPER_ADMIN)${NC}"
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
    # Profil de l'utilisateur connecté (auth-service), pas GET /users/:id avec id=profile
    test_endpoint "Get User Profile" "$API_URL/api/v1/auth/profile" "GET" "" "200" "$TOKEN"
}

test_companies() {
    echo -e "\n${YELLOW}═══ Entreprises ═══${NC}"
    [ -z "$TOKEN" ] && get_token
    test_endpoint "List Companies" "$API_URL/api/v1/companies" "GET" "" "200" "$TOKEN"
    COMPANY_DATA="{\"name\":\"Test Company $(date +%s)\",\"industry\":\"IT\",\"website\":\"https://test.com\"}"
    test_endpoint "Create Company" "$API_URL/api/v1/companies" "POST" "$COMPANY_DATA" "201" "$TOKEN"
    COMPANY_ID=$(extract_generic_id_from_file /tmp/response.txt)
    if [ -n "$COMPANY_ID" ]; then
        test_endpoint "Get Company by ID" "$API_URL/api/v1/companies/$COMPANY_ID" "GET" "" "200" "$TOKEN" || true
        test_endpoint "Update Company" "$API_URL/api/v1/companies/$COMPANY_ID" "PUT" "{\"name\":\"Test Company Updated $(date +%s)\",\"industry\":\"Tech\"}" "200" "$TOKEN" || true
        test_endpoint "Archive Company" "$API_URL/api/v1/companies/$COMPANY_ID/archive" "PUT" "" "200 204 404 405" "$TOKEN" || true
        test_endpoint "Restore Company" "$API_URL/api/v1/companies/$COMPANY_ID/restore" "PUT" "" "200 204 404 405" "$TOKEN" || true
        test_endpoint "Delete Company" "$API_URL/api/v1/companies/$COMPANY_ID" "DELETE" "" "200 204 404" "$TOKEN" || true
    fi
}

# Extrait un id depuis un fichier JSON (réponse Create Application). Node en priorité (disponible en Docker frontend), sinon Python.
extract_application_id_from_file() {
    local f="$1"
    [ ! -f "$f" ] && return
    if command -v node >/dev/null 2>&1; then
        node -e "
try {
  const d = JSON.parse(require('fs').readFileSync('$f', 'utf8'));
  const a = d.application || d.data;
  const id = (a && (a.id || a.Id)) || d.id || d.Id || '';
  if (id) process.stdout.write(String(id).trim());
} catch (e) {}
" 2>/dev/null
        return
    fi
    python3 -c "
import json
try:
    d = json.load(open('$f'));
    a = d.get('application') or d.get('data');
    out = (a.get('id') or a.get('Id') or '') if isinstance(a, dict) else (d.get('id') or d.get('Id') or '');
    print(str(out).strip(), end='')
except: pass
" 2>/dev/null
}

# Récupère l'id de la première candidature (pour Interview/Call/Followup)
get_first_application_id() {
    [ -z "$TOKEN" ] && return
    curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/api/v1/applications?limit=5" --max-time 10 -o /tmp/apps_list.json 2>/dev/null || true
    [ ! -f /tmp/apps_list.json ] && return
    if command -v node >/dev/null 2>&1; then
        node -e "
try {
  const d = JSON.parse(require('fs').readFileSync('/tmp/apps_list.json', 'utf8'));
  const apps = d.applications || d.data || [];
  const first = Array.isArray(apps) ? apps[0] : apps;
  const id = (first && (first.id || first.Id || first.ID)) || '';
  if (id) process.stdout.write(String(id).trim());
} catch (e) {}
" 2>/dev/null
        return
    fi
    python3 -c "
import json
try:
    d = json.load(open('/tmp/apps_list.json'));
    apps = d.get('applications') or d.get('data') or [];
    first = apps[0] if isinstance(apps, list) and apps else (apps if isinstance(apps, dict) else None);
    out = (first.get('id') or first.get('Id') or first.get('ID') or '') if first and isinstance(first, dict) else '';
    print(str(out).strip(), end='')
except: pass
" 2>/dev/null
}

test_applications() {
    echo -e "\n${YELLOW}═══ Candidatures ═══${NC}"
    [ -z "$TOKEN" ] && get_token
    test_endpoint "List Applications" "$API_URL/api/v1/applications" "GET" "" "200" "$TOKEN"
    APPLICATION_DATA="{\"position\":\"Développeur Full Stack\",\"companyName\":\"Tech Corp\",\"status\":\"CANDIDATE_PENDING\",\"location\":\"Paris\",\"contractType\":\"CDI\"}"
    test_endpoint "Create Application" "$API_URL/api/v1/applications" "POST" "$APPLICATION_DATA" "201" "$TOKEN"
    # Extraire l'id de la candidature créée (Node en priorité pour Docker frontend, sinon Python)
    CREATED_APPLICATION_ID=$(extract_application_id_from_file /tmp/response.txt)
    [ -z "$CREATED_APPLICATION_ID" ] && CREATED_APPLICATION_ID=$(get_first_application_id)
    echo -n "$CREATED_APPLICATION_ID" > /tmp/created_application_id.txt
    if [ -n "$CREATED_APPLICATION_ID" ]; then
        test_endpoint "Get Application by ID" "$API_URL/api/v1/applications/$CREATED_APPLICATION_ID" "GET" "" "200" "$TOKEN" || true
        test_endpoint "Update Application" "$API_URL/api/v1/applications/$CREATED_APPLICATION_ID" "PUT" "{\"status\":\"INTERVIEW_SCHEDULED\"}" "200 400" "$TOKEN" || true
        test_endpoint "Archive Application" "$API_URL/api/v1/applications/$CREATED_APPLICATION_ID/archive" "PUT" "" "200 204 404 405" "$TOKEN" || true
        test_endpoint "Restore Application" "$API_URL/api/v1/applications/$CREATED_APPLICATION_ID/restore" "PUT" "" "200 204 404 405" "$TOKEN" || true
    fi
}

test_contacts() {
    echo -e "\n${YELLOW}═══ Contacts ═══${NC}"
    [ -z "$TOKEN" ] && get_token
    test_endpoint "List Contacts" "$API_URL/api/v1/contacts" "GET" "" "200" "$TOKEN"
    CONTACT_DATA="{\"firstName\":\"John\",\"lastName\":\"Doe\",\"email\":\"john@test.com\",\"position\":\"Manager\"}"
    test_endpoint "Create Contact" "$API_URL/api/v1/contacts" "POST" "$CONTACT_DATA" "201" "$TOKEN"
    CONTACT_ID=$(extract_generic_id_from_file /tmp/response.txt)
    if [ -n "$CONTACT_ID" ]; then
        test_endpoint "Get Contact by ID" "$API_URL/api/v1/contacts/$CONTACT_ID" "GET" "" "200" "$TOKEN" || true
        test_endpoint "Update Contact" "$API_URL/api/v1/contacts/$CONTACT_ID" "PUT" "{\"firstName\":\"John Updated\",\"lastName\":\"Doe\"}" "200" "$TOKEN" || true
        test_endpoint "Archive Contact" "$API_URL/api/v1/contacts/$CONTACT_ID/archive" "PUT" "" "200 204 404 405" "$TOKEN" || true
        test_endpoint "Restore Contact" "$API_URL/api/v1/contacts/$CONTACT_ID/restore" "PUT" "" "200 204 404 405" "$TOKEN" || true
        test_endpoint "Delete Contact" "$API_URL/api/v1/contacts/$CONTACT_ID" "DELETE" "" "200 204 404" "$TOKEN" || true
    fi
}

test_interviews() {
    echo -e "\n${YELLOW}═══ Entretiens ═══${NC}"
    [ -z "$TOKEN" ] && get_token
    test_endpoint "List Interviews" "$API_URL/api/v1/interviews" "GET" "" "200" "$TOKEN"
    # Ordre : id de la candidature créée dans ce run (test_applications), puis fichier, puis liste, puis placeholder
    APPLICATION_ID="$CREATED_APPLICATION_ID"
    [ -z "$APPLICATION_ID" ] && [ -f /tmp/created_application_id.txt ] && APPLICATION_ID=$(cat /tmp/created_application_id.txt)
    [ -z "$APPLICATION_ID" ] && APPLICATION_ID=$(get_first_application_id)
    [ -z "$APPLICATION_ID" ] && APPLICATION_ID="placeholder-application-id"
    INTERVIEW_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    INTERVIEW_DATA="{\"applicationId\":\"$APPLICATION_ID\",\"interviewDate\":\"$INTERVIEW_DATE\",\"scheduledAt\":\"$INTERVIEW_DATE\",\"type\":\"technical\",\"location\":\"Paris\"}"
    test_endpoint "Create Interview" "$API_URL/api/v1/interviews" "POST" "$INTERVIEW_DATA" "201" "$TOKEN" || true
    INTERVIEW_ID=$(extract_generic_id_from_file /tmp/response.txt)
    if [ -n "$INTERVIEW_ID" ]; then
        test_endpoint "Get Interview by ID" "$API_URL/api/v1/interviews/$INTERVIEW_ID" "GET" "" "200" "$TOKEN" || true
        test_endpoint "Update Interview" "$API_URL/api/v1/interviews/$INTERVIEW_ID" "PUT" "{\"type\":\"hr\"}" "200 400" "$TOKEN" || true
        test_endpoint "Archive Interview" "$API_URL/api/v1/interviews/$INTERVIEW_ID/archive" "PUT" "" "200 204 404 405" "$TOKEN" || true
        test_endpoint "Restore Interview" "$API_URL/api/v1/interviews/$INTERVIEW_ID/restore" "PUT" "" "200 204 404 405" "$TOKEN" || true
        test_endpoint "Delete Interview" "$API_URL/api/v1/interviews/$INTERVIEW_ID" "DELETE" "" "200 204 404" "$TOKEN" || true
    fi
}

test_calls() {
    echo -e "\n${YELLOW}═══ Appels ═══${NC}"
    [ -z "$TOKEN" ] && get_token
    test_endpoint "List Calls" "$API_URL/api/v1/calls" "GET" "" "200" "$TOKEN"
    APPLICATION_ID="$CREATED_APPLICATION_ID"
    [ -z "$APPLICATION_ID" ] && [ -f /tmp/created_application_id.txt ] && APPLICATION_ID=$(cat /tmp/created_application_id.txt)
    [ -z "$APPLICATION_ID" ] && APPLICATION_ID=$(get_first_application_id)
    [ -z "$APPLICATION_ID" ] && APPLICATION_ID="placeholder-application-id"
    CALL_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    CALL_DATA="{\"applicationId\":\"$APPLICATION_ID\",\"subject\":\"Appel de suivi test\",\"callDate\":\"$CALL_DATE\",\"duration\":30,\"notes\":\"Test call\"}"
    test_endpoint "Create Call" "$API_URL/api/v1/calls" "POST" "$CALL_DATA" "201" "$TOKEN" || true
    CALL_ID=$(extract_generic_id_from_file /tmp/response.txt)
    if [ -n "$CALL_ID" ]; then
        test_endpoint "Get Call by ID" "$API_URL/api/v1/calls/$CALL_ID" "GET" "" "200" "$TOKEN" || true
        test_endpoint "Update Call" "$API_URL/api/v1/calls/$CALL_ID" "PUT" "{\"subject\":\"Appel de suivi modifié\"}" "200 400" "$TOKEN" || true
        test_endpoint "Archive Call" "$API_URL/api/v1/calls/$CALL_ID/archive" "PUT" "" "200 204 404 405" "$TOKEN" || true
        test_endpoint "Restore Call" "$API_URL/api/v1/calls/$CALL_ID/restore" "PUT" "" "200 204 404 405" "$TOKEN" || true
        test_endpoint "Delete Call" "$API_URL/api/v1/calls/$CALL_ID" "DELETE" "" "200 204 404" "$TOKEN" || true
    fi
}

test_events() {
    echo -e "\n${YELLOW}═══ Événements ═══${NC}"
    [ -z "$TOKEN" ] && get_token
    test_endpoint "List Events" "$API_URL/api/v1/events" "GET" "" "200" "$TOKEN"
    EVENT_DATA="{\"title\":\"Test Event\",\"startDate\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"endDate\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
    test_endpoint "Create Event" "$API_URL/api/v1/events" "POST" "$EVENT_DATA" "201" "$TOKEN" || true
    EVENT_ID=$(extract_generic_id_from_file /tmp/response.txt)
    if [ -n "$EVENT_ID" ]; then
        test_endpoint "Get Event by ID" "$API_URL/api/v1/events/$EVENT_ID" "GET" "" "200" "$TOKEN" || true
        test_endpoint "Update Event" "$API_URL/api/v1/events/$EVENT_ID" "PUT" "{\"title\":\"Test Event Updated\"}" "200 400" "$TOKEN" || true
        test_endpoint "Archive Event" "$API_URL/api/v1/events/$EVENT_ID/archive" "PUT" "" "200 204 404 405" "$TOKEN" || true
        test_endpoint "Restore Event" "$API_URL/api/v1/events/$EVENT_ID/restore" "PUT" "" "200 204 404 405" "$TOKEN" || true
        test_endpoint "Delete Event" "$API_URL/api/v1/events/$EVENT_ID" "DELETE" "" "200 204 404" "$TOKEN" || true
    fi
}

test_followups() {
    echo -e "\n${YELLOW}═══ Relances ═══${NC}"
    [ -z "$TOKEN" ] && get_token
    test_endpoint "List Followups" "$API_URL/api/v1/followups" "GET" "" "200" "$TOKEN"
    FOLLOWUP_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    APPLICATION_ID="$CREATED_APPLICATION_ID"
    [ -z "$APPLICATION_ID" ] && [ -f /tmp/created_application_id.txt ] && APPLICATION_ID=$(cat /tmp/created_application_id.txt)
    [ -z "$APPLICATION_ID" ] && APPLICATION_ID=$(get_first_application_id)
    [ -z "$APPLICATION_ID" ] && APPLICATION_ID="placeholder-application-id"
    FOLLOWUP_DATA="{\"applicationId\":\"$APPLICATION_ID\",\"type\":\"email\",\"followUpDate\":\"$FOLLOWUP_DATE\",\"notes\":\"Test followup\"}"
    test_endpoint "Create Followup" "$API_URL/api/v1/followups" "POST" "$FOLLOWUP_DATA" "201" "$TOKEN" || true
    FOLLOWUP_ID=$(extract_generic_id_from_file /tmp/response.txt)
    if [ -n "$FOLLOWUP_ID" ]; then
        test_endpoint "Get Followup by ID" "$API_URL/api/v1/followups/$FOLLOWUP_ID" "GET" "" "200" "$TOKEN" || true
        test_endpoint "Update Followup" "$API_URL/api/v1/followups/$FOLLOWUP_ID" "PUT" "{\"notes\":\"Test followup updated\"}" "200 400" "$TOKEN" || true
        test_endpoint "Archive Followup" "$API_URL/api/v1/followups/$FOLLOWUP_ID/archive" "PUT" "" "200 204 404 405" "$TOKEN" || true
        test_endpoint "Restore Followup" "$API_URL/api/v1/followups/$FOLLOWUP_ID/restore" "PUT" "" "200 204 404 405" "$TOKEN" || true
        test_endpoint "Delete Followup" "$API_URL/api/v1/followups/$FOLLOWUP_ID" "DELETE" "" "200 204 404" "$TOKEN" || true
    fi

    # Nettoyage final de la candidature créée pour le run (si endpoint autorise)
    if [ -n "$CREATED_APPLICATION_ID" ]; then
        test_endpoint "Delete Application (cleanup fin de run)" "$API_URL/api/v1/applications/$CREATED_APPLICATION_ID" "DELETE" "" "200 204 404" "$TOKEN" || true
    fi
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
    echo -e "\n${YELLOW}═══ Métriques / Metrics-Aggregator ═══${NC}"
    [ -z "$TOKEN" ] && get_token
    test_endpoint "Get Metrics (metrics-aggregator via gateway)" "$API_URL/api/v1/metrics" "GET" "" "200" "$TOKEN" || true
    test_endpoint "Get Dashboard Statistics" "$API_URL/api/v1/dashboard/statistics" "GET" "" "200" "$TOKEN" || true
}

test_dashboard() {
    echo -e "\n${YELLOW}═══ Dashboard & Analytics ═══${NC}"
    [ -z "$TOKEN" ] && get_token
    test_endpoint "Dashboard Statistics" "$API_URL/api/v1/dashboard/statistics" "GET" "" "200" "$TOKEN" || true
    test_endpoint "Analytics Events" "$API_URL/api/v1/analytics/events?limit=5" "GET" "" "200" "$TOKEN" || true
    # 200 OK ou 503 si workflow-service non déployé
    test_endpoint "Analytics Errors" "$API_URL/api/v1/analytics/errors?limit=5" "GET" "" "200 503" "$TOKEN" || true
    test_endpoint "Analytics Stats" "$API_URL/api/v1/analytics/stats?days=7" "GET" "" "200" "$TOKEN" || true
}

test_emails() {
    echo -e "\n${YELLOW}═══ Emails (logs, stats) ═══${NC}"
    [ -z "$TOKEN" ] && get_token
    test_endpoint "Emails Logs" "$API_URL/api/v1/emails/logs" "GET" "" "200" "$TOKEN" || true
    test_endpoint "Emails Stats" "$API_URL/api/v1/emails/stats?days=30" "GET" "" "200" "$TOKEN" || true
}

test_workflow() {
    echo -e "\n${YELLOW}═══ Workflow Service ═══${NC}"
    [ -z "$TOKEN" ] && get_token
    # 200 si workflow-service démarré, 503 si absent (profil full optionnel)
    test_endpoint "List Workflows" "$API_URL/api/v1/workflows" "GET" "" "200 503" "$TOKEN"
}

test_security() {
    echo -e "\n${YELLOW}═══ Security Service ═══${NC}"
    [ -z "$TOKEN" ] && get_token
    test_endpoint "Security Firewall Rules" "$API_URL/api/v1/security/firewall/rules" "GET" "" "200" "$TOKEN" || true
    test_endpoint "Security Blocked IPs" "$API_URL/api/v1/security/firewall/blocked-ips" "GET" "" "200" "$TOKEN" || true
    test_endpoint "Security WAF Config" "$API_URL/api/v1/security/waf/config" "GET" "" "200" "$TOKEN" || true
    test_endpoint "Security Logs" "$API_URL/api/v1/security/logs?limit=10" "GET" "" "200" "$TOKEN" || true
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
            dashboard) test_dashboard ;;
            emails) test_emails ;;
            workflow) test_workflow ;;
            security) test_security ;;
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
    test_dashboard
    test_emails
    test_workflow
    test_security
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

