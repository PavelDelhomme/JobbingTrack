#!/bin/bash

echo "🧪 Test des Métriques Docker - JobbingTrack"
echo "==========================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="${API_URL:-http://localhost:8080}"
TOKEN=""

# Fonction pour tester un endpoint
test_endpoint() {
    local endpoint=$1
    local description=$2
    
    echo -n "Testing $description... "
    
    response=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $TOKEN" \
        "$API_URL$endpoint")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓ OK${NC} (HTTP $http_code)"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        echo ""
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $http_code)"
        echo "$body"
        echo ""
        return 1
    fi
}

# Vérifier que jq est installé
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠ jq n'est pas installé, l'affichage JSON sera brut${NC}"
    echo ""
fi

# Vérifier que l'API Gateway est accessible
echo "1. Vérification de l'API Gateway..."
if curl -s "$API_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API Gateway accessible${NC}"
else
    echo -e "${RED}✗ API Gateway non accessible à $API_URL${NC}"
    echo "Assurez-vous que les services sont démarrés: make start"
    exit 1
fi
echo ""

# Login pour obtenir un token
echo "2. Authentification..."
echo "Email admin: admin@example.com"
echo "Mot de passe: admin123"
echo ""

login_response=$(curl -s -X POST "$API_URL/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "admin@example.com",
        "password": "admin123"
    }')

TOKEN=$(echo "$login_response" | jq -r '.token // .data.token // empty' 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo -e "${RED}✗ Échec de l'authentification${NC}"
    echo "Réponse: $login_response"
    echo ""
    echo "Créez un compte admin avec:"
    echo "  make seed"
    exit 1
fi

echo -e "${GREEN}✓ Authentification réussie${NC}"
echo "Token: ${TOKEN:0:20}..."
echo ""

# Test des endpoints Docker
echo "3. Test des endpoints Docker Stats..."
echo ""

# Toutes les stats
test_endpoint "/api/v1/admin/docker/stats" "Toutes les statistiques Docker"

# Stats d'un service spécifique
test_endpoint "/api/v1/admin/docker/stats/api-gateway" "Stats API Gateway"

# Stats d'un autre service
test_endpoint "/api/v1/admin/docker/stats/auth" "Stats Auth Service"

# Stats du frontend
test_endpoint "/api/v1/admin/docker/stats/frontend" "Stats Frontend"

# Infos conteneur
test_endpoint "/api/v1/admin/docker/info/applications" "Infos Application Service"

echo ""
echo "4. Test de la commande docker stats directement..."
echo ""

if docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>/dev/null; then
    echo ""
    echo -e "${GREEN}✓ Docker stats fonctionne${NC}"
else
    echo -e "${RED}✗ Impossible d'accéder à docker stats${NC}"
    echo "Exécutez: ./setup-docker-permissions.sh"
fi

echo ""
echo "==========================================="
echo "🎉 Tests terminés !"
echo ""
echo "Pour voir les métriques dans l'interface:"
echo "  1. Ouvrez http://localhost:3000/backoffice"
echo "  2. Cliquez sur 'Gestion des Services'"
echo "  3. Cliquez sur un service pour voir les détails"
echo ""

