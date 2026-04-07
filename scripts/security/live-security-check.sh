#!/usr/bin/env bash

set -euo pipefail

API_GATEWAY_URL="${API_GATEWAY_URL:-http://localhost:5002}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5003}"
SECURITY_SERVICE_URL="${SECURITY_SERVICE_URL:-http://localhost:5017}"
# Même valeur par défaut que docker-compose (appels directs host → conteneur firewall/waf)
SECURITY_INTERNAL_SECRET="${SECURITY_INTERNAL_SECRET:-jobbingtrack-internal-security-dev}"
export SECURITY_INTERNAL_SECRET
WATCH_SECONDS="${WATCH_SECONDS:-25}"
STRICT_MODE="${STRICT_MODE:-1}"
LOAD_TEST_ENABLED="${LOAD_TEST_ENABLED:-1}"
LOAD_REQUESTS="${LOAD_REQUESTS:-120}"
LOAD_CONCURRENCY="${LOAD_CONCURRENCY:-20}"
ATTACK_IMAGE="${ATTACK_IMAGE:-curlimages/curl:8.8.0}"
ATTACK_NETWORK="${ATTACK_NETWORK:-}"
ATTACK_SOURCE_IP="${ATTACK_SOURCE_IP:-198.51.100.44}"
ATTACK_TARGET_BASE="${ATTACK_TARGET_BASE:-http://jobbingtrack-api-gateway:3000}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0
SEC_LOG_PID=""
GW_LOG_PID=""

cleanup() {
  kill "${SEC_LOG_PID:-}" "${GW_LOG_PID:-}" >/dev/null 2>&1 || true
  wait "${SEC_LOG_PID:-}" "${GW_LOG_PID:-}" 2>/dev/null || true
}
trap cleanup EXIT

echo "🛡️  Security Live Check (WAF + Firewall + Logs temps réel)"
echo "=========================================================="
echo "Gateway:  ${API_GATEWAY_URL}"
echo "Frontend: ${FRONTEND_URL}"
echo "Security: ${SECURITY_SERVICE_URL}"
echo "Strict:   ${STRICT_MODE} (1=échec si protection KO)"
echo ""

pass() {
  local msg="$1"
  echo -e "  ${GREEN}✅ ${msg}${NC}"
  TESTS_PASSED=$((TESTS_PASSED + 1))
}

fail() {
  local msg="$1"
  echo -e "  ${RED}❌ ${msg}${NC}"
  TESTS_FAILED=$((TESTS_FAILED + 1))
}

warn() {
  local msg="$1"
  echo -e "  ${YELLOW}⚠️  ${msg}${NC}"
}

check_http_soft() {
  local url="$1"
  local label="$2"
  local code
  code="$(curl -s -o /dev/null -w "%{http_code}" "$url" || true)"
  if [[ "$code" =~ ^2|3 ]]; then
    pass "${label} (HTTP ${code})"
  else
    warn "${label} (HTTP ${code})"
  fi
}

http_code() {
  local method="$1"
  local url="$2"
  local body="${3:-}"
  local ua="${4:-SecurityLiveCheck/1.0}"
  local sec_h=()
  if [[ -n "${SECURITY_INTERNAL_SECRET:-}" ]]; then
    sec_h=( -H "X-Internal-Secret: ${SECURITY_INTERNAL_SECRET}" )
  fi

  if [[ "$method" == "GET" ]]; then
    curl -sS -o /dev/null -w "%{http_code}" -A "$ua" -X GET "${sec_h[@]}" "$url" || echo "000"
    return
  fi
  if [[ "$method" == "POST" ]]; then
    curl -sS -o /dev/null -w "%{http_code}" -A "$ua" -X POST \
      -H "Content-Type: application/json" \
      "${sec_h[@]}" \
      -d "$body" "$url" || echo "000"
    return
  fi
  if [[ "$method" == "PUT" ]]; then
    curl -sS -o /dev/null -w "%{http_code}" -A "$ua" -X PUT \
      -H "Content-Type: application/json" \
      "${sec_h[@]}" \
      -d "$body" "$url" || echo "000"
    return
  fi
  echo "000"
}

snapshot_log_count() {
  local url="$1"
  local raw
  raw="$(curl -sS "$url" || true)"
  printf "%s" "$raw" | python -c 'import json,sys
try:
    d=json.load(sys.stdin)
    print(len(d.get("data", [])))
except Exception:
    print(0)'
}

