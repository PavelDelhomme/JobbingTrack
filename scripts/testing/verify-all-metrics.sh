#!/bin/bash

###############################################################################
# Verification manuelle des metriques et services JobbingTrack.
#
# Contrat actuel:
# - metrics-aggregator expose l'hote sur 5004 (interne 3014)
# - api-gateway expose l'hote sur 5002 (interne 3000)
# - les routes metrics/docker/persistence sont protegees par X-API-Key si
#   ENABLE_METRICS_AUTH=true
###############################################################################

set -u

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
read_env_key() {
    local key="$1"
    local env_file="${ROOT_DIR}/.env"

    if [ -n "${!key:-}" ]; then
        printf '%s' "${!key}"
        return 0
    fi

    if [ -f "$env_file" ]; then
        awk -F= -v k="$key" '
            $1 == k {
                sub(/^[[:space:]]*/, "", $2)
                sub(/[[:space:]]*$/, "", $2)
                gsub(/^["'\'']|["'\'']$/, "", $2)
                print $2
                exit
            }
        ' "$env_file"
    fi
}

env_or_file() {
    local key="$1"
    local default_value="${2:-}"
    local file_value

    if [ -n "${!key:-}" ]; then
        printf '%s' "${!key}"
        return 0
    fi

    file_value="$(read_env_key "$key")"
    if [ -n "$file_value" ]; then
        printf '%s' "$file_value"
        return 0
    fi

    printf '%s' "$default_value"
}

METRICS_AGGREGATOR_PORT_VALUE="$(env_or_file METRICS_AGGREGATOR_PORT 5004)"
API_GATEWAY_PORT_VALUE="$(env_or_file API_GATEWAY_PORT 5002)"
METRICS_URL="${METRICS_URL:-$(read_env_key METRICS_URL)}"
METRICS_URL="${METRICS_URL:-http://127.0.0.1:${METRICS_AGGREGATOR_PORT_VALUE}}"
API_GATEWAY_URL="${API_GATEWAY_URL:-$(read_env_key API_GATEWAY_URL)}"
API_GATEWAY_URL="${API_GATEWAY_URL:-$(read_env_key API_URL)}"
API_GATEWAY_URL="${API_GATEWAY_URL:-http://127.0.0.1:${API_GATEWAY_PORT_VALUE}}"

case "$METRICS_URL" in
    *jobbingtrack-metrics-aggregator*|*metrics-aggregator*)
        METRICS_URL="http://127.0.0.1:${METRICS_AGGREGATOR_PORT_VALUE}"
        ;;
esac

case "$API_GATEWAY_URL" in
    *jobbingtrack-api-gateway*|*api-gateway*)
        API_GATEWAY_URL="http://127.0.0.1:${API_GATEWAY_PORT_VALUE}"
        ;;
esac

MIN_HISTORY_POINTS="${MIN_HISTORY_POINTS:-3}"
TEST_SERVICES=(${TEST_SERVICES:-jobbingtrack-postgres jobbingtrack-auth-service jobbingtrack-redis})

TESTS_PASSED=0
TESTS_FAILED=0
WARNINGS=0
SKIPPED=0

METRICS_API_KEY_VALUE="$(read_env_key METRICS_API_KEY)"

metrics_curl() {
    local url="$1"
    shift || true

    if [ -n "$METRICS_API_KEY_VALUE" ]; then
        curl -sS -f -m 10 -H "X-API-Key: ${METRICS_API_KEY_VALUE}" "$url" "$@"
    else
        curl -sS -f -m 10 "$url" "$@"
    fi
}

public_curl() {
    curl -sS -f -m 10 "$1"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((TESTS_PASSED++))
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    ((TESTS_FAILED++))
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

log_skip() {
    echo -e "${YELLOW}⏭️  $1${NC}"
    ((SKIPPED++))
}

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_section() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo ""
}

require_command() {
    if command -v "$1" > /dev/null 2>&1; then
        log_success "Commande $1 disponible"
    else
        log_error "Commande $1 manquante"
    fi
}

json_has_path() {
    local json="$1"
    local jq_path="$2"
    echo "$json" | jq -e "$jq_path" > /dev/null 2>&1
}

json_number_in_range() {
    local json="$1"
    local jq_path="$2"
    local min="$3"
    local max="$4"
    echo "$json" | jq -e "($jq_path | type == \"number\") and ($jq_path >= $min) and ($jq_path <= $max)" > /dev/null 2>&1
}

###############################################################################
log_section "Configuration"
###############################################################################

