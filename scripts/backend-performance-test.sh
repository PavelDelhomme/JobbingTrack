#!/bin/bash

# ============================================================================
# Script de test de performance Backend - JobbingTrack
# ============================================================================
# Analyse la consommation mémoire et CPU des services backend
# Objectif: Identifier les services gourmands et proposer des optimisations
# ============================================================================

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPORT_DIR="${PROJECT_DIR}/backend-performance-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="${REPORT_DIR}/backend_performance_${TIMESTAMP}.json"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================================================"
echo "🔍 TEST DE PERFORMANCE BACKEND"
echo "========================================================${NC}"
echo ""

mkdir -p "${REPORT_DIR}"

# Fonction pour obtenir les stats Docker
get_docker_stats() {
    echo -e "${BLUE}🐳 Analyse des conteneurs Docker...${NC}"
    
    local stats_json=$(docker stats --no-stream --format "{{json .}}" 2>/dev/null | jq -s '.' || echo "[]")
    local jobbingtrack_stats=$(echo "$stats_json" | jq '[.[] | select(.Name | startswith("jobbingtrack"))]')
    
    echo "$jobbingtrack_stats" | jq -r '.[] | "  • \(.Name): CPU \(.CPUPerc), Mémoire \(.MemUsage)"'
    
    echo "$jobbingtrack_stats" > "${REPORT_DIR}/docker_stats_${TIMESTAMP}.json"
    
    # Identifier les services les plus gourmands
    local top_cpu=$(echo "$jobbingtrack_stats" | jq -r 'sort_by(.CPUPerc | tonumber) | reverse | .[0:3] | .[] | "\(.Name): \(.CPUPerc)"')
    local top_memory=$(echo "$jobbingtrack_stats" | jq -r 'sort_by(.MemUsage | split(" / ") | .[0] | split("MiB") | .[0] | tonumber) | reverse | .[0:3] | .[] | "\(.Name): \(.MemUsage)"')
    
    echo ""
    echo "Top 3 CPU:"
    echo "$top_cpu" | while read line; do echo "  • $line"; done
    
    echo ""
    echo "Top 3 Mémoire:"
    echo "$top_memory" | while read line; do echo "  • $line"; done
    
    echo "$jobbingtrack_stats"
}

# Fonction pour analyser metrics-aggregator spécifiquement
analyze_metrics_aggregator() {
    echo -e "${BLUE}📊 Analyse détaillée de metrics-aggregator...${NC}"
    
    local container_name="jobbingtrack-metrics-aggregator"
    
    if ! docker ps --format "{{.Names}}" | grep -q "^${container_name}$"; then
        echo -e "${YELLOW}⚠️  Conteneur metrics-aggregator non trouvé${NC}"
        return
    fi
    
    # Stats détaillées
    if command -v jq &> /dev/null; then
        local stats=$(docker stats --no-stream --format "{{json .}}" "${container_name}" 2>/dev/null | jq '.' || echo "{}")
        
        echo "  • CPU: $(echo "$stats" | jq -r '.CPUPerc // "N/A"')"
        echo "  • Mémoire: $(echo "$stats" | jq -r '.MemUsage // "N/A"')"
        echo "  • Réseau: $(echo "$stats" | jq -r '.NetIO // "N/A"')"
        echo "  • Bloc I/O: $(echo "$stats" | jq -r '.BlockIO // "N/A"')"
        
        echo "$stats" > "${REPORT_DIR}/metrics_aggregator_${TIMESTAMP}.json"
    else
        echo "  • Stats (format texte):"
        docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" "${container_name}" 2>/dev/null || echo "  Impossible de récupérer les stats"
        echo "{}" > "${REPORT_DIR}/metrics_aggregator_${TIMESTAMP}.json"
    fi
    
    # Analyser le code source
    local backend_dir="${PROJECT_DIR}/backend/metrics-aggregator-service"
    if [ -d "$backend_dir" ]; then
        echo ""
        echo "Analyse du code source:"
        
        # Compter les appels Docker
        local docker_calls=$(grep -r "docker\|exec\|child_process" "${backend_dir}/src" --include="*.js" 2>/dev/null | wc -l || echo "0")
        echo "  • Appels Docker/exec: $docker_calls"
        
        # Compter les lectures de fichiers système
        local fs_reads=$(grep -r "readFile\|readFileSync\|/proc\|/sys" "${backend_dir}/src" --include="*.js" 2>/dev/null | wc -l || echo "0")
        echo "  • Lectures fichiers système: $fs_reads"
        
        # Compter les requêtes Prisma
        local prisma_calls=$(grep -r "prisma\." "${backend_dir}/src" --include="*.js" 2>/dev/null | wc -l || echo "0")
        echo "  • Appels Prisma: $prisma_calls"
        
        # Taille du code
        local lines_of_code=$(find "${backend_dir}/src" -name "*.js" -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}' || echo "0")
        echo "  • Lignes de code: $lines_of_code"
    fi
    
    echo "$stats" > "${REPORT_DIR}/metrics_aggregator_${TIMESTAMP}.json"
}