detect_attack_network() {
  if [[ -n "${ATTACK_NETWORK}" ]]; then
    echo "${ATTACK_NETWORK}"
    return
  fi
  ATTACK_NETWORK="$(docker inspect jobbingtrack-api-gateway --format '{{range $k, $_ := .NetworkSettings.Networks}}{{println $k}}{{end}}' 2>/dev/null | awk 'NF{print $1; exit}')"
  if [[ -z "${ATTACK_NETWORK}" ]]; then
    ATTACK_NETWORK="bridge"
  fi
  echo "${ATTACK_NETWORK}"
}

container_http_code() {
  local path="$1"
  local ua="${2:-SecurityLiveCheckContainer/1.0}"
  local spoof_ip="${3:-${ATTACK_SOURCE_IP}}"
  local network
  local url
  network="$(detect_attack_network)"
  url="${ATTACK_TARGET_BASE}${path}"
  docker run --rm --network "${network}" "${ATTACK_IMAGE}" \
    -sS -o /dev/null -w "%{http_code}" \
    -H "X-Forwarded-For: ${spoof_ip}" \
    -H "X-Real-IP: ${spoof_ip}" \
    -A "${ua}" \
    "${url}" 2>/dev/null || echo "000"
}

expect_code_in() {
  local label="$1"
  local got="$2"
  local allowed_csv="$3"
  local ok=1
  IFS=',' read -r -a allowed <<< "$allowed_csv"
  for c in "${allowed[@]}"; do
    if [[ "$got" == "$c" ]]; then
      ok=0
      break
    fi
  done
  if [[ $ok -eq 0 ]]; then
    pass "${label} => HTTP ${got} (attendu: ${allowed_csv})"
  else
    fail "${label} => HTTP ${got} (attendu: ${allowed_csv})"
  fi
}

echo "1) Vérification disponibilité des endpoints..."
check_http_soft "${API_GATEWAY_URL}/health" "API Gateway /health"
check_http_soft "${FRONTEND_URL}/login" "Frontend /login"
check_http_soft "${SECURITY_SERVICE_URL}/health" "Security-service /health"
sec_probe_hdr=()
if [[ -n "${SECURITY_INTERNAL_SECRET:-}" ]]; then
  sec_probe_hdr=( -H "X-Internal-Secret: ${SECURITY_INTERNAL_SECRET}" )
fi
code_fw="$(curl -s -o /dev/null -w "%{http_code}" "${sec_probe_hdr[@]}" "${SECURITY_SERVICE_URL}/api/v1/security/firewall/rules" || true)"
if [[ "$code_fw" =~ ^2|3 ]]; then
  pass "Security firewall rules (HTTP ${code_fw})"
else
  warn "Security firewall rules (HTTP ${code_fw})"
fi
code_waf="$(curl -s -o /dev/null -w "%{http_code}" "${sec_probe_hdr[@]}" "${SECURITY_SERVICE_URL}/api/v1/security/waf/config" || true)"
if [[ "$code_waf" =~ ^2|3 ]]; then
  pass "Security WAF config (HTTP ${code_waf})"
else
  warn "Security WAF config (HTTP ${code_waf})"
fi
echo ""

echo "1.b) Vérification WAF actif sur API Gateway (header runtime)..."
waf_header="$(curl -sSI "${API_GATEWAY_URL}/api/v1/waf/stats?probe=1" | tr -d '\r' | awk 'BEGIN{IGNORECASE=1} /^X-WAF-Status:/{sub(/^X-WAF-Status:[[:space:]]*/, ""); print; exit}')"
if [[ -n "${waf_header}" ]]; then
  pass "Header X-WAF-Status présent (${waf_header})"
else
  fail "Header X-WAF-Status absent (WAF gateway probablement désactivé)"
fi
echo ""

echo "2) Snapshot initial des logs sécurité..."
before_count="$(snapshot_log_count "${SECURITY_SERVICE_URL}/api/v1/security/logs?limit=200")"
echo "  Logs sécurité visibles avant test: ${before_count}"
START_TS="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "  Marque temporelle test: ${START_TS}"
echo ""

