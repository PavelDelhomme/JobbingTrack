#!/bin/bash

# ============================================
# Script de Test du Système de Monitoring
# JobbingTrack
# ============================================

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║   Test du Système de Monitoring JobbingTrack          ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Configuration
API_URL="http://localhost:8014"
PROMETHEUS_URL="http://localhost:9090"
NODE_EXPORTER_URL="http://localhost:9100"
CADVISOR_URL="http://localhost:8082"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour tester un endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -n "🔍 Test: $name ... "
    
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    
    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}✓ OK${NC} (HTTP $status)"
        return 0
    else
        echo -e "${RED}✗ ÉCHEC${NC} (HTTP $status, attendu $expected_status)"
        return 1
    fi
}

# Fonction pour tester une query Prometheus
test_prometheus_query() {
    local name=$1
    local query=$2
    
    echo -n "🔍 Test PromQL: $name ... "
    
    response=$(curl -s -G --data-urlencode "query=$query" "$PROMETHEUS_URL/api/v1/query" 2>/dev/null)
    status=$(echo "$response" | jq -r '.status' 2>/dev/null)
    result_count=$(echo "$response" | jq '.data.result | length' 2>/dev/null)
    
    if [ "$status" = "success" ] && [ "$result_count" -gt 0 ]; then
        echo -e "${GREEN}✓ OK${NC} ($result_count résultats)"
        return 0
    else
        echo -e "${RED}✗ ÉCHEC${NC} (status: $status, résultats: $result_count)"
        return 1
    fi
}