# Fonction pour analyser tous les services backend
analyze_all_backend_services() {
    echo -e "${BLUE}🔍 Analyse de tous les services backend...${NC}"
    
    local services=(
        "auth-service"
        "company-service"
        "application-service"
        "contact-service"
        "interview-service"
        "call-service"
        "event-service"
        "followup-service"
        "dashboard-service"
        "workflow-service"
        "notification-service"
        "security-service"
        "metrics-aggregator-service"
    )
    
    if command -v jq &> /dev/null; then
        local services_data="[]"
        
        for service in "${services[@]}"; do
            local container_name="jobbingtrack-${service}"
            
            if docker ps --format "{{.Names}}" | grep -q "^${container_name}$"; then
                local stats=$(docker stats --no-stream --format "{{json .}}" "${container_name}" 2>/dev/null | jq '.' || echo "{}")
                services_data=$(echo "$services_data" | jq ". + [{\"service\": \"$service\", \"stats\": $stats}]")
            fi
        done
        
        echo "$services_data" | jq -r '.[] | "  • \(.service): CPU \(.stats.CPUPerc // "N/A"), Mémoire \(.stats.MemUsage // "N/A")"'
        
        echo "$services_data" > "${REPORT_DIR}/all_services_${TIMESTAMP}.json"
    else
        echo "Services (format texte):"
        for service in "${services[@]}"; do
            local container_name="jobbingtrack-${service}"
            if docker ps --format "{{.Names}}" | grep -q "^${container_name}$"; then
                docker stats --no-stream --format "  • ${service}: CPU {{.CPUPerc}}, Mémoire {{.MemUsage}}" "${container_name}" 2>/dev/null || echo "  • ${service}: Stats non disponibles"
            fi
        done
        echo "[]" > "${REPORT_DIR}/all_services_${TIMESTAMP}.json"
    fi
}

# Fonction pour générer des recommandations
generate_recommendations() {
    echo ""
    echo -e "${YELLOW}================================================================"
    echo "💡 RECOMMANDATIONS D'OPTIMISATION BACKEND"
    echo "========================================================${NC}"
    echo ""
    
    echo "1. Metrics-Aggregator (Gain estimé: 30-50% CPU, 20-40% Mémoire):"
    echo "   • Optimiser les appels Docker (cache, pooling)"
    echo "   • Réduire la fréquence de collecte pour les métriques non critiques"
    echo "   • Utiliser des streams au lieu de lectures complètes de fichiers"
    echo "   • Implémenter un cache pour les métriques système"
    echo "   • Considérer Rust/Go pour les parties critiques (collecte Docker)"
    echo ""
    
    echo "2. Optimisations générales:"
    echo "   • Pool de connexions Prisma"
    echo "   • Cache Redis pour les données fréquemment accédées"
    echo "   • Lazy loading des dépendances lourdes"
    echo "   • Compression des réponses API"
    echo ""
    
    echo "3. Migration vers des langages plus performants:"
    echo "   • Rust: Excellent pour I/O système, très faible mémoire"
    echo "   • Go: Bon compromis performance/développement"
    echo "   • C/C++: Maximum performance, mais complexité élevée"
    echo ""
    
    echo -e "${BLUE}📖 Documentation: backend/PERFORMANCE_OPTIMIZATION.md${NC}"
    echo ""
}