echo "3) Lancement du suivi logs live (${WATCH_SECONDS}s)..."
echo "   (security-service + api-gateway, filtres WAF/Firewall/Threat)"
(
  timeout "${WATCH_SECONDS}" docker logs -f jobbingtrack-security-service 2>&1 | \
    awk '/waf|firewall|threat|blocked|intrusion|SYN_FLOOD|SUSPICIOUS_REQUEST|sql|xss|security/i { print "[security] " $0; fflush(); }'
) &
SEC_LOG_PID=$!
(
  timeout "${WATCH_SECONDS}" docker logs -f jobbingtrack-api-gateway 2>&1 | \
    awk '/security|firewall|waf|\/api\/v1\/security/i { print "[gateway]  " $0; fflush(); }'
) &
GW_LOG_PID=$!

sleep 1

echo ""
echo "4) Scénarios de sécurité (trafic légitime vs attaques via conteneur isolé + IP spoof)..."
echo "  Réseau d'attaque: $(detect_attack_network)"
echo "  Source spoofée: ${ATTACK_SOURCE_IP}"

# Cas légitime (doit passer)
normal_code="$(container_http_code "/api/v1/waf/stats?health=ok" "Mozilla/5.0 (SecurityLiveCheck)")"
expect_code_in "Trafic normal (GET /api/v1/waf/stats)" "$normal_code" "200"

# Cas malveillants (doivent être bloqués)
sqli_code="$(container_http_code "/api/v1/waf/stats?q=1%20UNION%20SELECT%20*%20FROM%20users" "sqlmap/1.7")"
expect_code_in "SQLi (query UNION SELECT)" "$sqli_code" "400,403"

xss_code="$(container_http_code "/api/v1/waf/stats?msg=%3Cscript%3Ealert(1)%3C/script%3E" "Mozilla/5.0 (XSSProbe)")"
expect_code_in "XSS (query <script>)" "$xss_code" "400,403"

path_code="$(container_http_code "/api/v1/waf/stats?file=..%2F..%2Fetc%2Fpasswd" "curl/8.8.0")"
expect_code_in "Path Traversal (../etc/passwd)" "$path_code" "403"

ua_attack_code="$(container_http_code "/api/v1/waf/stats" "sqlmap/1.7")"
expect_code_in "User-Agent malveillant (sqlmap)" "$ua_attack_code" "400,403"

echo ""
echo "5) Validation Firewall/Security API (création menaces/règles)..."
# test-firewall utilise X-Internal-Secret (pas seulement Bearer) : firewall → security-service direct ;
# les tests /api/v1/auth/* restent sur la gateway (AUTH_GATEWAY_URL).
if FIREWALL_BASE_URL="${SECURITY_SERVICE_URL}" AUTH_GATEWAY_URL="${API_GATEWAY_URL}" ./scripts/security/test-firewall.sh; then
  pass "test-firewall.sh (API security/firewall)"
else
  fail "test-firewall.sh a échoué"
fi
if API_URL="${SECURITY_SERVICE_URL}" ./scripts/security/generate-test-threats.sh; then
  pass "generate-test-threats.sh (injection d'événements)"
else
  fail "generate-test-threats.sh a échoué"
fi

echo ""
echo "5.b) Réactivation protections WAF avant test de charge..."
reset_waf_code="$(http_code "PUT" "${SECURITY_SERVICE_URL}/api/v1/security/waf/toggle" '{"enabled":true}')"
expect_code_in "WAF enabled=true" "$reset_waf_code" "200"
reset_rule_code="$(http_code "PUT" "${SECURITY_SERVICE_URL}/api/v1/security/waf/rules/SQL_INJECTION" '{"enabled":true}')"
expect_code_in "WAF rule SQL_INJECTION enabled=true" "$reset_rule_code" "200"
echo ""

