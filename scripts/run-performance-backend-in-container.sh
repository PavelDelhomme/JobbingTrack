#!/bin/sh
# Test de performance backend depuis le conteneur (sans Docker).
# Appelle l'API Gateway et le Metrics Aggregator pour mesurer la disponibilité et le temps de réponse.

API_GATEWAY_URL="${API_GATEWAY_URL:-http://api-gateway:3000}"
METRICS_URL="${METRICS_AGGREGATOR_URL:-http://metrics-aggregator:3014}"

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

# Health API Gateway
if start=$(date +%s%3N 2>/dev/null) || start=0; then
  code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$API_GATEWAY_URL/health" 2>/dev/null || echo "000")
  end=$(date +%s%3N 2>/dev/null) || end=0
  ms=$((end - start))
  total=$((total + 1))
  if [ "$code" = "200" ]; then
    passed=$((passed + 1))
    echo "  ✅ API Gateway /health: HTTP $code (${ms}ms)"
  else
    failed=$((failed + 1))
    echo "  ❌ API Gateway /health: HTTP $code (${ms}ms)"
  fi
fi

# Health Metrics Aggregator (peut être /api/v1/health ou /health)
for path in "/api/v1/health" "/health"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$METRICS_URL$path" 2>/dev/null || echo "000")
  total=$((total + 1))
  if [ "$code" = "200" ] || [ "$code" = "404" ]; then
    passed=$((passed + 1))
    echo "  ✅ Metrics $path: HTTP $code"
  else
    failed=$((failed + 1))
    echo "  ❌ Metrics $path: HTTP $code"
  fi
  [ "$code" = "200" ] && break
done

# GET /api/v1/metrics (temps de réponse)
if start=$(date +%s%3N 2>/dev/null); then
  code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "$METRICS_URL/api/v1/metrics" 2>/dev/null || echo "000")
  end=$(date +%s%3N 2>/dev/null)
  ms=$((end - start))
  total=$((total + 1))
  if [ "$code" = "200" ]; then
    passed=$((passed + 1))
    echo "  ✅ GET /api/v1/metrics: HTTP $code (${ms}ms)"
  else
    failed=$((failed + 1))
    echo "  ❌ GET /api/v1/metrics: HTTP $code (${ms}ms)"
  fi
fi

echo ""
echo "Total: $total tests"
echo "Tests réussis: $passed"
echo "Tests échoués: $failed"
echo ""
echo "Rapport généré depuis le conteneur (sans Docker)."
echo "Pour un rapport complet avec stats Docker, exécutez depuis l'hôte: make test-performance-backend"
