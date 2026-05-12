#!/bin/bash

# Script de benchmark de performance pour mesurer les temps de chargement des pages
# Usage: ./scripts/performance/performance-benchmark.sh [before|after]

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RESULTS_DIR="tests/performance-benchmark"
MODE=${1:-"before"}

mkdir -p "$RESULTS_DIR"

echo "╔════════════════════════════════════════════════════════╗"
echo "║     📊 BENCHMARK DE PERFORMANCE - JobbingTrack        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "Mode: $MODE"
echo "Timestamp: $TIMESTAMP"
echo ""

FRONTEND_URL="http://localhost:5003"
API_URL="http://localhost:5002"

# Fonction pour mesurer le temps de chargement d'une page
measure_page_load() {
    local url=$1
    local name=$2
    local output_file="$RESULTS_DIR/${MODE}_${name}_${TIMESTAMP}.json"
    
    echo "🔍 Mesure de $name..."
    
    # Utiliser curl pour mesurer le temps de réponse (suivre les redirections avec -L)
    response=$(curl -s -L -w "\n%{time_total}\n%{http_code}" "$url" -o /tmp/response.html 2>&1)
    time_total=$(echo "$response" | tail -n 2 | head -n 1)
    http_code=$(echo "$response" | tail -n 1)
    
    # Mesurer la taille de la réponse
    size=$(stat -f%z /tmp/response.html 2>/dev/null || stat -c%s /tmp/response.html 2>/dev/null || echo "0")
    
    # Calculer size_kb sans bc (utiliser awk ou calcul bash)
    size_kb=$(awk "BEGIN {printf \"%.2f\", $size / 1024}" 2>/dev/null || echo "$(($size / 1024)).$(($size % 1024 * 100 / 1024))")
    
    # Créer un rapport JSON
    cat > "$output_file" <<EOF
{
  "mode": "$MODE",
  "timestamp": "$TIMESTAMP",
  "page": "$name",
  "url": "$url",
  "time_total": $time_total,
  "http_code": $http_code,
  "size_bytes": $size,
  "size_kb": $size_kb,
  "date": "$(date -Iseconds 2>/dev/null || date '+%Y-%m-%dT%H:%M:%S%z')"
}
EOF
    
    if [ "$http_code" = "200" ]; then
        echo "  ✅ $name: ${time_total}s (${size} bytes)"
    else
        echo "  ⚠️  $name: HTTP $http_code (${time_total}s)"
    fi
}

# Fonction pour mesurer un endpoint API
measure_api_endpoint() {
    local endpoint=$1
    local name=$2
    local output_file="$RESULTS_DIR/${MODE}_api_${name}_${TIMESTAMP}.json"
    
    echo "🔍 Mesure API $name..."
    
    # Utiliser curl avec timeout (suivre les redirections avec -L)
    response=$(curl -s -L -w "\n%{time_total}\n%{http_code}" "$API_URL$endpoint" -H "Authorization: Bearer test" -o /tmp/api_response.json 2>&1 || echo -e "\n0\n000")
    time_total=$(echo "$response" | tail -n 2 | head -n 1)
    http_code=$(echo "$response" | tail -n 1)
    
    size=$(stat -f%z /tmp/api_response.json 2>/dev/null || stat -c%s /tmp/api_response.json 2>/dev/null || echo "0")
    
    # Calculer size_kb sans bc (utiliser awk ou calcul bash)
    size_kb=$(awk "BEGIN {printf \"%.2f\", $size / 1024}" 2>/dev/null || echo "$(($size / 1024)).$(($size % 1024 * 100 / 1024))")
    
    cat > "$output_file" <<EOF
{
  "mode": "$MODE",
  "timestamp": "$TIMESTAMP",
  "endpoint": "$name",
  "url": "$API_URL$endpoint",
  "time_total": $time_total,
  "http_code": $http_code,
  "size_bytes": $size,
  "size_kb": $size_kb,
  "date": "$(date -Iseconds 2>/dev/null || date '+%Y-%m-%dT%H:%M:%S%z')"
}
EOF
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "401" ] || [ "$http_code" = "403" ]; then
        echo "  ✅ API $name: ${time_total}s (${size} bytes)"
    else
        echo "  ⚠️  API $name: HTTP $http_code (${time_total}s)"
    fi
}

echo "📊 Mesure des pages frontend..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Pages principales
measure_page_load "$FRONTEND_URL/backoffice" "backoffice-overview"
measure_page_load "$FRONTEND_URL/backoffice/analytics" "analytics"
measure_page_load "$FRONTEND_URL/backoffice/statistics" "statistics"
measure_page_load "$FRONTEND_URL/backoffice/applications" "applications"
measure_page_load "$FRONTEND_URL/backoffice/companies" "companies"
measure_page_load "$FRONTEND_URL/backoffice/users" "users"

echo ""
echo "📡 Mesure des endpoints API..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Endpoints API principaux
measure_api_endpoint "/api/v1/applications" "applications"
measure_api_endpoint "/api/v1/companies" "companies"
measure_api_endpoint "/api/v1/auth/users" "users"
measure_api_endpoint "/api/v1/contacts" "contacts"
measure_api_endpoint "/api/v1/interviews" "interviews"
measure_api_endpoint "/api/v1/statistics" "statistics"

echo ""
echo "📋 Génération du rapport consolidé..."

# Créer un rapport consolidé
consolidated_report="$RESULTS_DIR/${MODE}_consolidated_${TIMESTAMP}.json"
{
    echo "{"
    echo "  \"mode\": \"$MODE\","
    echo "  \"timestamp\": \"$TIMESTAMP\","
    echo "  \"pages\": ["
    first=true
    for file in "$RESULTS_DIR/${MODE}_"*"_${TIMESTAMP}.json"; do
        if [ -f "$file" ] && [[ "$file" != *"consolidated"* ]]; then
            if [ "$first" = true ]; then
                first=false
            else
                echo ","
            fi
            cat "$file" | sed 's/^/    /'
        fi
    done
    echo ""
    echo "  ]"
    echo "}"
} > "$consolidated_report"

echo "✅ Benchmark terminé !"
echo ""
echo "📁 Résultats sauvegardés dans: $RESULTS_DIR"
echo "📊 Rapport consolidé: $consolidated_report"
echo ""
echo "💡 Pour comparer avant/après:"
echo "   diff $RESULTS_DIR/before_consolidated_*.json $RESULTS_DIR/after_consolidated_*.json"

