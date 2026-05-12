#!/bin/bash

# Script de benchmark complet pour toutes les pages du backoffice
# Usage: ./scripts/performance/benchmark-all-backoffice.sh [before|after]

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RESULTS_DIR="tests/performance-benchmark"
MODE=${1:-"before"}

mkdir -p "$RESULTS_DIR"

echo "╔════════════════════════════════════════════════════════╗"
echo "║  📊 BENCHMARK COMPLET BACKOFFICE - JobbingTrack      ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "Mode: $MODE"
echo "Timestamp: $TIMESTAMP"
echo ""

FRONTEND_URL="http://localhost:5003"
API_URL="http://localhost:5002"

# Liste complète de toutes les pages du backoffice
BACKOFFICE_PAGES=(
    "backoffice:Vue d'ensemble"
    "backoffice/analytics:Analytics"
    "backoffice/statistics:Statistiques"
    "backoffice/applications:Applications"
    "backoffice/companies:Entreprises"
    "backoffice/users:Utilisateurs"
    "backoffice/contacts:Contacts"
    "backoffice/interviews:Entretiens"
    "backoffice/calls:Appels"
    "backoffice/events:Événements"
    "backoffice/followups:Relances"
    "backoffice/notifications:Notifications"
    "backoffice/data:Données"
    "backoffice/data-management:Gestion Données"
    "backoffice/archives:Archives"
    "backoffice/trash:Corbeille"
    "backoffice/user-analytics:Analytics Utilisateur"
    "backoffice/services:Gestion Services"
    "backoffice/security/logs:Logs Sécurité"
    "backoffice/security/policies:Politiques Sécurité"
    "backoffice/security/analysis:Analyse Sécurité"
    "backoffice/api-tester:Testeur API"
    "backoffice/test-data:Données de Test"
    "backoffice/mobile-emulator:Émulateur Mobile"
    "backoffice/playwright-tests:Tests Playwright"
    "backoffice/tests-api:Tests API"
    "backoffice/tests-backend:Tests Backend"
    "backoffice/tests-frontend:Tests Frontend"
    "backoffice/tests-backoffice:Tests Backoffice"
    "backoffice/performance-tests:Tests Performance"
    "backoffice/performance-tests/schedule:Programmer Tests"
    "backoffice/test-reports:Rapports de Tests"
    "backoffice/user-journey:Parcours Utilisateur"
    "backoffice/user-journey/custom:Parcours Personnalisé"
    "backoffice/emails:Dashboard Emails"
    "backoffice/email-monitor:Email Monitor"
    "backoffice/emails/templates:Templates Emails"
    "backoffice/emails/settings:Configuration Emails"
    "backoffice/emails/deliverability:Déliverabilité"
)

# Liste des endpoints API principaux
API_ENDPOINTS=(
    "/api/v1/applications:Applications"
    "/api/v1/companies:Companies"
    "/api/v1/auth/users:Users"
    "/api/v1/contacts:Contacts"
    "/api/v1/interviews:Interviews"
    "/api/v1/calls:Calls"
    "/api/v1/events:Events"
    "/api/v1/followups:Followups"
    "/api/v1/statistics:Statistics"
    "/api/v1/dashboard:Dashboard"
)

