#!/bin/bash

# Script de test du système de monitoring complet
# Usage: ./monitoring/test-monitoring.sh

echo "🧪 Test du système de monitoring JobbingTrack..."
echo "=============================================="

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

FAILED_TESTS=0
TOTAL_TESTS=0

# Fonction de test
test_service() {
    local service=$1
    local port=$2
    local expected_code=${3:-200}

    ((TOTAL_TESTS++))

    echo -n "Test: $service (port $port)... "

    if curl -f -s --max-time 5 "http://localhost:$port" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ ÉCHEC${NC}"
        ((FAILED_TESTS++))
        return 1
    fi
}

echo ""
echo "📊 Test des services de monitoring..."
echo "-----------------------------------"

# Test cAdvisor
test_service "cAdvisor" "8082"

# Test Prometheus
test_service "Prometheus" "9093"

# Test Grafana
test_service "Grafana" "3003"

# Test Node Exporter
test_service "Node Exporter" "9101"

# Test Alertmanager
test_service "Alertmanager" "9096"

# Test Blackbox Exporter
test_service "Blackbox Exporter" "9118"

echo ""
echo "🔍 Test des endpoints spécifiques..."
echo "-----------------------------------"

# Test Prometheus API
echo -n "Test: Prometheus API... "
((TOTAL_TESTS++))
if curl -s --max-time 5 "http://localhost:9090/api/v1/query?query=up" | grep -q '"status":"success"'; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ ÉCHEC${NC}"
    ((FAILED_TESTS++))
fi

# Test Grafana API
echo -n "Test: Grafana API... "
((TOTAL_TESTS++))
if curl -s --max-time 5 "http://localhost:3000/api/health" | grep -q '"database":"ok"'; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ ÉCHEC${NC}"
    ((FAILED_TESTS++))
fi

# Test Node Exporter
echo -n "Test: Node Exporter metrics... "
((TOTAL_TESTS++))
if curl -s --max-time 5 "http://localhost:9100/metrics" | grep -q "node_cpu_seconds_total"; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ ÉCHEC${NC}"
    ((FAILED_TESTS++))
fi

# Test Blackbox Exporter
echo -n "Test: Blackbox Exporter... "
((TOTAL_TESTS++))
if curl -s --max-time 5 "http://localhost:9115/probe?target=http://localhost:3000&module=http_2xx" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ ÉCHEC${NC}"
    ((FAILED_TESTS++))
fi

echo ""
echo "🎯 Résumé des tests"
echo "=================="

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 Tous les tests ont réussi ! ($TOTAL_TESTS/$TOTAL_TESTS)${NC}"
    echo ""
    echo "🚀 Votre système de monitoring est opérationnel :"
    echo ""
    echo "📊 Services disponibles :"
    echo "   • cAdvisor:         http://localhost:8080"
    echo "   • Prometheus:       http://localhost:9090"
    echo "   • Grafana:          http://localhost:3000 (admin/admin)"
    echo "   • Node Exporter:    http://localhost:9100"
    echo "   • Alertmanager:     http://localhost:9093"
    echo "   • Blackbox Exp.:    http://localhost:9115"
    echo ""
    echo "📈 Dashboards préconfigurés dans Grafana"
    echo "📊 Métriques complètes des conteneurs"
    echo "🚨 Alertes automatiques configurées"
else
    echo -e "${RED}❌ $FAILED_TESTS test(s) ont échoué sur $TOTAL_TESTS${NC}"
    echo ""
    echo "🔧 Suggestions de dépannage :"
    echo "   1. Vérifiez que Docker est démarré : docker info"
    echo "   2. Démarrez le monitoring : ./monitoring/start-monitoring.sh up"
    echo "   3. Vérifiez les logs : ./monitoring/start-monitoring.sh logs"
    echo "   4. Assurez-vous que les ports ne sont pas déjà utilisés"
fi

exit $FAILED_TESTS
