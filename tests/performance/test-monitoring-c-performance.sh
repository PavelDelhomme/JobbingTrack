#!/bin/bash

# Script de test de performance pour monitoring-c
# Teste l'utilisation CPU/mémoire sur 10 minutes et détecte les lags

set -e

MONITORING_C_URL="${MONITORING_C_URL:-http://localhost:5098}"
DURATION_MINUTES=10
INTERVAL_SECONDS=5
LOG_FILE="/tmp/monitoring-c-performance-test.log"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     🧪 TEST PERFORMANCE MONITORING-C (10 minutes)             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 URL: $MONITORING_C_URL"
echo "⏱️  Durée: $DURATION_MINUTES minutes"
echo "🔄 Intervalle: $INTERVAL_SECONDS secondes"
echo "📝 Log: $LOG_FILE"
echo ""

# Nettoyer le fichier de log
> "$LOG_FILE"

# Fonction pour mesurer les métriques
measure_metrics() {
    local timestamp=$(date +%s)
    local timestamp_readable=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Mesurer le temps de réponse
    local start_time=$(date +%s%N)
    local response=$(curl -s -w "\n%{http_code}\n%{time_total}" "$MONITORING_C_URL/api/v1/metrics" 2>&1)
    local end_time=$(date +%s%N)
    
    local response_time_ms=$(( (end_time - start_time) / 1000000 ))
    local http_code=$(echo "$response" | tail -n 2 | head -n 1)
    local curl_time=$(echo "$response" | tail -n 1)
    
    # Mesurer les ressources Docker si disponible
    local cpu_usage="N/A"
    local mem_usage="N/A"
    local mem_limit="N/A"
    
    if command -v docker &> /dev/null; then
        local stats=$(docker stats --no-stream --format "{{.CPUPerc}}\t{{.MemUsage}}" jobbingtrack-monitoring-c 2>/dev/null || echo "")
        if [ -n "$stats" ]; then
            cpu_usage=$(echo "$stats" | awk '{print $1}')
            mem_usage=$(echo "$stats" | awk '{print $2}' | cut -d'/' -f1)
            mem_limit=$(echo "$stats" | awk '{print $2}' | cut -d'/' -f2)
        fi
    fi
    
    # Vérifier si la réponse est valide
    local is_valid=false
    local json_size=0
    
    if [ "$http_code" = "200" ]; then
        local json_body=$(echo "$response" | head -n -2)
        if echo "$json_body" | jq empty 2>/dev/null; then
            is_valid=true
            json_size=$(echo "$json_body" | wc -c)
        fi
    fi
    
    # Écrire dans le log
    echo "$timestamp|$timestamp_readable|$http_code|$response_time_ms|$curl_time|$cpu_usage|$mem_usage|$mem_limit|$is_valid|$json_size" >> "$LOG_FILE"
    
    # Afficher un point de progression
    printf "."
}