# Fonction pour mesurer le temps de chargement d'une page (avec plusieurs mesures)
measure_page_load() {
    local url=$1
    local name=$2
    local output_file="$RESULTS_DIR/${MODE}_page_${name//\//_}_${TIMESTAMP}.json"
    
    echo "🔍 Mesure de $name (3 tentatives)..."
    
    # ✅ OPTIMISATION : Faire 3 mesures et prendre la moyenne
    local times=()
    local http_codes=()
    local sizes=()
    local valid_measures=0
    
    for i in 1 2 3; do
        # Attendre un peu entre les mesures pour éviter le cache
        if [ $i -gt 1 ]; then
            sleep 0.5
        fi
        
        # Utiliser curl pour mesurer le temps de réponse (suivre les redirections avec -L)
        response=$(curl -s -L -w "\n%{time_total}\n%{http_code}\n%{size_download}" "$url" -o /tmp/response_${i}.html 2>&1)
        time_total=$(echo "$response" | tail -n 3 | head -n 1)
        http_code=$(echo "$response" | tail -n 2 | head -n 1)
        size_download=$(echo "$response" | tail -n 1)
        
        # Ne garder que les mesures valides (HTTP 200 ou 3xx)
        if [ "$http_code" = "200" ] || [ "$http_code" -ge 300 ] && [ "$http_code" -lt 400 ]; then
            times+=($time_total)
            http_codes+=($http_code)
            sizes+=($size_download)
            valid_measures=$((valid_measures + 1))
        fi
    done
    
    # Calculer la moyenne des temps valides
    local time_avg=0
    local size_avg=0
    local final_http_code=200
    
    if [ $valid_measures -gt 0 ]; then
        local time_sum=0
        local size_sum=0
        for i in $(seq 0 $((valid_measures - 1))); do
            time_sum=$(awk "BEGIN {printf \"%.6f\", $time_sum + ${times[$i]}}")
            size_sum=$(awk "BEGIN {printf \"%.0f\", $size_sum + ${sizes[$i]}}")
        done
        time_avg=$(awk "BEGIN {printf \"%.6f\", $time_sum / $valid_measures}")
        size_avg=$(awk "BEGIN {printf \"%.0f\", $size_sum / $valid_measures}")
        final_http_code=${http_codes[0]}
    else
        # Si aucune mesure valide, utiliser la dernière
        time_avg=${times[2]:-0}
        size_avg=${sizes[2]:-0}
        final_http_code=${http_codes[2]:-0}
    fi
    
    # Mesurer aussi la taille du fichier sauvegardé (dernier)
    size_file=$(stat -f%z /tmp/response_3.html 2>/dev/null || stat -c%s /tmp/response_3.html 2>/dev/null || echo "$size_avg")
    
    # Calculer size_kb sans bc
    size_kb=$(awk "BEGIN {printf \"%.2f\", $size_file / 1024}" 2>/dev/null || echo "$(($size_file / 1024)).$(($size_file % 1024 * 100 / 1024))")
    
    # Calculer min, max, median
    local time_min=${times[0]}
    local time_max=${times[0]}
    for time in "${times[@]}"; do
        if (( $(awk "BEGIN {print ($time < $time_min)}") )); then
            time_min=$time
        fi
        if (( $(awk "BEGIN {print ($time > $time_max)}") )); then
            time_max=$time
        fi
    done
    
    # Médiane (trier et prendre le milieu)
    local sorted_times=($(printf '%s\n' "${times[@]}" | sort -n))
    local time_median=${sorted_times[$((valid_measures / 2))]}
    
    # Créer un rapport JSON avec toutes les statistiques
    cat > "$output_file" <<EOF
{
  "mode": "$MODE",
  "timestamp": "$TIMESTAMP",
  "page": "$name",
  "url": "$url",
  "time_total": $time_avg,
  "time_min": $time_min,
  "time_max": $time_max,
  "time_median": $time_median,
  "measures_count": $valid_measures,
  "http_code": $final_http_code,
  "size_bytes": $size_file,
  "size_kb": $size_kb,
  "all_times": [$(IFS=','; echo "${times[*]}")],
  "date": "$(date -Iseconds 2>/dev/null || date '+%Y-%m-%dT%H:%M:%S%z')"
}
EOF
    
    if [ "$final_http_code" = "200" ] || [ "$final_http_code" -ge 300 ] && [ "$final_http_code" -lt 400 ]; then
        echo "  ✅ $name: ${time_avg}s (moyenne de $valid_measures mesures, ${size_file} bytes)"
    else
        echo "  ⚠️  $name: HTTP $final_http_code (${time_avg}s)"
    fi
}