echo "Metrics URL : ${METRICS_URL}"
echo "Gateway URL : ${API_GATEWAY_URL}"
if [ -n "$METRICS_API_KEY_VALUE" ]; then
    echo "Metrics auth: X-API-Key disponible"
else
    echo "Metrics auth: aucune cle trouvee (routes protegees possiblement ignorees)"
fi

require_command curl
require_command jq

###############################################################################
log_section "Services de base"
###############################################################################

if public_curl "${METRICS_URL}/health" > /dev/null 2>&1 || public_curl "${METRICS_URL}/api/v1/health" > /dev/null 2>&1; then
    log_success "Metrics Aggregator accessible"
else
    log_error "Metrics Aggregator inaccessible (${METRICS_URL})"
fi

if public_curl "${API_GATEWAY_URL}/health" > /dev/null 2>&1 || public_curl "${API_GATEWAY_URL}/api/v1/health" > /dev/null 2>&1; then
    log_success "API Gateway accessible"
else
    log_error "API Gateway inaccessible (${API_GATEWAY_URL})"
fi

###############################################################################
log_section "Liste des services Docker"
###############################################################################

SERVICES_RESPONSE="$(metrics_curl "${METRICS_URL}/api/v1/docker/services/all" 2>/dev/null || true)"

if [ -z "$SERVICES_RESPONSE" ]; then
    if [ -z "$METRICS_API_KEY_VALUE" ]; then
        log_skip "Liste services ignoree: METRICS_API_KEY absente"
    else
        log_error "Impossible de recuperer /api/v1/docker/services/all"
    fi
else
    SERVICES_COUNT="$(echo "$SERVICES_RESPONSE" | jq -r '.services | length // 0' 2>/dev/null)"
    RUNNING_COUNT="$(echo "$SERVICES_RESPONSE" | jq -r '.running // 0' 2>/dev/null)"

    if [ "$SERVICES_COUNT" -gt 0 ]; then
        log_success "Liste services recuperee: ${SERVICES_COUNT} services (${RUNNING_COUNT} running)"
    else
        log_error "Liste services vide"
    fi

    for service in "${TEST_SERVICES[@]}"; do
        if echo "$SERVICES_RESPONSE" | jq -e --arg name "$service" '.services[] | select(.name == $name)' > /dev/null 2>&1; then
            log_success "Service critique trouve: $service"
        else
            log_error "Service critique absent: $service"
        fi
    done
fi

###############################################################################
log_section "Metriques individuelles"
###############################################################################

for service in "${TEST_SERVICES[@]}"; do
    log_info "Test du service: $service"
    RESPONSE="$(metrics_curl "${METRICS_URL}/api/v1/docker/service/${service}" 2>/dev/null || true)"

    if [ -z "$RESPONSE" ]; then
        log_error "Metriques indisponibles pour $service"
        continue
    fi

    if json_has_path "$RESPONSE" '.service.name'; then
        log_success "Structure service presente pour $service"
    else
        log_error "Structure service manquante pour $service"
        continue
    fi

    if json_number_in_range "$RESPONSE" '.service.cpu_percent' 0 1000; then
        log_success "CPU present pour $service"
    else
        log_error "CPU absent/invalide pour $service"
    fi

    if json_number_in_range "$RESPONSE" '.service.memory_percent' 0 100; then
        log_success "Memoire % presente pour $service"
    else
        log_warning "Memoire % absente ou hors plage pour $service"
    fi

    if json_number_in_range "$RESPONSE" '.service.memory_usage_mb' 0 1000000; then
        log_success "Memoire MB presente pour $service"
    else
        log_error "Memoire MB absente/invalide pour $service"
    fi

    if json_has_path "$RESPONSE" '.service.health_status_docker'; then
        log_success "Health Docker present pour $service"
    else
        log_warning "Health Docker absent pour $service"
    fi

    if json_has_path "$RESPONSE" '.service.network_rx_mb' && json_has_path "$RESPONSE" '.service.network_tx_mb'; then
        RX="$(echo "$RESPONSE" | jq -r '.service.network_rx_mb')"
        TX="$(echo "$RESPONSE" | jq -r '.service.network_tx_mb')"
        log_success "Stats reseau presentes pour $service (RX: ${RX}MB, TX: ${TX}MB)"
    else
        log_error "Stats reseau manquantes pour $service"
    fi
done

###############################################################################
log_section "Historique des performances"
###############################################################################