echo ""
echo "6) Validation sous charge (attaques réelles + trafic légitime)..."
if [[ "${LOAD_TEST_ENABLED}" = "1" ]]; then
  tmp_results="$(mktemp)"
  export API_GATEWAY_URL tmp_results ATTACK_IMAGE ATTACK_TARGET_BASE
  export LOAD_REQUESTS LOAD_CONCURRENCY

  seq 1 "${LOAD_REQUESTS}" | xargs -I{} -P "${LOAD_CONCURRENCY}" sh -c '
    i="$1"
    attack_mod=$((i % 5))
    net="$(docker inspect jobbingtrack-api-gateway --format "{{range \$k, \$_ := .NetworkSettings.Networks}}{{println \$k}}{{end}}" 2>/dev/null | awk "NF{print \$1; exit}")"
    [ -z "$net" ] && net="bridge"
    base="${ATTACK_TARGET_BASE:-http://jobbingtrack-api-gateway:3000}"
    spoof="203.0.113.$((10 + (i % 200)))"
    if [ "$attack_mod" -eq 0 ]; then
      # Trafic légitime
      code=$(docker run --rm --network "$net" "${ATTACK_IMAGE}" -sS -o /dev/null -w "%{http_code}" \
        -H "X-Forwarded-For: $spoof" -A "Mozilla/5.0 (LegitBurst)" \
        "${base}/api/v1/waf/stats?ok=1" 2>/dev/null || echo 000)
      echo "NORMAL:$code" >> "${tmp_results}"
    elif [ "$attack_mod" -eq 1 ]; then
      code=$(docker run --rm --network "$net" "${ATTACK_IMAGE}" -sS -o /dev/null -w "%{http_code}" \
        -H "X-Forwarded-For: $spoof" -A "sqlmap/1.7" \
        "${base}/api/v1/waf/stats?q=1%20UNION%20SELECT%20*%20FROM%20users" 2>/dev/null || echo 000)
      echo "ATTACK:$code" >> "${tmp_results}"
    elif [ "$attack_mod" -eq 2 ]; then
      code=$(docker run --rm --network "$net" "${ATTACK_IMAGE}" -sS -o /dev/null -w "%{http_code}" \
        -H "X-Forwarded-For: $spoof" -A "Mozilla/5.0 (XSSBurst)" \
        "${base}/api/v1/waf/stats?msg=%3Cscript%3Ealert(1)%3C/script%3E" 2>/dev/null || echo 000)
      echo "ATTACK:$code" >> "${tmp_results}"
    elif [ "$attack_mod" -eq 3 ]; then
      code=$(docker run --rm --network "$net" "${ATTACK_IMAGE}" -sS -o /dev/null -w "%{http_code}" \
        -H "X-Forwarded-For: $spoof" -A "curl/8.8.0" \
        "${base}/api/v1/waf/stats?file=..%2F..%2Fetc%2Fpasswd" 2>/dev/null || echo 000)
      echo "ATTACK:$code" >> "${tmp_results}"
    else
      code=$(docker run --rm --network "$net" "${ATTACK_IMAGE}" -sS -o /dev/null -w "%{http_code}" \
        -H "X-Forwarded-For: $spoof" -A "sqlmap/1.7" \
        "${base}/api/v1/waf/stats" 2>/dev/null || echo 000)
      echo "ATTACK:$code" >> "${tmp_results}"
    fi
  ' _ {}

  stats_line="$(python - "$tmp_results" <<'PY'
import re,sys
p=sys.argv[1]
total_attack=0
total_normal=0
blocked_attack=0
ok_normal=0
with open(p, 'r', encoding='utf-8', errors='ignore') as f:
    for line in f:
        s=line.strip()
        if s.startswith('ATTACK:'):
            total_attack += 1
            if re.match(r'^ATTACK:(400|403)$', s):
                blocked_attack += 1
        elif s.startswith('NORMAL:'):
            total_normal += 1
            if s == 'NORMAL:200':
                ok_normal += 1
print(f"{total_attack} {total_normal} {blocked_attack} {ok_normal}")
PY
)"
  total_attack="$(printf "%s" "$stats_line" | awk '{print $1}')"
  total_normal="$(printf "%s" "$stats_line" | awk '{print $2}')"
  blocked_attack="$(printf "%s" "$stats_line" | awk '{print $3}')"
  ok_normal="$(printf "%s" "$stats_line" | awk '{print $4}')"

  attack_ratio=0
  normal_ratio=0
  if [[ "${total_attack}" -gt 0 ]]; then
    attack_ratio=$(( blocked_attack * 100 / total_attack ))
  fi
  if [[ "${total_normal}" -gt 0 ]]; then
    normal_ratio=$(( ok_normal * 100 / total_normal ))
  fi

  echo "  Attaques bloquées: ${blocked_attack}/${total_attack} (${attack_ratio}%)"
  echo "  Trafic normal OK: ${ok_normal}/${total_normal} (${normal_ratio}%)"

  if [[ "${attack_ratio}" -ge 80 ]]; then
    pass "Blocage sous charge >= 80%"
  else
    fail "Blocage sous charge insuffisant (< 80%)"
  fi
  if [[ "${normal_ratio}" -ge 90 ]]; then
    pass "Disponibilité trafic normal sous charge >= 90%"
  else
    fail "Trafic normal trop impacté sous charge (< 90%)"
  fi

  rm -f "$tmp_results"