# Fonction pour calculer les statistiques
calculate_stats() {
    local file="$1"
    
    echo ""
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║     📊 STATISTIQUES DE PERFORMANCE                            ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    
    # Statistiques de réponse
    local total_requests=$(wc -l < "$file" | tr -d ' ')
    local success_requests=$(awk -F'|' '$3 == "200" {count++} END {print count+0}' "$file")
    local failed_requests=$((total_requests - success_requests))
    local success_rate=$(awk -v total="$total_requests" -v success="$success_requests" 'BEGIN {printf "%.2f", (success/total)*100}')
    
    echo "📈 REQUÊTES:"
    echo "   Total: $total_requests"
    echo "   Réussies: $success_requests ($success_rate%)"
    echo "   Échouées: $failed_requests"
    echo ""
    
    # Temps de réponse
    local avg_response=$(awk -F'|' '$4 != "" {sum+=$4; count++} END {if(count>0) printf "%.2f", sum/count; else print "N/A"}' "$file")
    local min_response=$(awk -F'|' '$4 != "" {if(min=="") min=$4; if($4<min) min=$4} END {print min+0}' "$file")
    local max_response=$(awk -F'|' '$4 != "" {if(max=="") max=$4; if($4>max) max=$4} END {print max+0}' "$file")
    
    echo "⚡ TEMPS DE RÉPONSE:"
    echo "   Moyen: ${avg_response}ms"
    echo "   Min: ${min_response}ms"
    echo "   Max: ${max_response}ms"
    echo ""
    
    # Détection des lags (réponses > 500ms)
    local lag_count=$(awk -F'|' '$4 > 500 {count++} END {print count+0}' "$file")
    local lag_percentage=$(awk -v total="$total_requests" -v lags="$lag_count" 'BEGIN {if(total>0) printf "%.2f", (lags/total)*100; else print "0.00"}' "$file")
    
    echo "⚠️  LAGS DÉTECTÉS (>500ms):"
    echo "   Nombre: $lag_count"
    echo "   Pourcentage: ${lag_percentage}%"
    echo ""
    
    # CPU et mémoire
    if awk -F'|' '$6 != "N/A" {found=1} END {exit !found}' "$file"; then
        local avg_cpu=$(awk -F'|' '$6 != "N/A" {gsub(/%/, "", $6); sum+=$6; count++} END {if(count>0) printf "%.2f", sum/count; else print "N/A"}' "$file")
        local max_cpu=$(awk -F'|' '$6 != "N/A" {gsub(/%/, "", $6); if(max=="") max=$6; if($6>max) max=$6} END {print max+0}' "$file")
        
        echo "💻 CPU:"
        echo "   Moyen: ${avg_cpu}%"
        echo "   Max: ${max_cpu}%"
        echo ""
    fi
    
    # Taille JSON
    local avg_json_size=$(awk -F'|' '$10 > 0 {sum+=$10; count++} END {if(count>0) printf "%.0f", sum/count; else print "N/A"}' "$file")
    local max_json_size=$(awk -F'|' '$10 > 0 {if(max=="") max=$10; if($10>max) max=$10} END {print max+0}' "$file")
    
    echo "📦 TAILLE RÉPONSE JSON:"
    echo "   Moyenne: ${avg_json_size} bytes"
    echo "   Max: ${max_json_size} bytes"
    echo ""
    
    # Recommandations
    echo "💡 RECOMMANDATIONS:"
    if (( $(echo "$lag_percentage > 5" | bc -l 2>/dev/null || echo 0) )); then
        echo "   ⚠️  Trop de lags détectés (>5%) - Optimisation nécessaire"
    else
        echo "   ✅ Performances acceptables"
    fi
    
    if [ "$avg_response" != "N/A" ] && (( $(echo "$avg_response > 1000" | bc -l 2>/dev/null || echo 0) )); then
        echo "   ⚠️  Temps de réponse moyen élevé (>1s) - Optimisation nécessaire"
    fi
    
    if [ "$success_rate" != "N/A" ] && (( $(echo "$success_rate < 95" | bc -l 2>/dev/null || echo 0) )); then
        echo "   ⚠️  Taux de réussite faible (<95%) - Vérifier la stabilité"
    fi
    
    echo ""
}

# Fonction pour nettoyer en cas d'interruption
cleanup() {
    echo ""
    echo ""
    echo "⚠️  Test interrompu - Calcul des statistiques..."
    calculate_stats "$LOG_FILE"
    exit 0
}

trap cleanup INT TERM

# Lancer le test
echo "🚀 Démarrage du test..."
echo ""

total_iterations=$((DURATION_MINUTES * 60 / INTERVAL_SECONDS))
current_iteration=0

while [ $current_iteration -lt $total_iterations ]; do
    measure_metrics
    current_iteration=$((current_iteration + 1))
    
    # Afficher progression tous les 10 points
    if [ $((current_iteration % 10)) -eq 0 ]; then
        echo ""
        echo "⏱️  Progression: $current_iteration/$total_iterations ($(($current_iteration * 100 / $total_iterations))%)"
    fi
    
    sleep $INTERVAL_SECONDS
done

echo ""
echo ""
echo "✅ Test terminé - Calcul des statistiques..."
calculate_stats "$LOG_FILE"

echo ""
echo "📝 Log complet disponible dans: $LOG_FILE"
echo ""

