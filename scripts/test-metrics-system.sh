#!/bin/bash

# Script de test du système de métriques
# Ce script vérifie que tous les composants du système de métriques fonctionnent

echo "🧪 Test du système de métriques JobbingTrack..."
echo "=============================================="

# Couleurs pour les messages
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les résultats
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        return 1
    fi
}

# Fonction pour tester un endpoint
test_endpoint() {
    local url=$1
    local description=$2
    local expected_status=${3:-200}

    echo -n "Test: $description... "

    # Timeout de 10 secondes
    if curl -f -s --max-time 10 -o /dev/null -w "%{http_code}" "$url" 2>/dev/null | grep -q "^$expected_status$"; then
        echo -e "${GREEN}OK${NC}"
        return 0
    else
        echo -e "${RED}ÉCHEC${NC}"
        return 1
    fi
}

FAILED_TESTS=0

echo ""
echo "📡 Test des services de métriques..."
echo "-----------------------------------"

# Test du Metrics Aggregator Service
test_endpoint "http://localhost:3014/api/v1/health" "Metrics Aggregator Health" 200
FAILED_TESTS=$((FAILED_TESTS + $?))

test_endpoint "http://localhost:3014/api/v1/metrics" "Metrics Aggregator Metrics" 200
FAILED_TESTS=$((FAILED_TESTS + $?))

# Test de cAdvisor
test_endpoint "http://localhost:8080/api/v1.3/docker/" "cAdvisor API" 200
FAILED_TESTS=$((FAILED_TESTS + $?))

# Test de Prometheus (optionnel)
test_endpoint "http://localhost:9090/-/healthy" "Prometheus Health" 200
if [ $? -eq 0 ]; then
    echo -e "${YELLOW}ℹ️  Prometheus est disponible (optionnel)${NC}"
else
    echo -e "${YELLOW}ℹ️  Prometheus n'est pas démarré (optionnel)${NC}"
fi

echo ""
echo "🔧 Test des services backend..."
echo "------------------------------"

# Liste des services backend à tester
BACKEND_SERVICES=(
    "auth-service:3001:/api/v1/auth/health"
    "application-service:3002:/api/v1/applications/health"
    "company-service:3003:/api/v1/companies/health"
    "contact-service:3004:/api/v1/contacts/health"
    "interview-service:3005:/api/v1/interviews/health"
    "notification-service:3006:/api/v1/notifications/health"
    "dashboard-service:3007:/api/v1/dashboard/health"
    "call-service:3008:/api/v1/calls/health"
    "event-service:3009:/api/v1/events/health"
    "followup-service:3010:/api/v1/followups/health"
    "profile-service:3011:/api/v1/profile/health"
    "workflow-service:3013:/api/v1/workflow/health"
)

for service_info in "${BACKEND_SERVICES[@]}"; do
    IFS=':' read -r service_name port health_path <<< "$service_info"
    test_endpoint "http://localhost:$port$health_path" "$service_name Health"
    FAILED_TESTS=$((FAILED_TESTS + $?))
done

echo ""
echo "🌐 Test des services système..."
echo "-----------------------------"

# Test du frontend
test_endpoint "http://localhost:3000/health" "Frontend Health" 200
FAILED_TESTS=$((FAILED_TESTS + $?))

# Test de la base de données (via API Gateway)
test_endpoint "http://localhost:3000/api/v1/applications" "Database via API Gateway" 200
FAILED_TESTS=$((FAILED_TESTS + $?))

# Test de Redis (connectivité réseau)
echo -n "Test: Redis connectivity... "
if nc -z localhost 6379 2>/dev/null; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}ÉCHEC${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo ""
echo "📊 Test de l'intégration frontend..."
echo "----------------------------------"

# Test de la connexion WebSocket au Metrics Aggregator
echo -n "Test: WebSocket connection to metrics service... "

# Créer un petit script Node.js pour tester la connexion WebSocket
cat > /tmp/test_websocket.js << 'EOF'
const io = require('socket.io-client');

const socket = io('http://localhost:3014');

socket.on('connect', () => {
    console('OK');
    socket.close();
    process.exit(0);
});

socket.on('connect_error', () => {
    console.error('ÉCHEC');
    process.exit(1);
});

setTimeout(() => {
    console.error('TIMEOUT');
    process.exit(1);
}, 5000);
EOF

if node /tmp/test_websocket.js >/dev/null 2>&1; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}ÉCHEC${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Nettoyer le fichier temporaire
rm -f /tmp/test_websocket.js

echo ""
echo "📈 Test des métriques système..."
echo "-------------------------------"

# Vérifier que les métriques sont collectées
echo -n "Test: System metrics collection... "

METRICS_RESPONSE=$(curl -s --max-time 5 "http://localhost:3014/api/v1/metrics" 2>/dev/null)

if echo "$METRICS_RESPONSE" | jq -e '.system' >/dev/null 2>&1; then
    echo -e "${GREEN}OK${NC}"

    # Afficher quelques métriques intéressantes
    CPU_USAGE=$(echo "$METRICS_RESPONSE" | jq -r '.system.cpu.usage // "N/A"')
    MEM_USAGE=$(echo "$METRICS_RESPONSE" | jq -r '.system.memory.usage // "N/A"')
    SERVICES_COUNT=$(echo "$METRICS_RESPONSE" | jq -r '.services | length // 0')

    echo "   📊 CPU: $CPU_USAGE%"
    echo "   💾 Mémoire: $MEM_USAGE%"
    echo "   🔧 Services découverts: $SERVICES_COUNT"
else
    echo -e "${RED}ÉCHEC${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo ""
echo "🎯 Résumé des tests"
echo "=================="

TOTAL_TESTS=$(( ${#BACKEND_SERVICES[@]} + 8 ))  # +8 pour les autres tests

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 Tous les tests ont réussi ! ($TOTAL_TESTS/$TOTAL_TESTS)${NC}"
    echo ""
    echo "🚀 Votre système de métriques est opérationnel :"
    echo "   • Metrics Aggregator : http://localhost:3014"
    echo "   • cAdvisor : http://localhost:8080"
    echo "   • Prometheus : http://localhost:9090"
    echo "   • Dashboard : http://localhost:3000/backoffice"
else
    echo -e "${RED}❌ $FAILED_TESTS test(s) ont échoué sur $TOTAL_TESTS${NC}"
    echo ""
    echo "🔧 Suggestions de dépannage :"
    echo "   1. Vérifiez que Docker est démarré : docker info"
    echo "   2. Démarrez les services : ./scripts/start-with-metrics.sh"
    echo "   3. Vérifiez les logs : docker-compose logs [service-name]"
    echo "   4. Assurez-vous que les ports ne sont pas déjà utilisés"
fi

exit $FAILED_TESTS