else
  warn "LOAD_TEST_ENABLED=0 -> test sous charge ignoré"
fi

echo ""
echo "7) Pause courte pour laisser remonter les logs..."
sleep 5

echo ""
echo "8) Snapshot final des logs sécurité..."
after_count="$(snapshot_log_count "${SECURITY_SERVICE_URL}/api/v1/security/logs?limit=200")"
delta=$((after_count - before_count))
echo "  Logs sécurité visibles après test: ${after_count}"
echo "  Delta visible: ${delta}"
if [[ "$delta" -ge 1 ]]; then
  pass "Nouveaux événements de sécurité visibles (+${delta})"
else
  fail "Aucun nouvel événement sécurité visible (delta=${delta})"
fi

echo ""
echo "9) Menaces récentes via firewall API..."
threats_raw="$(curl -sS "${sec_probe_hdr[@]}" "${SECURITY_SERVICE_URL}/api/v1/security/firewall/threats" || true)"
threats_parsed="$(printf "%s" "${threats_raw}" | python -c 'import json,sys
try:
    d=json.load(sys.stdin)
    data=d.get("data") or d.get("threats") or []
    print(f"  Menaces récupérées: {len(data)}")
    for t in data[:5]:
        tt=t.get("threatType","?")
        ip=t.get("sourceIp","?")
        sev=t.get("severity","?")
        print(f"   - {tt} | {ip} | {sev}")
except Exception:
    print("PARSE_ERROR")
')"
if [[ "${threats_parsed}" == "PARSE_ERROR" ]]; then
  fail "Impossible de parser les menaces"
else
  printf "%s\n" "${threats_parsed}"
  pass "Parsing menaces OK"
fi

echo ""
echo "10) Vérification des logs Docker depuis le début du test..."
gateway_matches="$(docker logs --since "${START_TS}" jobbingtrack-api-gateway 2>&1 | awk 'BEGIN{c=0} /waf|blocked|malveillant|attack|sql|xss|path traversal|WAF_BLOCKED/i {c++} END{print c}')"
security_matches="$(docker logs --since "${START_TS}" jobbingtrack-security-service 2>&1 | awk 'BEGIN{c=0} /firewall|threat|blocked|intrusion|network_threat_detected|waf/i {c++} END{print c}')"
echo "  Matches logs gateway depuis test: ${gateway_matches}"
echo "  Matches logs security depuis test: ${security_matches}"
if [[ "${gateway_matches}" -ge 1 ]]; then
  pass "Logs API Gateway montrent des détections WAF"
else
  fail "Pas de trace WAF détectée dans logs API Gateway"
fi
if [[ "${security_matches}" -ge 1 ]]; then
  pass "Logs Security Service montrent activité firewall/threat"
else
  fail "Pas de trace firewall/threat dans logs security-service"
fi

echo ""
echo "11) Arrêt du suivi live..."
cleanup

echo ""
echo "=========================="
echo "📊 RÉSULTAT VALIDATION"
echo "=========================="
echo -e "${GREEN}✅ PASS: ${TESTS_PASSED}${NC}"
if [[ "${TESTS_FAILED}" -gt 0 ]]; then
  echo -e "${RED}❌ FAIL: ${TESTS_FAILED}${NC}"
else
  echo "❌ FAIL: 0"
fi
echo ""
if [[ "${TESTS_FAILED}" -eq 0 ]]; then
  echo -e "${GREEN}✅ Security live-check VALIDÉ.${NC}"
else
  echo -e "${RED}❌ Security live-check NON VALIDÉ.${NC}"
fi
echo "Vérifie ensuite dans le backoffice:"
echo " - /backoffice/security/logs"
echo " - /backoffice/security/threats"
echo " - /backoffice/security/firewall"

if [[ "${STRICT_MODE}" = "1" && "${TESTS_FAILED}" -gt 0 ]]; then
  exit 1
fi
exit 0
