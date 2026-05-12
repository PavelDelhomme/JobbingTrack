#!/bin/sh
# Test de performance backend depuis le conteneur
# Teste de vrais endpoints API, charge et métriques via metrics-aggregator

API_GATEWAY_URL="${API_GATEWAY_URL:-http://api-gateway:3000}"
METRICS_URL="${METRICS_AGGREGATOR_URL:-http://jobbingtrack-metrics-aggregator:3014}"

echo "================================================================"
echo "🔍 TEST DE PERFORMANCE BACKEND (mode conteneur)"
echo "================================================================"
echo ""
echo "API Gateway: $API_GATEWAY_URL"
echo "Metrics:     $METRICS_URL"
echo ""

total=0
passed=0
failed=0

measure() {
  label="$1"
  url="$2"
  expected_ok="$3"
  start=$(date +%s%3N 2>/dev/null) || start=0
  code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$url" 2>/dev/null || echo "000")
  end=$(date +%s%3N 2>/dev/null) || end=0
  ms=$((end - start))
  total=$((total + 1))

  if [ "$code" = "200" ] || [ "$code" = "$expected_ok" ]; then
    passed=$((passed + 1))
    echo "  ✅ $label: HTTP $code (${ms}ms)"
  elif [ "$code" = "401" ] || [ "$code" = "403" ]; then
    passed=$((passed + 1))
    echo "  ✅ $label: HTTP $code - auth requise, OK (${ms}ms)"
  else
    failed=$((failed + 1))
    echo "  ❌ $label: HTTP $code (${ms}ms)"
  fi
}

echo "📡 1/5 - Endpoints Health"
measure "API Gateway /health" "$API_GATEWAY_URL/health" "200"
measure "Metrics /health" "$METRICS_URL/health" "200"
measure "Metrics /api/v1/health" "$METRICS_URL/api/v1/health" "200"

echo ""
echo "📡 2/5 - Endpoints API réels"
measure "Applications (list)" "$API_GATEWAY_URL/api/v1/applications" "200"
measure "Companies (list)" "$API_GATEWAY_URL/api/v1/companies" "200"
measure "Contacts (list)" "$API_GATEWAY_URL/api/v1/contacts" "200"
measure "Interviews (list)" "$API_GATEWAY_URL/api/v1/interviews" "200"
measure "Calls (list)" "$API_GATEWAY_URL/api/v1/calls" "200"
measure "Followups (list)" "$API_GATEWAY_URL/api/v1/followups?limit=5" "200"
measure "Events (list)" "$API_GATEWAY_URL/api/v1/events?limit=5" "200"
measure "Notifications (list)" "$API_GATEWAY_URL/api/v1/notifications?limit=5" "200"

echo ""
echo "📡 3/5 - Métriques système"
measure "Métriques complètes" "$METRICS_URL/api/v1/metrics" "200"
measure "Docker services" "$METRICS_URL/api/v1/docker/services/all" "200"
measure "Services list" "$METRICS_URL/api/v1/services" "200"

echo ""
echo "📡 4/5 - Test de charge (10 requêtes séquentielles)"
load_total=0
load_passed=0
load_time_sum=0
i=0
while [ $i -lt 10 ]; do
  start=$(date +%s%3N 2>/dev/null) || start=0
  code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$API_GATEWAY_URL/health" 2>/dev/null || echo "000")
  end=$(date +%s%3N 2>/dev/null) || end=0
  ms=$((end - start))
  load_total=$((load_total + 1))
  load_time_sum=$((load_time_sum + ms))
  if [ "$code" = "200" ]; then
    load_passed=$((load_passed + 1))
  fi
  i=$((i + 1))
done
load_avg=$((load_time_sum / load_total))
total=$((total + 1))
if [ $load_passed -eq $load_total ]; then
  passed=$((passed + 1))
  echo "  ✅ Charge: $load_passed/$load_total succès - moy: ${load_avg}ms"
else
  failed=$((failed + 1))
  echo "  ❌ Charge: $load_passed/$load_total succès - moy: ${load_avg}ms"
fi

echo ""
echo "📡 5/5 - Temps de réponse moyen API"
api_time_sum=0
api_count=0
for endpoint in "/api/v1/companies" "/api/v1/contacts" "/api/v1/applications"; do
  start=$(date +%s%3N 2>/dev/null) || start=0
  curl -s -o /dev/null --connect-timeout 5 "$API_GATEWAY_URL$endpoint" 2>/dev/null
  end=$(date +%s%3N 2>/dev/null) || end=0
  ms=$((end - start))
  api_time_sum=$((api_time_sum + ms))
  api_count=$((api_count + 1))
done
if [ $api_count -gt 0 ]; then
  api_avg=$((api_time_sum / api_count))
  total=$((total + 1))
  if [ $api_avg -lt 2000 ]; then
    passed=$((passed + 1))
    echo "  ✅ Temps moyen API: ${api_avg}ms (< 2s)"
  else
    failed=$((failed + 1))
    echo "  ❌ Temps moyen API: ${api_avg}ms (> 2s, trop lent)"
  fi
fi

echo ""
echo "Total: $total tests"
echo "Tests réussis: $passed"
echo "Tests échoués: $failed"
