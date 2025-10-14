#!/bin/bash

# 🧪 Test du Rate Limiting - Validation de la Correction
# Ce script teste que les routes de monitoring ne sont plus limitées

echo "======================================"
echo "🧪 TEST DU RATE LIMITING CORRIGÉ"
echo "======================================"
echo ""

API_URL="http://localhost:3000"
SUCCESS_COUNT=0
FAIL_COUNT=0

echo "📋 Test 1: 50 requêtes health check consécutives"
echo "   (Avant correction: 429 après ~20 requêtes)"
echo "   (Après correction: Toutes devraient passer ✅)"
echo ""

for i in {1..50}; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/api/v1/applications/health")
  
  if [ "$HTTP_CODE" == "200" ]; then
    ((SUCCESS_COUNT++))
    echo -ne "\r   ✅ Requête $i/$50 : HTTP $HTTP_CODE - Succès: $SUCCESS_COUNT/50"
  else
    ((FAIL_COUNT++))
    echo -e "\n   ❌ Requête $i : HTTP $HTTP_CODE (ERREUR!)"
  fi
done

echo -e "\n"
echo "======================================"
echo "📊 RÉSULTATS:"
echo "   ✅ Succès: $SUCCESS_COUNT/50"
echo "   ❌ Échecs: $FAIL_COUNT/50"

if [ $FAIL_COUNT -eq 0 ]; then
  echo ""
  echo "🎉 EXCELLENT ! Le rate limiting est bien désactivé en développement."
  echo "   Toutes les 50 requêtes ont réussi sans erreur 429."
else
  echo ""
  echo "⚠️  ATTENTION : $FAIL_COUNT requêtes ont échoué."
  echo "   Le rate limiting pourrait encore être actif."
  echo "   Vérifiez que NODE_ENV n'est pas défini sur 'production'."
fi

echo "======================================"
echo ""

# Test des autres routes importantes
echo "📋 Test 2: Routes de monitoring critiques"
echo ""

test_route() {
  local route=$1
  local description=$2
  
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}${route}")
  
  if [ "$HTTP_CODE" == "200" ]; then
    echo "   ✅ $description : HTTP $HTTP_CODE"
  else
    echo "   ❌ $description : HTTP $HTTP_CODE (ERREUR!)"
  fi
}

# Health checks de différents services
test_route "/api/v1/applications/health" "Application Service Health"
test_route "/api/v1/companies/health" "Company Service Health"
test_route "/api/v1/contacts/health" "Contact Service Health"
test_route "/api/v1/calls/health" "Call Service Health"
test_route "/api/v1/interviews/health" "Interview Service Health"
test_route "/health" "API Gateway Health"

echo ""
echo "======================================"
echo ""

# Test du mapping des noms de services (singulier vs pluriel)
echo "📋 Test 3: Mapping des noms de services (nécessite authentification)"
echo "   Ce test nécessite un token JWT valide"
echo ""

TOKEN=$(curl -s -X POST "${API_URL}/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"pavel@jobbingtrack.com","password":"password123"}' \
  | grep -o '"token":"[^"]*"' | sed 's/"token":"\(.*\)"/\1/' 2>/dev/null)

if [ -n "$TOKEN" ]; then
  echo "   ✅ Token JWT obtenu"
  echo ""
  
  # Test logs avec nom pluriel (devrait maintenant fonctionner)
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "${API_URL}/api/v1/admin/logs/applications?lines=10")
  
  if [ "$HTTP_CODE" == "200" ]; then
    echo "   ✅ Logs 'applications' (pluriel) : HTTP $HTTP_CODE"
  else
    echo "   ❌ Logs 'applications' (pluriel) : HTTP $HTTP_CODE (ERREUR!)"
  fi
  
  # Test logs avec nom singulier
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "${API_URL}/api/v1/admin/logs/application?lines=10")
  
  if [ "$HTTP_CODE" == "200" ]; then
    echo "   ✅ Logs 'application' (singulier) : HTTP $HTTP_CODE"
  else
    echo "   ❌ Logs 'application' (singulier) : HTTP $HTTP_CODE (ERREUR!)"
  fi
  
  # Test stats Docker frontend
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "${API_URL}/api/v1/admin/docker/stats/frontend")
  
  if [ "$HTTP_CODE" == "200" ]; then
    echo "   ✅ Docker stats 'frontend' : HTTP $HTTP_CODE"
  else
    echo "   ❌ Docker stats 'frontend' : HTTP $HTTP_CODE (ERREUR!)"
  fi
else
  echo "   ⚠️  Impossible d'obtenir le token JWT"
  echo "   Vérifiez que le service d'authentification fonctionne"
  echo "   Ou testez manuellement avec votre token:"
  echo ""
  echo "   curl -H 'Authorization: Bearer YOUR_TOKEN' \\"
  echo "     ${API_URL}/api/v1/admin/logs/applications?lines=10"
fi

echo ""
echo "======================================"
echo "✅ TESTS TERMINÉS"
echo "======================================"
echo ""
echo "📝 Consultez la documentation complète:"
echo "   - RESOLUTION-RATE-LIMITING.md"
echo "   - RECAPITULATIF-CORRECTIONS.md (Section 9)"
echo ""