# Fonction pour générer le rapport final
generate_report() {
    local docker_stats_file="${REPORT_DIR}/docker_stats_${TIMESTAMP}.json"
    local metrics_file="${REPORT_DIR}/metrics_aggregator_${TIMESTAMP}.json"
    local services_file="${REPORT_DIR}/all_services_${TIMESTAMP}.json"
    
    local docker_data="[]"
    local metrics_data="{}"
    local services_data="[]"
    
    [ -f "$docker_stats_file" ] && docker_data=$(cat "$docker_stats_file")
    [ -f "$metrics_file" ] && metrics_data=$(cat "$metrics_file")
    [ -f "$services_file" ] && services_data=$(cat "$services_file")
    
    cat > "$REPORT_FILE" <<EOF
{
  "timestamp": "$TIMESTAMP",
  "date": "$(date -Iseconds)",
  "docker_stats": $docker_data,
  "metrics_aggregator": $metrics_data,
  "all_services": $services_data
}
EOF
    
    echo -e "${GREEN}✅ Rapport généré: $REPORT_FILE${NC}"
    
    # ✅ Générer automatiquement un rapport HTML
    if [ -f "$REPORT_FILE" ]; then
        HTML_REPORT="${REPORT_FILE%.json}.html"
        if [ -f "scripts/generate-html-report.sh" ]; then
            bash scripts/generate-html-report.sh "$REPORT_FILE" "$HTML_REPORT"
            echo -e "${GREEN}✅ Rapport HTML généré: $HTML_REPORT${NC}"
        fi
    fi
}

test_api_endpoints() {
    echo -e "${BLUE}⚡ Test des endpoints API réels...${NC}"

    local API_URL="${API_GATEWAY_URL:-http://localhost:5002}"
    local METRICS_URL="${METRICS_AGGREGATOR_URL:-http://localhost:5004}"

    local endpoints=(
        "$API_URL/health|Gateway Health"
        "$API_URL/api/v1/applications|Applications"
        "$API_URL/api/v1/companies|Companies"
        "$API_URL/api/v1/contacts|Contacts"
        "$API_URL/api/v1/interviews|Interviews"
        "$API_URL/api/v1/calls|Calls"
        "$API_URL/api/v1/followups?limit=5|Followups"
        "$API_URL/api/v1/events?limit=5|Events"
        "$METRICS_URL/api/v1/metrics|Métriques"
        "$METRICS_URL/api/v1/docker/services/all|Docker services"
    )

    for entry in "${endpoints[@]}"; do
        local url="${entry%%|*}"
        local label="${entry##*|}"
        local start_ms=$(date +%s%3N)
        local code
        code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$url" 2>/dev/null || echo "000")
        local end_ms=$(date +%s%3N)
        local ms=$((end_ms - start_ms))

        if [ "$code" = "200" ] || [ "$code" = "401" ] || [ "$code" = "403" ]; then
            local note=""
            [ "$code" = "401" ] && note=" (auth requise)"
            echo "  ✅ $label: HTTP $code (${ms}ms)${note}"
        else
            echo "  ⚠️ $label: HTTP $code (${ms}ms)"
        fi
    done
}

# Exécution
main() {
    echo "Démarrage des tests de performance backend..."
    echo ""

    test_api_endpoints
    echo ""

    local docker_stats=$(get_docker_stats)
    echo ""

    analyze_metrics_aggregator
    echo ""

    analyze_all_backend_services
    echo ""

    generate_report
    generate_recommendations

    echo ""
    echo -e "${GREEN}✅ Tests de performance backend terminés !${NC}"
    echo -e "${BLUE}📁 Rapports disponibles dans: ${REPORT_DIR}${NC}"
}

main "$@"

