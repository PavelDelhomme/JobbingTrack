#!/bin/bash

# 🧪 Script de test des nouvelles fonctionnalités
# Teste la corbeille, les archives et la génération de données

set -e

echo "🧪 Test des nouvelles fonctionnalités JobbingTrack"
echo "=================================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

API_URL="http://localhost:3000"
TOKEN=""

# Fonction de test
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local data=$4

    echo -e "${BLUE}🔍 Test: $description${NC}"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET \
            -H "Authorization: Bearer $TOKEN" \
            "$API_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_URL$endpoint")
    fi
    
    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✅ Success (HTTP $http_code)${NC}"
    else
        echo -e "${RED}❌ Failed (HTTP $http_code)${NC}"
        echo "Response: $body"
    fi
    echo ""
}

# 1. Login
echo -e "${BLUE}🔐 Connexion...${NC}"
login_response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"pavel@jobbingtrack.com","password":"password123"}' \
    "$API_URL/api/v1/auth/login")

TOKEN=$(echo $login_response | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Échec de la connexion${NC}"
    echo "Assurez-vous que les services sont démarrés et qu'un utilisateur existe"
    echo "Essayez: cd backend && make up && make seed-minimal"
    exit 1
fi

echo -e "${GREEN}✅ Connecté avec succès${NC}"
echo "Token: ${TOKEN:0:20}..."
echo ""

# 2. Test Corbeille
echo -e "${YELLOW}=== Tests Corbeille ===${NC}"
echo ""

test_endpoint "GET" "/api/v1/admin/trash" "Récupération de la corbeille globale"
test_endpoint "GET" "/api/v1/admin/trash?type=application" "Récupération corbeille candidatures"

# 3. Test Archives
echo -e "${YELLOW}=== Tests Archives ===${NC}"
echo ""

test_endpoint "GET" "/api/v1/admin/archive" "Récupération des archives globales"
test_endpoint "GET" "/api/v1/admin/archive?type=application" "Récupération archives candidatures"

# 4. Test Logs
echo -e "${YELLOW}=== Tests Logs ===${NC}"
echo ""

test_endpoint "GET" "/api/v1/admin/logs/services" "Liste des services disponibles"
test_endpoint "GET" "/api/v1/admin/logs/auth-service?lines=10" "Récupération logs auth-service"

# 5. Test Données de test
echo -e "${YELLOW}=== Tests Données de Test ===${NC}"
echo ""

test_endpoint "GET" "/api/v1/admin/test-data/status" "Statut des données de test"

# Ne pas générer de données par défaut (trop long)
# test_endpoint "POST" "/api/v1/admin/test-data/generate" "Génération de données" '{"users":1,"companies":2,"applications":2}'

# 6. Test Services
echo -e "${YELLOW}=== Tests Gestion Services ===${NC}"
echo ""

# Ne pas redémarrer de services par défaut
echo -e "${BLUE}🔍 Test: Redémarrage de service${NC}"
echo -e "${YELLOW}⏭️  Skipped (évite de perturber les services)${NC}"
echo ""

# Résumé
echo ""
echo "=================================================="
echo -e "${GREEN}🎉 Tests terminés !${NC}"
echo ""
echo "Endpoints testés:"
echo "  ✅ Corbeille (GET)"
echo "  ✅ Archives (GET)"
echo "  ✅ Logs (GET)"
echo "  ✅ Statut données test (GET)"
echo ""
echo "Pour tester plus en détail:"
echo "  🌐 Backoffice: http://localhost:8080/backoffice"
echo "  📋 Corbeille: http://localhost:8080/backoffice/trash"
echo "  📦 Archives: http://localhost:8080/backoffice/archives"
echo "  🎲 Données test: http://localhost:8080/backoffice/test-data"
echo "  📱 Émulateur: http://localhost:8080/backoffice/mobile-emulator"
echo "  📋 Logs: http://localhost:8080/backoffice/logs"
echo ""

