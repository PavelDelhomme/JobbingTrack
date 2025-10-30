#!/bin/bash

# Script de test automatique des métriques JobbingTrack
# Usage: ./scripts/test-metrics.sh

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

METRICS_URL="http://localhost:3014"
FAILED_TESTS=0
PASSED_TESTS=0

echo "======================================"
echo "🔍 Tests des Métriques JobbingTrack"
echo "======================================"
echo ""

# Fonction pour tester un endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local jq_filter=$3
    
    echo -n "Test $name... "
    
    response=$(curl -s "$url")
    
    if echo "$response" | jq -e "$jq_filter" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((PASSED_TESTS++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "  Response: $response" | head -c 200
        echo ""
        ((FAILED_TESTS++))
        return 1
    fi
}

# Test 1: Health Check
echo "1️⃣  Health Check"
test_endpoint "Service disponible" "$METRICS_URL/health" '.status == "ok"'
echo ""

# Test 2: Métriques Système
echo "2️⃣  Métriques Système"
test_endpoint "Récupération infos système" "$METRICS_URL/api/v1/metrics" '.success == true'
test_endpoint "Nombre de CPUs présent" "$METRICS_URL/api/v1/metrics" '.system.cpus > 0'
test_endpoint "Mémoire totale présente" "$METRICS_URL/api/v1/metrics" '.system.memory_total > 0'
test_endpoint "Conteneurs présents" "$METRICS_URL/api/v1/metrics" '.system.containers.total > 0'
echo ""

# Test 3: Métriques des Conteneurs
echo "3️⃣  Métriques des Conteneurs"
test_endpoint "Liste des conteneurs" "$METRICS_URL/api/v1/services" '.success == true'
test_endpoint "Au moins un conteneur" "$METRICS_URL/api/v1/services" '.containers_count > 0'
test_endpoint "Données CPU présentes" "$METRICS_URL/api/v1/services" '.containers[0].cpu.percent != null'
test_endpoint "Données mémoire présentes" "$METRICS_URL/api/v1/services" '.containers[0].memory.usage > 0'
test_endpoint "Données réseau présentes" "$METRICS_URL/api/v1/services" '.containers[0].network != null'
echo ""

# Test 4: Métriques d'un Conteneur Spécifique
echo "4️⃣  Métriques Conteneur Spécifique"
CONTAINER_NAME="jobbingtrack-frontend"
test_endpoint "Stats $CONTAINER_NAME" "$METRICS_URL/api/v1/container/$CONTAINER_NAME" '.success == true'
test_endpoint "Nom du conteneur correct" "$METRICS_URL/api/v1/container/$CONTAINER_NAME" ".container.name == \"$CONTAINER_NAME\""
echo ""

# Test 5: Vérification de la structure des données
echo "5️⃣  Structure des Données"
test_endpoint "Timestamp présent" "$METRICS_URL/api/v1/services" '.timestamp != null'
test_endpoint "Format des données CPU" "$METRICS_URL/api/v1/services" '.containers[0].cpu | type == "object"'
test_endpoint "Format des données mémoire" "$METRICS_URL/api/v1/services" '.containers[0].memory | type == "object"'
echo ""

# Test 6: Performance (temps de réponse)
echo "6️⃣  Performance"
echo -n "Temps de réponse < 2s... "
start_time=$(date +%s%3N)
curl -s "$METRICS_URL/api/v1/services" > /dev/null
end_time=$(date +%s%3N)
response_time=$((end_time - start_time))

if [ $response_time -lt 2000 ]; then
    echo -e "${GREEN}✅ PASS${NC} (${response_time}ms)"
    ((PASSED_TESTS++))
else
    echo -e "${YELLOW}⚠️  SLOW${NC} (${response_time}ms)"
fi
echo ""

# Test 7: Services de Monitoring Optionnels
echo "7️⃣  Services de Monitoring (Optionnels)"
echo -n "Prometheus disponible... "
if curl -s http://localhost:9090/-/healthy > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASSED_TESTS++))
else
    echo -e "${YELLOW}⚠️  SKIP${NC} (service optionnel)"
fi

echo -n "cAdvisor disponible... "
if curl -s http://localhost:8081/healthz > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASSED_TESTS++))
else
    echo -e "${YELLOW}⚠️  SKIP${NC} (service optionnel)"
fi
echo ""

# Résumé
echo "======================================"
echo "📊 Résumé des Tests"
echo "======================================"
echo -e "${GREEN}Tests réussis:${NC} $PASSED_TESTS"
echo -e "${RED}Tests échoués:${NC} $FAILED_TESTS"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✅ Tous les tests sont passés avec succès !${NC}"
    exit 0
else
    echo -e "${RED}❌ Certains tests ont échoué. Vérifiez les logs ci-dessus.${NC}"
    echo ""
    echo "💡 Conseils de dépannage:"
    echo "  1. Vérifiez que tous les services sont démarrés: make status"
    echo "  2. Consultez les logs: make logs-service SERVICE=jobbingtrack-metrics-aggregator"
    echo "  3. Redémarrez le service: make restart-service SERVICE=jobbingtrack-metrics-aggregator"
    exit 1
fi