# Fonction pour mesurer un endpoint API (avec plusieurs mesures)
measure_api_endpoint() {
    local endpoint=$1
    local name=$2
    local output_file="$RESULTS_DIR/${MODE}_api_${name//\//_}_${TIMESTAMP}.json"
    
    echo "🔍 Mesure API $name (3 tentatives)..."
    
    # ✅ OPTIMISATION : Faire 3 mesures et prendre la moyenne
    local times=()
    local http_codes=()
    local sizes=()
    local valid_measures=0
    
    for i in 1 2 3; do
        # Attendre un peu entre les mesures pour éviter le cache
        if [ $i -gt 1 ]; then
            sleep 0.3
        fi
        
        # Utiliser curl avec timeout (suivre les redirections avec -L)
        response=$(curl -s -L -w "\n%{time_total}\n%{http_code}\n%{size_download}" "$API_URL$endpoint" -H "Authorization: Bearer test" -o /tmp/api_response_${i}.json 2>&1 || echo -e "\n0\n000\n0")
        time_total=$(echo "$response" | tail -n 3 | head -n 1)
        http_code=$(echo "$response" | tail -n 2 | head -n 1)
        size_download=$(echo "$response" | tail -n 1)
        
        # Ne garder que les mesures valides (HTTP 200, 401, 403, ou 3xx)
        if [ "$http_code" = "200" ] || [ "$http_code" = "401" ] || [ "$http_code" = "403" ] || ([ "$http_code" -ge 300 ] && [ "$http_code" -lt 400 ]); then
            times+=($time_total)
            http_codes+=($http_code)
            sizes+=($size_download)
            valid_measures=$((valid_measures + 1))
        fi
    done
    
    # Calculer la moyenne des temps valides
    local time_avg=0
    local size_avg=0
    local final_http_code=200
    
    if [ $valid_measures -gt 0 ]; then
        local time_sum=0
        local size_sum=0
        for i in $(seq 0 $((valid_measures - 1))); do
            time_sum=$(awk "BEGIN {printf \"%.6f\", $time_sum + ${times[$i]}}")
            size_sum=$(awk "BEGIN {printf \"%.0f\", $size_sum + ${sizes[$i]}}")
        done
        time_avg=$(awk "BEGIN {printf \"%.6f\", $time_sum / $valid_measures}")
        size_avg=$(awk "BEGIN {printf \"%.0f\", $size_sum / $valid_measures}")
        final_http_code=${http_codes[0]}
    else
        # Si aucune mesure valide, utiliser la dernière
        time_avg=${times[2]:-0}
        size_avg=${sizes[2]:-0}
        final_http_code=${http_codes[2]:-0}
    fi
    
    size_file=$(stat -f%z /tmp/api_response_3.json 2>/dev/null || stat -c%s /tmp/api_response_3.json 2>/dev/null || echo "$size_avg")
    
    # Calculer size_kb sans bc
    size_kb=$(awk "BEGIN {printf \"%.2f\", $size_file / 1024}" 2>/dev/null || echo "$(($size_file / 1024)).$(($size_file % 1024 * 100 / 1024))")
    
    # Calculer min, max, median
    local time_min=${times[0]}
    local time_max=${times[0]}
    for time in "${times[@]}"; do
        if (( $(awk "BEGIN {print ($time < $time_min)}") )); then
            time_min=$time
        fi
        if (( $(awk "BEGIN {print ($time > $time_max)}") )); then
            time_max=$time
        fi
    done
    
    # Médiane
    local sorted_times=($(printf '%s\n' "${times[@]}" | sort -n))
    local time_median=${sorted_times[$((valid_measures / 2))]}
    
    cat > "$output_file" <<EOF
{
  "mode": "$MODE",
  "timestamp": "$TIMESTAMP",
  "endpoint": "$name",
  "url": "$API_URL$endpoint",
  "time_total": $time_avg,
  "time_min": $time_min,
  "time_max": $time_max,
  "time_median": $time_median,
  "measures_count": $valid_measures,
  "http_code": $final_http_code,
  "size_bytes": $size_file,
  "size_kb": $size_kb,
  "all_times": [$(IFS=','; echo "${times[*]}")],
  "date": "$(date -Iseconds 2>/dev/null || date '+%Y-%m-%dT%H:%M:%S%z')"
}
EOF
    
    if [ "$final_http_code" = "200" ] || [ "$final_http_code" = "401" ] || [ "$final_http_code" = "403" ]; then
        echo "  ✅ API $name: ${time_avg}s (moyenne de $valid_measures mesures, ${size_file} bytes)"
    else
        echo "  ⚠️  API $name: HTTP $final_http_code (${time_avg}s)"
    fi
}

echo "📊 Mesure de toutes les pages frontend du backoffice..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Mesurer toutes les pages
for page_info in "${BACKOFFICE_PAGES[@]}"; do
    IFS=':' read -r path name <<< "$page_info"
    measure_page_load "$FRONTEND_URL/$path" "$name"
done

echo ""
echo "📡 Mesure de tous les endpoints API..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Mesurer tous les endpoints API
for endpoint_info in "${API_ENDPOINTS[@]}"; do
    IFS=':' read -r endpoint name <<< "$endpoint_info"
    measure_api_endpoint "$endpoint" "$name"
done

echo ""
echo "📋 Génération du rapport consolidé..."

# Créer un rapport consolidé
consolidated_report="$RESULTS_DIR/${MODE}_all_backoffice_${TIMESTAMP}.json"
{
    echo "{"
    echo "  \"mode\": \"$MODE\","
    echo "  \"timestamp\": \"$TIMESTAMP\","
    echo "  \"pages\": ["
    first=true
    for file in "$RESULTS_DIR/${MODE}_"*"_${TIMESTAMP}.json"; do
        if [ -f "$file" ] && [[ "$file" != *"all_backoffice"* ]]; then
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

echo "✅ Benchmark complet terminé !"
echo ""
echo "📁 Résultats sauvegardés dans: $RESULTS_DIR"
echo "📊 Rapport consolidé: $consolidated_report"
echo ""
echo "💡 Pour comparer avant/après:"
echo "   ./scripts/performance/compare-all-backoffice.sh"