# ============================================
# TEST 1 : Services de base
# ============================================
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}TEST 1 : Vérification des services${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

test_endpoint "Node Exporter" "$NODE_EXPORTER_URL/metrics"
test_endpoint "cAdvisor" "$CADVISOR_URL/metrics"
test_endpoint "Prometheus" "$PROMETHEUS_URL/-/healthy"
test_endpoint "Metrics API Health" "$API_URL/health"

echo ""

# ============================================
# TEST 2 : Prometheus Targets
# ============================================
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}TEST 2 : Prometheus Targets${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

echo "📊 Récupération des targets actives..."
targets=$(curl -s "$PROMETHEUS_URL/api/v1/targets" | jq -r '.data.activeTargets[] | "\(.labels.job) - \(.health)"')

if [ -n "$targets" ]; then
    echo -e "${GREEN}Targets actives :${NC}"
    echo "$targets" | while read -r line; do
        if echo "$line" | grep -q "up"; then
            echo -e "  ${GREEN}✓${NC} $line"
        else
            echo -e "  ${RED}✗${NC} $line"
        fi
    done
else
    echo -e "${RED}✗ Aucune target trouvée${NC}"
fi

echo ""

# ============================================
# TEST 3 : Métriques Node Exporter
# ============================================
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}TEST 3 : Métriques Node Exporter${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

test_prometheus_query "CPU cores" "count(node_cpu_seconds_total{mode=\"idle\"})"
test_prometheus_query "Mémoire totale" "node_memory_MemTotal_bytes"
test_prometheus_query "CPU usage" "100 - (avg(rate(node_cpu_seconds_total{mode=\"idle\"}[1m])) * 100)"

echo ""

# ============================================
# TEST 4 : Métriques cAdvisor
# ============================================
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}TEST 4 : Métriques cAdvisor${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

test_prometheus_query "Conteneurs actifs" "count(container_last_seen{name!=\"\"})"
test_prometheus_query "Mémoire conteneurs" "container_memory_usage_bytes{name!=\"\"}"

echo ""

# ============================================
# TEST 5 : Filtrage JobbingTrack
# ============================================
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}TEST 5 : Filtrage JobbingTrack${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

test_prometheus_query "Conteneurs JobbingTrack" "count(container_last_seen{container_label_com_docker_compose_project=~\"jobbingtrack.*\", name!=\"\"})"
test_prometheus_query "CPU JobbingTrack" "rate(container_cpu_usage_seconds_total{container_label_com_docker_compose_project=~\"jobbingtrack.*\"}[1m])"
test_prometheus_query "Mémoire JobbingTrack" "container_memory_usage_bytes{container_label_com_docker_compose_project=~\"jobbingtrack.*\"}"

echo ""

# ============================================
# TEST 6 : API Endpoints (Mode Développement)
# ============================================
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}TEST 6 : API Endpoints (Public)${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

if [ -n "$NODE_ENV" ] && [ "$NODE_ENV" = "development" ]; then
    test_endpoint "API /api/v1/metrics" "$API_URL/api/v1/metrics"
    test_endpoint "API /api/v1/services" "$API_URL/api/v1/services"
else
    echo -e "${YELLOW}⚠ Mode développement non activé, skip tests publics${NC}"
fi

echo ""

# ============================================
# TEST 7 : API Endpoints (Protégés)
# ============================================
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}TEST 7 : API Endpoints (Protégés)${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

if [ -n "$JWT_TOKEN" ]; then
    echo "🔑 Token JWT détecté, test des endpoints protégés..."
    
    test_endpoint "API /api/metrics/system" "$API_URL/api/metrics/system" \
        "-H 'Authorization: Bearer $JWT_TOKEN'"
    test_endpoint "API /api/metrics/jobbingtrack/containers" "$API_URL/api/metrics/jobbingtrack/containers" \
        "-H 'Authorization: Bearer $JWT_TOKEN'"
    test_endpoint "API /api/metrics/jobbingtrack/stats" "$API_URL/api/metrics/jobbingtrack/stats" \
        "-H 'Authorization: Bearer $JWT_TOKEN'"
else
    echo -e "${YELLOW}⚠ Variable JWT_TOKEN non définie${NC}"
    echo "  Pour tester les endpoints protégés :"
    echo "  export JWT_TOKEN='votre-token-jwt'"
    echo "  ./test-monitoring.sh"
fi

echo ""

# ============================================
# TEST 8 : Détails des métriques système
# ============================================
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}TEST 8 : Métriques Système Détaillées${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

echo "📊 Récupération des métriques système..."

cpu_cores=$(curl -s -G --data-urlencode "query=count(node_cpu_seconds_total{mode=\"idle\"})" "$PROMETHEUS_URL/api/v1/query" | jq -r '.data.result[0].value[1]' 2>/dev/null || echo "N/A")
cpu_usage=$(curl -s -G --data-urlencode "query=100 - (avg(rate(node_cpu_seconds_total{mode=\"idle\"}[1m])) * 100)" "$PROMETHEUS_URL/api/v1/query" | jq -r '.data.result[0].value[1]' 2>/dev/null || echo "N/A")
memory_total=$(curl -s -G --data-urlencode "query=node_memory_MemTotal_bytes" "$PROMETHEUS_URL/api/v1/query" | jq -r '.data.result[0].value[1]' 2>/dev/null || echo "N/A")
containers_jt=$(curl -s -G --data-urlencode "query=count(container_last_seen{container_label_com_docker_compose_project=~\"jobbingtrack.*\", name!=\"\"})" "$PROMETHEUS_URL/api/v1/query" | jq -r '.data.result[0].value[1]' 2>/dev/null || echo "N/A")

# Conversion mémoire en GB
if [ "$memory_total" != "N/A" ]; then
    memory_gb=$(echo "scale=2; $memory_total / 1024 / 1024 / 1024" | bc)
else
    memory_gb="N/A"
fi

# Formattage CPU usage
if [ "$cpu_usage" != "N/A" ]; then
    cpu_usage_formatted=$(printf "%.2f" "$cpu_usage")
else
    cpu_usage_formatted="N/A"
fi

echo -e "  ${GREEN}CPU Cores:${NC} $cpu_cores"
echo -e "  ${GREEN}CPU Usage:${NC} ${cpu_usage_formatted}%"
echo -e "  ${GREEN}Mémoire Totale:${NC} ${memory_gb} GB"
echo -e "  ${GREEN}Conteneurs JobbingTrack:${NC} $containers_jt"

echo ""

# ============================================
# RÉSUMÉ
# ============================================
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}RÉSUMÉ${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

echo -e "${GREEN}✓ Tests terminés !${NC}"
echo ""
echo "Pour plus de détails, consultez :"
echo "  - Prometheus: $PROMETHEUS_URL"
echo "  - Grafana: http://localhost:3013 (admin/admin123)"
echo "  - API Docs: $API_URL"
echo ""
echo "Pour consulter le guide complet :"
echo "  cat backend/metrics-aggregator-service/MONITORING_GUIDE.md"
echo ""