for service in "${TEST_SERVICES[@]}"; do
    RESPONSE="$(metrics_curl "${METRICS_URL}/api/v1/docker/service/${service}/history?limit=10" 2>/dev/null || true)"

    if [ -z "$RESPONSE" ]; then
        log_error "Historique indisponible pour $service"
        continue
    fi

    HISTORY_COUNT="$(echo "$RESPONSE" | jq -r '.data | length // 0' 2>/dev/null)"
    if [ "$HISTORY_COUNT" -ge "$MIN_HISTORY_POINTS" ]; then
        log_success "Historique de $service: ${HISTORY_COUNT} points"
    else
        log_warning "Historique de $service: ${HISTORY_COUNT} point(s), minimum attendu ${MIN_HISTORY_POINTS}"
    fi

    FIRST_POINT="$(echo "$RESPONSE" | jq '.data[0] // {}' 2>/dev/null)"
    for field in timestamp cpu_percent memory_usage_mb network_rx_mb network_tx_mb; do
        if echo "$FIRST_POINT" | jq -e --arg field "$field" '.[$field] != null' > /dev/null 2>&1; then
            log_success "Historique $service: champ $field present"
        else
            log_error "Historique $service: champ $field manquant"
        fi
    done
done

###############################################################################
log_section "Logs des services"
###############################################################################

for service in "${TEST_SERVICES[@]}"; do
    RESPONSE="$(metrics_curl "${METRICS_URL}/api/v1/docker/service/${service}/logs?lines=10" 2>/dev/null || true)"

    if [ -z "$RESPONSE" ]; then
        log_warning "Logs indisponibles pour $service"
        continue
    fi

    LOGS_COUNT="$(echo "$RESPONSE" | jq -r '.total // (.lines | length) // 0' 2>/dev/null)"
    if [ "$LOGS_COUNT" -gt 0 ]; then
        log_success "Logs recuperes pour $service: ${LOGS_COUNT} lignes"
    else
        log_warning "Aucun log disponible pour $service"
    fi
done

###############################################################################
log_section "Cohérence live / historique"
###############################################################################

for service in "${TEST_SERVICES[@]}"; do
    CURRENT="$(metrics_curl "${METRICS_URL}/api/v1/docker/service/${service}" 2>/dev/null || true)"
    HISTORY="$(metrics_curl "${METRICS_URL}/api/v1/docker/service/${service}/history?limit=1" 2>/dev/null || true)"

    if [ -z "$CURRENT" ] || [ -z "$HISTORY" ]; then
        log_warning "Cohérence ignoree pour $service: donnees manquantes"
        continue
    fi

    CPU_OK="$(jq -n --argjson current "$CURRENT" --argjson history "$HISTORY" '
        ($current.service.cpu_percent? // null) as $c |
        ($history.data[0].cpu_percent? // null) as $h |
        if ($c == null or $h == null) then false else (($c - $h) | fabs) < 75 end
    ' 2>/dev/null || echo false)"

    if [ "$CPU_OK" = "true" ]; then
        log_success "Cohérence CPU live/historique pour $service"
    else
        log_warning "Cohérence CPU large ou non calculable pour $service"
    fi
done

###############################################################################
log_section "Routes gateway utiles"
###############################################################################

GATEWAY_ROUTES=(
    "/health"
    "/api/v1/metrics"
)

for route in "${GATEWAY_ROUTES[@]}"; do
    if public_curl "${API_GATEWAY_URL}${route}" > /dev/null 2>&1; then
        log_success "Gateway route accessible: $route"
    else
        log_warning "Gateway route non accessible: $route"
    fi
done

###############################################################################
log_section "Resume final"
###############################################################################

TOTAL=$((TESTS_PASSED + TESTS_FAILED))
SUCCESS_RATE="0.00"
if [ "$TOTAL" -gt 0 ]; then
    SUCCESS_RATE="$(awk -v p="$TESTS_PASSED" -v t="$TOTAL" 'BEGIN { printf "%.2f", (p * 100) / t }')"
fi

echo ""
echo "Total de tests: $TOTAL"
echo -e "${GREEN}Tests reussis: $TESTS_PASSED${NC}"
echo -e "${RED}Tests echoues: $TESTS_FAILED${NC}"
echo -e "${YELLOW}Avertissements: $WARNINGS${NC}"
echo -e "${YELLOW}Ignores: $SKIPPED${NC}"
echo "Taux de reussite: ${SUCCESS_RATE}%"
echo ""

if [ "$TESTS_FAILED" -eq 0 ]; then
    echo -e "${GREEN}✅ VALIDATION METRICS COMPLETE${NC}"
    exit 0
fi

echo -e "${RED}❌ VALIDATION METRICS ECHOUEE${NC}"
exit 1

