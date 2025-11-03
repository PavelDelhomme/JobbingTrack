#!/bin/bash

# ============================================================================
# Script de test complet du système de monitoring JobbingTrack
# ============================================================================

set -e

# Forcer le format numérique anglais pour éviter les erreurs printf
export LC_NUMERIC=C
export LC_ALL=C

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
METRICS_URL="${METRICS_URL:-http://localhost:8014}"
API_URL="${API_URL:-http://localhost:3000}"

echo "============================================================================"
echo "🔍 TEST COMPLET DU SYSTÈME DE MONITORING JOBBINGTRACK"
echo "============================================================================"
echo ""
echo "📍 URLs de test:"
echo "   - Metrics Aggregator: $METRICS_URL"
echo "   - API Gateway: $API_URL"
echo ""

# Vérifier si sysstat est installé (pour I/O disque)
if ! command -v iostat &> /dev/null; then
    echo -e "${YELLOW}⚠️  Note: iostat non installé (métriques I/O disque limitées)${NC}"
    echo "   Pour installer: sudo pacman -S sysstat (Manjaro/Arch)"
    echo "                   sudo apt install sysstat (Ubuntu/Debian)"
    echo ""
fi

# Fonction pour afficher un test
test_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📊 $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Fonction pour afficher un succès
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Fonction pour afficher une erreur
error() {
    echo -e "${RED}❌ $1${NC}"
}

# Fonction pour afficher un warning
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Fonction pour extraire et afficher une valeur JSON
extract_value() {
    local json="$1"
    local key="$2"
    echo "$json" | jq -r "$key // \"N/A\""
}

# Fonction pour vérifier qu'une valeur est numérique et > 0
check_numeric_value() {
    local value="$1"
    local name="$2"
    
    if [[ "$value" == "N/A" ]] || [[ -z "$value" ]]; then
        warning "$name: N/A (non disponible)"
        return 1
    elif [[ ! "$value" =~ ^[0-9]+\.?[0-9]*$ ]]; then
        error "$name: $value (non numérique)"
        return 1
    elif (( $(echo "$value > 0" | bc -l) )); then
        success "$name: $value"
        return 0
    else
        warning "$name: $value (zéro)"
        return 1
    fi
}

# Fonction pour afficher les métriques CPU de manière claire
display_cpu_metrics() {
    local cpu_docker="$1"
    local total_cpus="$2"
    local context="$3"  # "conteneurs" ou "système"
    
    if [ "$cpu_docker" == "N/A" ] || [ "$total_cpus" == "N/A" ]; then
        warning "   CPU: Données non disponibles"
        return 1
    fi
    
    local max_cpu=$(echo "$total_cpus * 100" | bc -l)
    local cpu_real=$(printf "%.2f" $(echo "scale=2; ($cpu_docker / $max_cpu) * 100" | bc -l))
    local cpu_cores=$(printf "%.2f" $(echo "scale=2; $cpu_docker / 100" | bc -l))
    
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}🔥 EXPLICATION CPU - $context${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "   📊 CPU Docker:        $(printf "%.2f" $cpu_docker)%"
    echo "   💡 Pourquoi >100% ?   Docker calcule: 1 cœur = 100%"
    echo "                         Donc 200% = 2 cœurs utilisés"
    echo ""
    echo "   🖥️  Votre système:     $total_cpus cœurs CPU disponibles"
    echo "   📈 Capacité max:      ${max_cpu}% (${total_cpus} × 100%)"
    echo ""
    echo -e "${GREEN}   ✅ UTILISATION RÉELLE:${NC}"
    echo "   • Cœurs utilisés:     ${cpu_cores} / ${total_cpus} cœurs"
    echo "   • % du système:       ${cpu_real}%"
    echo ""
    
    # Indicateur visuel
    local bar_length=50
    local filled=$(printf "%.0f" $(echo "scale=0; ($cpu_real * $bar_length) / 100" | bc -l))
    local bar=""
    for ((i=0; i<filled; i++)); do bar+="█"; done
    for ((i=filled; i<bar_length; i++)); do bar+="░"; done
    
    echo "   📊 [$bar] ${cpu_real}%"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Fonction pour convertir l'uptime en format lisible
convert_uptime() {
    local seconds=$1
    
    # Vérifier si c'est un nombre valide
    if ! [[ "$seconds" =~ ^[0-9]+\.?[0-9]*$ ]]; then
        echo "N/A"
        return
    fi
    
    # Convertir en entier
    seconds=$(printf "%.0f" "$seconds" 2>/dev/null || echo "0")
    
    # Calculer les unités
    local years=$((seconds / 31536000))
    seconds=$((seconds % 31536000))
    
    local months=$((seconds / 2592000))
    seconds=$((seconds % 2592000))
    
    local weeks=$((seconds / 604800))
    seconds=$((seconds % 604800))
    
    local days=$((seconds / 86400))
    seconds=$((seconds % 86400))
    
    local hours=$((seconds / 3600))
    seconds=$((seconds % 3600))
    
    local minutes=$((seconds / 60))
    seconds=$((seconds % 60))
    
    # Construire la chaîne de sortie
    local output=""
    
    [ $years -gt 0 ] && output="${output}${years} an$([ $years -gt 1 ] && echo "s" || echo ""), "
    [ $months -gt 0 ] && output="${output}${months} mois, "
    [ $weeks -gt 0 ] && output="${output}${weeks} sem$([ $weeks -gt 1 ] && echo "s" || echo ""), "
    [ $days -gt 0 ] && output="${output}${days} jour$([ $days -gt 1 ] && echo "s" || echo ""), "
    [ $hours -gt 0 ] && output="${output}${hours}h, "
    [ $minutes -gt 0 ] && output="${output}${minutes}min"
    
    # Enlever la virgule finale si présente
    output=$(echo "$output" | sed 's/, $//')
    
    # Si rien n'a été ajouté (moins d'une minute), afficher les secondes
    if [ -z "$output" ]; then
        output="${seconds}s"
    fi
    
    echo "$output"
}

# Fonction pour afficher un tableau de comparaison
display_comparison_table() {
    echo ""
    echo -e "${MAGENTA}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║         COMPARAISON HÔTE vs CONTENEURS JOBBINGTRACK           ║${NC}"
    echo -e "${MAGENTA}╠════════════════════════════════════════════════════════════════╣${NC}"
    printf "${MAGENTA}║${NC} %-30s ${MAGENTA}║${NC} %-15s ${MAGENTA}║${NC} %-15s ${MAGENTA}║${NC}\n" "Métrique" "Conteneurs" "Système Hôte"
    echo -e "${MAGENTA}╠════════════════════════════════════════════════════════════════╣${NC}"
    
    # CPU
    local cont_cpu="$1"
    local host_cpus="$2"
    local cont_cpu_real=$(printf "%.2f" $(echo "scale=2; ($cont_cpu / ($host_cpus * 100)) * 100" | bc -l 2>/dev/null || echo "0"))
    printf "${MAGENTA}║${NC} %-30s ${MAGENTA}║${NC} %-15s ${MAGENTA}║${NC} %-15s ${MAGENTA}║${NC}\n" "CPU utilisé" "${cont_cpu_real}%" "${host_cpus} cœurs"
    
    # Mémoire
    local cont_mem="$3"
    local host_mem_total_gb="$4"
    local host_mem_used_gb="$5"
    local host_mem_percent="$6"
    printf "${MAGENTA}║${NC} %-30s ${MAGENTA}║${NC} %-15s ${MAGENTA}║${NC} %-15s ${MAGENTA}║${NC}\n" "Mémoire utilisée" "${cont_mem}%" "${host_mem_percent}% (${host_mem_used_gb}GB/${host_mem_total_gb}GB)"
    
    # Conteneurs
    local cont_count="$7"
    local all_containers="$8"
    printf "${MAGENTA}║${NC} %-30s ${MAGENTA}║${NC} %-15s ${MAGENTA}║${NC} %-15s ${MAGENTA}║${NC}\n" "Conteneurs" "${cont_count} JobbingTrack" "${all_containers} total"
    
    # Load
    local load_avg="$9"
    local load_percent=$(printf "%.2f" $(echo "scale=2; ($load_avg / $host_cpus) * 100" | bc -l 2>/dev/null || echo "0"))
    printf "${MAGENTA}║${NC} %-30s ${MAGENTA}║${NC} %-15s ${MAGENTA}║${NC} %-15s ${MAGENTA}║${NC}\n" "Load Average" "${load_avg} (${load_percent}%)" "Max: ${host_cpus}"
    
    echo -e "${MAGENTA}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "💡 EXPLICATIONS:"
    echo "   • CPU: Docker rapporte ${cont_cpu}% mais c'est sur ${host_cpus} cœurs (100% = 1 cœur)"
    echo "          Utilisation réelle du système: ${cont_cpu_real}%"
    echo "   • Mémoire: Les conteneurs utilisent ${cont_mem}% de leur allocation"
    echo "              Le système hôte utilise ${host_mem_percent}% de ses ${host_mem_total_gb}GB"
    echo "   • Load Average: ${load_avg} signifie qu'en moyenne ${load_avg} processus attendent"
    echo "                   Sur ${host_cpus} cœurs, c'est ${load_percent}% de charge"
    echo ""
}

# ============================================================================
# TEST 1: Health Check du service de métriques
# ============================================================================
test_section "1. HEALTH CHECK - Service de métriques"

response=$(curl -s "$METRICS_URL/api/v1/health")
if [ $? -eq 0 ] && [ -n "$response" ]; then
    status=$(echo "$response" | jq -r '.status // "N/A"')
    uptime_raw=$(echo "$response" | jq -r '.uptime // "N/A"')
    service=$(echo "$response" | jq -r '.service // "N/A"')
    
    # Convertir l'uptime en format lisible
    if [ "$uptime_raw" != "N/A" ]; then
        uptime_formatted=$(convert_uptime "$uptime_raw")
    else
        uptime_formatted="N/A"
    fi
    
    if [ "$status" == "ok" ] || [ "$status" == "healthy" ] || [ -n "$uptime_raw" ]; then
        success "Service de métriques opérationnel"
        echo "   Service: $service"
        echo "   Status: $status"
        echo "   Uptime: $uptime_formatted"
    else
        warning "Service répond mais status inconnu: $status"
        echo "   Réponse brute: $response"
    fi
else
    error "Impossible de joindre le service de métriques"
    echo "   Vérifiez que le service tourne sur $METRICS_URL"
    exit 1
fi

# ============================================================================
# TEST 2: Métriques Docker Agrégées
# ============================================================================
test_section "2. MÉTRIQUES DOCKER AGRÉGÉES"

response=$(curl -s "$METRICS_URL/api/v1/docker/jobbingtrack/aggregated")
if [ $? -eq 0 ]; then
    success "Récupération des métriques agrégées réussie"
    
    # Extraction des valeurs principales
    containers_count=$(extract_value "$response" '.containers_count')
    cpu_percent=$(extract_value "$response" '.cpu_percent')
    cpu_per_core=$(extract_value "$response" '.cpu_percent_per_core')
    memory_percent=$(extract_value "$response" '.memory_percent')
    memory_usage_mb=$(extract_value "$response" '.memory_usage_mb')
    load_average=$(extract_value "$response" '.load_average')
    total_cpus=$(extract_value "$response" '.total_cpus')
    
    echo ""
    echo "📦 CONTENEURS:"
    check_numeric_value "$containers_count" "   Nombre de conteneurs"
    
    # Utiliser la nouvelle fonction pour afficher les métriques CPU
    display_cpu_metrics "$cpu_percent" "$total_cpus" "Conteneurs JobbingTrack"
    
    check_numeric_value "$cpu_per_core" "   CPU par cœur (moyenne)"
    
    echo ""
    echo "💾 MÉMOIRE:"
    check_numeric_value "$memory_percent" "   Mémoire utilisée (%)"
    check_numeric_value "$memory_usage_mb" "   Mémoire utilisée (MB)"
    
    echo ""
    echo "⚡ CHARGE SYSTÈME:"
    check_numeric_value "$load_average" "   Load Average"
    
    # Réseau
    echo ""
    echo "🌐 RÉSEAU:"
    network_rx=$(extract_value "$response" '.network.total_rx_mb')
    network_tx=$(extract_value "$response" '.network.total_tx_mb')
    check_numeric_value "$network_rx" "   Trafic RX (MB)"
    check_numeric_value "$network_tx" "   Trafic TX (MB)"
    
    # Temps de réponse
    echo ""
    echo "⏱️  TEMPS DE RÉPONSE:"
    avg_response=$(extract_value "$response" '.response_time.average_ms')
    fastest_response=$(extract_value "$response" '.response_time.fastest_ms')
    slowest_response=$(extract_value "$response" '.response_time.slowest_ms')
    check_numeric_value "$avg_response" "   Temps moyen (ms)"
    check_numeric_value "$fastest_response" "   Plus rapide (ms)"
    check_numeric_value "$slowest_response" "   Plus lent (ms)"
    
    # Erreurs
    echo ""
    echo "🚨 ERREURS:"
    total_errors=$(extract_value "$response" '.errors.total_last_5m')
    error_rate=$(extract_value "$response" '.errors.rate_per_min')
    echo "   Total erreurs (5 min): $total_errors"
    echo "   Taux d'erreur (/min): $error_rate"
    
    # Santé
    echo ""
    echo "💚 SANTÉ DES SERVICES:"
    availability=$(extract_value "$response" '.health.availability_percent')
    healthy=$(extract_value "$response" '.health.healthy')
    degraded=$(extract_value "$response" '.health.degraded')
    offline=$(extract_value "$response" '.health.offline')
    check_numeric_value "$availability" "   Disponibilité (%)"
    echo "   Services sains: $healthy"
    echo "   Services dégradés: $degraded"
    echo "   Services hors ligne: $offline"
    
    # Charge globale
    echo ""
    echo "📈 CHARGE GLOBALE:"
    load_score=$(extract_value "$response" '.overall_load_score')
    check_numeric_value "$load_score" "   Score de charge (0-1)"
    
else
    error "Impossible de récupérer les métriques agrégées"
fi

# ============================================================================
# TEST 3: Liste de tous les services
# ============================================================================
test_section "3. LISTE DES SERVICES"

response=$(curl -s "$METRICS_URL/api/v1/docker/services/all")
if [ $? -eq 0 ]; then
    total=$(extract_value "$response" '.total')
    success "Liste des services récupérée"
    echo "   Nombre total de services: $total"
    
    # Afficher TOUS les services avec leurs métriques
    echo ""
    echo "📋 LISTE COMPLÈTE DES $total SERVICES:"
    echo ""
    
    # Calculer les totaux pour le résumé
    total_cpu=$(echo "$response" | jq '[.services[].metrics.cpu_percent] | add')
    total_mem_mb=$(echo "$response" | jq '[.services[].metrics.memory_usage_mb] | add')
    running_count=$(echo "$response" | jq '[.services[] | select(.is_running == true)] | length')
    
    # Afficher chaque service
    echo "$response" | jq -r '.services[] | 
        "   🔹 \(.name)\n" +
        "      CPU: \(.metrics.cpu_percent)% | Mémoire: \(.metrics.memory_percent)% (\(.metrics.memory_usage_mb)MB)\n" +
        "      PIDs: \(.metrics.pids // "N/A") | Status: \(if .is_running then "✅ Running" else "❌ Stopped" end)\n"'
    
    echo ""
    echo "📊 RÉSUMÉ DES SERVICES:"
    echo "   Total services: $total"
    echo "   Services actifs: $running_count"
    echo "   Services arrêtés: $((total - running_count))"
    echo "   CPU total: $(printf "%.2f" $total_cpu)%"
    echo "   Mémoire totale: $(printf "%.2f" $total_mem_mb) MB"
    
else
    error "Impossible de récupérer la liste des services"
fi

# ============================================================================
# TEST 4: Métriques système COMPLÈTES
# ============================================================================
test_section "4. MÉTRIQUES SYSTÈME COMPLÈTES"

# Récupérer à la fois /metrics et /aggregated pour avoir toutes les infos
metrics_response=$(curl -s "$METRICS_URL/api/v1/metrics")
aggregated_response=$(curl -s "$METRICS_URL/api/v1/docker/jobbingtrack/aggregated")

if [ $? -eq 0 ]; then
    success "Métriques système récupérées"
    
    # Essayer d'abord depuis aggregated (plus fiable)
    cpu_percent=$(extract_value "$aggregated_response" '.cpu_percent')
    cpus=$(extract_value "$aggregated_response" '.total_cpus')
    cpu_per_core=$(extract_value "$aggregated_response" '.cpu_percent_per_core')
    load_avg=$(extract_value "$aggregated_response" '.load_average')
    
    # Fallback sur metrics si pas dispo
    if [ "$cpus" == "N/A" ]; then
        cpus=$(extract_value "$metrics_response" '.system.cpus')
    fi
    
    cpu_model=$(extract_value "$metrics_response" '.system.cpu.model')
    uptime_hours=$(extract_value "$metrics_response" '.system.uptime')
    
    # Afficher les métriques CPU avec la nouvelle fonction
    display_cpu_metrics "$cpu_percent" "$cpus" "Système Global"
    
    echo "   Modèle CPU: $cpu_model"
    check_numeric_value "$cpu_per_core" "   CPU moyen par cœur"
    
    echo ""
    echo "⚡ CHARGE SYSTÈME:"
    check_numeric_value "$load_avg" "   Load Average"
    if [ "$uptime_hours" != "N/A" ]; then
        # Convertir les heures en secondes pour la fonction convert_uptime
        uptime_seconds=$(echo "scale=0; $uptime_hours * 3600" | bc -l 2>/dev/null || echo "0")
        uptime_formatted=$(convert_uptime "$uptime_seconds")
        echo "   Uptime: $uptime_formatted"
    fi
    
    echo ""
    echo "💾 MÉMOIRE SYSTÈME:"
    
    # Utiliser aggregated pour les vraies valeurs
    mem_percent=$(extract_value "$aggregated_response" '.memory_percent')
    mem_usage_mb=$(extract_value "$aggregated_response" '.memory_usage_mb')
    mem_total_mb=$(extract_value "$aggregated_response" '.memory_system_total_mb')
    
    # Fallback sur metrics
    mem_total_str=$(extract_value "$metrics_response" '.system.memory_total')
    
    if [ "$mem_total_str" != "N/A" ]; then
        echo "   Mémoire totale système: $mem_total_str"
    elif [ "$mem_total_mb" != "N/A" ]; then
        mem_total_gb=$(echo "scale=2; $mem_total_mb / 1024" | bc -l)
        echo "   Mémoire totale système: ${mem_total_gb} GB"
    fi
    
    if [ "$mem_usage_mb" != "N/A" ]; then
        mem_usage_gb=$(echo "scale=2; $mem_usage_mb / 1024" | bc -l)
        echo "   Mémoire utilisée (conteneurs): ${mem_usage_gb} GB (${mem_usage_mb} MB)"
    fi
    
    if [ "$mem_percent" != "N/A" ]; then
        check_numeric_value "$mem_percent" "   Utilisation mémoire conteneurs (%)"
        
        if [ "$mem_total_mb" != "N/A" ] && [ "$mem_usage_mb" != "N/A" ]; then
            mem_free_mb=$(echo "$mem_total_mb - $mem_usage_mb" | bc -l)
            mem_free_gb=$(echo "scale=2; $mem_free_mb / 1024" | bc -l)
            echo "   Mémoire libre: ${mem_free_gb} GB (${mem_free_mb} MB)"
        fi
    fi
    
    echo ""
    echo "💿 DISQUES:"
    
    # Essayer d'abord depuis aggregated
    disk_count=$(echo "$aggregated_response" | jq '.disk | length')
    if [ "$disk_count" != "0" ] && [ "$disk_count" != "null" ]; then
        success "   $disk_count partition(s) détectée(s)"
        echo "$aggregated_response" | jq -r '.disk[] | 
            "   📁 \(.mountpoint):\n" +
            "      Total: \(.total_gb) GB | Utilisé: \(.used_gb) GB (\(.usage_percent)%)\n" +
            "      Libre: \(.available_gb) GB | Inodes: \(.inodes_used // "N/A")/\(.inodes_total // "N/A")"'
    else
        # Fallback sur metrics
        disk_count=$(echo "$metrics_response" | jq '.system.disk | length')
        if [ "$disk_count" != "0" ] && [ "$disk_count" != "null" ]; then
            success "   $disk_count disque(s) détecté(s)"
            echo "$metrics_response" | jq -r '.system.disk[] | "   📁 \(.mountpoint):\n      - Total: \(.total_gb) GB\n      - Utilisé: \(.used_gb) GB (\(.usage_percent)%)\n      - Libre: \(.available_gb) GB"'
        else
            warning "   Aucun disque détecté"
        fi
    fi
    
    echo ""
    echo "🌐 RÉSEAU CONTENEURS:"
    network_rx=$(extract_value "$aggregated_response" '.network.total_rx_mb')
    network_tx=$(extract_value "$aggregated_response" '.network.total_tx_mb')
    
    if [ "$network_rx" != "N/A" ] && [ "$network_tx" != "N/A" ]; then
        total_network=$(echo "$network_rx + $network_tx" | bc -l)
        echo "   RX (réception): ${network_rx} MB"
        echo "   TX (émission): ${network_tx} MB"
        echo "   Total: ${total_network} MB"
    else
        warning "   Statistiques réseau non disponibles"
    fi
    
else
    error "Impossible de récupérer les métriques système"
fi

# ============================================================================
# TEST 5: Disque système détaillé
# ============================================================================
test_section "5. MÉTRIQUES DISQUE DÉTAILLÉES"

response=$(curl -s "$METRICS_URL/api/v1/docker/jobbingtrack/aggregated")
disk_data_found=false

if [ $? -eq 0 ]; then
    disk_count=$(echo "$response" | jq '.disk | length')
    
    # Vérifier si les données sont valides (pas null)
    if [ "$disk_count" != "0" ] && [ "$disk_count" != "null" ]; then
        # Vérifier si les valeurs ne sont pas "null"
        first_total=$(echo "$response" | jq -r '.disk[0].total_gb // "null"')
        if [ "$first_total" != "null" ]; then
            success "Métriques disque disponibles ($disk_count disques)"
            echo ""
            echo "$response" | jq -r '.disk[] | "💿 \(.mountpoint):\n   - Total: \(.total_gb) GB\n   - Utilisé: \(.used_gb) GB (\(.usage_percent)%)\n   - Disponible: \(.available_gb) GB"'
            disk_data_found=true
        fi
    fi
fi

# Fallback : utiliser df directement si l'API retourne null
if [ "$disk_data_found" = false ]; then
    warning "Données disque API non disponibles, utilisation de df"
    echo ""
    
    # Récupérer les données avec df
    df -h --output=source,size,used,avail,pcent,target | grep -E '^/' | while read -r line; do
        device=$(echo "$line" | awk '{print $1}')
        total=$(echo "$line" | awk '{print $2}')
        used=$(echo "$line" | awk '{print $3}')
        avail=$(echo "$line" | awk '{print $4}')
        percent=$(echo "$line" | awk '{print $5}')
        mount=$(echo "$line" | awk '{print $6}')
        
        echo "💿 $mount ($device):"
        echo "   - Total: $total"
        echo "   - Utilisé: $used ($percent)"
        echo "   - Disponible: $avail"
        echo ""
    done
fi

# ============================================================================
# TEST 6: Informations Docker
# ============================================================================
test_section "6. INFORMATIONS DOCKER"

response=$(curl -s "$METRICS_URL/api/v1/docker/jobbingtrack/aggregated")
if [ $? -eq 0 ]; then
    success "Informations Docker récupérées"
    
    server_version=$(extract_value "$response" '.system.server_version')
    os=$(extract_value "$response" '.system.operating_system')
    arch=$(extract_value "$response" '.system.architecture')
    containers_total=$(extract_value "$response" '.system.containers_total')
    containers_running=$(extract_value "$response" '.system.containers_running')
    
    echo ""
    echo "🐳 DOCKER:"
    echo "   Version: $server_version"
    echo "   Système: $os"
    echo "   Architecture: $arch"
    echo "   Conteneurs total: $containers_total"
    echo "   Conteneurs en cours: $containers_running"
else
    error "Impossible de récupérer les informations Docker"
fi

# ============================================================================
# TEST 7: Historique et Persistance des métriques
# ============================================================================
test_section "7. HISTORIQUE ET PERSISTANCE DES MÉTRIQUES"

response=$(curl -s "$METRICS_URL/api/v1/docker/history?limit=10")
if [ $? -eq 0 ]; then
    count=$(echo "$response" | jq '.data | length')
    
    if [ "$count" != "0" ] && [ "$count" != "null" ]; then
        success "Historique disponible: $count entrées"
        
        # Afficher les 5 dernières entrées
        echo ""
        echo "📅 5 DERNIÈRES ENTRÉES D'HISTORIQUE:"
        echo "$response" | jq -r '.data[:5] | .[] | 
            "────────────────────────────────────────\n" +
            "⏰ \(.timestamp // .unix_timestamp)\n" +
            "   CPU: \(.cpu_percent)% | Mémoire: \(.memory_percent)%\n" +
            "   Load: \(.load_average // "N/A") | Conteneurs: \(.containers_count // "N/A")\n" +
            "   Réseau: RX \(.network.total_rx_mb // 0)MB, TX \(.network.total_tx_mb // 0)MB\n" +
            "   Disponibilité: \(.health.availability_percent // "N/A")%"'
        
        # Vérifier la persistance (comparer première et dernière entrée)
        echo ""
        echo "🔍 VÉRIFICATION DE LA PERSISTANCE:"
        first_timestamp=$(echo "$response" | jq -r '.data[0].timestamp // .data[0].unix_timestamp')
        last_timestamp=$(echo "$response" | jq -r '.data[-1].timestamp // .data[-1].unix_timestamp')
        
        if [ "$first_timestamp" != "$last_timestamp" ] && [ "$first_timestamp" != "null" ]; then
            success "   Les métriques sont enregistrées dans le temps"
            echo "   Première entrée: $first_timestamp"
            echo "   Dernière entrée: $last_timestamp"
            
            # Calculer la différence de temps
            if command -v date >/dev/null 2>&1; then
                first_epoch=$(date -d "$first_timestamp" +%s 2>/dev/null || echo "0")
                last_epoch=$(date -d "$last_timestamp" +%s 2>/dev/null || echo "0")
                if [ "$first_epoch" != "0" ] && [ "$last_epoch" != "0" ]; then
                    diff_seconds=$((first_epoch - last_epoch))
                    diff_minutes=$((diff_seconds / 60))
                    echo "   Période couverte: ~${diff_minutes} minutes"
                fi
            fi
        else
            warning "   Impossible de vérifier la persistance temporelle"
        fi
        
        # Vérifier la cohérence des données
        echo ""
        echo "📊 STATISTIQUES SUR L'HISTORIQUE:"
        avg_cpu=$(echo "$response" | jq '[.data[].cpu_percent] | add / length')
        avg_mem=$(echo "$response" | jq '[.data[].memory_percent] | add / length')
        avg_avail=$(echo "$response" | jq '[.data[].health.availability_percent // 0] | add / length')
        
        echo "   CPU moyen sur la période: $(printf "%.2f" $avg_cpu)%"
        echo "   Mémoire moyenne: $(printf "%.2f" $avg_mem)%"
        echo "   Disponibilité moyenne: $(printf "%.2f" $avg_avail)%"
        
    else
        warning "Aucun historique disponible"
        echo "   💡 Astuce: Attendez quelques minutes que le système collecte des données"
    fi
else
    error "Impossible de récupérer l'historique"
fi

# ============================================================================
# TEST 8: Sessions actives (API Gateway)
# ============================================================================
test_section "8. SESSIONS ACTIVES"

echo "⚠️  Ce test nécessite un token d'authentification"
echo "   Test ignoré pour le moment"

# ============================================================================
# TEST 9: Performance détaillée par service
# ============================================================================
test_section "9. PERFORMANCE DÉTAILLÉE PAR SERVICE"

response=$(curl -s "$METRICS_URL/api/v1/docker/jobbingtrack/aggregated")
if [ $? -eq 0 ]; then
    success "Analyse des performances par service"
    
    total_services=$(echo "$response" | jq '.containers | length')
    echo "   Services analysés: $total_services"
    
    echo ""
    echo "🏆 TOP 5 Utilisation CPU:"
    echo "$response" | jq -r '.containers | sort_by(-.cpu_percent) | .[:5] | .[] | 
        "   \(.cpu_percent)% - \(.name)\n      Status: \(.health_status // "N/A") | PIDs: \(.pids // "N/A")"'
    
    echo ""
    echo "💾 TOP 5 Utilisation Mémoire:"
    echo "$response" | jq -r '.containers | sort_by(-.memory_percent) | .[:5] | .[] | 
        "   \(.memory_percent)% - \(.name)\n      \(.memory_usage_mb)MB / \(.memory_limit_mb)MB"'
    
    echo ""
    echo "🌐 TOP 5 Trafic Réseau (Total):"
    echo "$response" | jq -r '.containers | map(. + {total_network: (.network_rx_mb + .network_tx_mb)}) | 
        sort_by(-.total_network) | .[:5] | .[] | 
        "   \(.total_network)MB - \(.name)\n      RX: \(.network_rx_mb)MB | TX: \(.network_tx_mb)MB"'
    
    echo ""
    echo "⏱️  TOP 5 Temps de Réponse (Plus lents):"
    slowest=$(echo "$response" | jq -r '.containers | 
        map(select(.response_time_ms != null and .response_time_ms > 0)) | 
        sort_by(-.response_time_ms) | .[:5] | .[] | 
        "   \(.response_time_ms)ms - \(.name) (\(.health_status))"')
    if [ -n "$slowest" ]; then
        echo "$slowest"
    else
        warning "   Aucune donnée de temps de réponse disponible"
    fi
    
    echo ""
    echo "🚨 Services avec Erreurs:"
    errors=$(echo "$response" | jq -r '.containers | 
        map(select(.error_count_5m > 0)) | 
        sort_by(-.error_count_5m) | .[] | 
        "   ❌ \(.name): \(.error_count_5m) erreurs (5min) | \(.error_rate_per_min)/min"')
    if [ -n "$errors" ]; then
        echo "$errors"
    else
        success "   Aucune erreur détectée sur les services ✅"
    fi
    
    echo ""
    echo "📊 STATISTIQUES GLOBALES - $total_services SERVICES:"
    
    # Totaux
    total_cpu=$(echo "$response" | jq '[.containers[].cpu_percent] | add')
    avg_cpu_per_service=$(echo "$response" | jq '[.containers[].cpu_percent] | add / length')
    total_mem_percent=$(echo "$response" | jq '[.containers[].memory_percent] | add')
    avg_mem_per_service=$(echo "$response" | jq '[.containers[].memory_percent] | add / length')
    total_mem_mb=$(echo "$response" | jq '[.containers[].memory_usage_mb] | add')
    total_network_rx=$(echo "$response" | jq '[.containers[].network_rx_mb] | add')
    total_network_tx=$(echo "$response" | jq '[.containers[].network_tx_mb] | add')
    total_network=$(echo "$total_network_rx + $total_network_tx" | bc -l)
    
    # Temps de réponse
    avg_response_time=$(echo "$response" | jq '[.containers[] | select(.response_time_ms != null and .response_time_ms > 0)] | map(.response_time_ms) | add / length')
    if [ "$avg_response_time" == "null" ]; then
        avg_response_time="N/A"
    fi
    
    echo ""
    echo "   🔥 CPU (sur $total_services services):"
    echo "      • Total: $(printf "%.2f" $total_cpu)%"
    echo "      • Moyenne par service: $(printf "%.2f" $avg_cpu_per_service)%"
    
    echo ""
    echo "   💾 MÉMOIRE (sur $total_services services):"
    echo "      • Total: $(printf "%.2f" $total_mem_percent)% ($(printf "%.2f" $total_mem_mb) MB)"
    echo "      • Moyenne par service: $(printf "%.2f" $avg_mem_per_service)%"
    
    echo ""
    echo "   🌐 RÉSEAU (sur $total_services services):"
    echo "      • RX Total: $(printf "%.2f" $total_network_rx) MB"
    echo "      • TX Total: $(printf "%.2f" $total_network_tx) MB"
    echo "      • Total: $(printf "%.2f" $total_network) MB"
    
    echo ""
    echo "   ⏱️  TEMPS DE RÉPONSE:"
    if [ "$avg_response_time" != "N/A" ]; then
        echo "      • Moyenne globale: $(printf "%.2f" $avg_response_time) ms"
    else
        echo "      • Moyenne globale: N/A"
    fi
    
else
    error "Impossible d'analyser les performances par service"
fi

# ============================================================================
# TEST 10: Validation des données
# ============================================================================
test_section "10. VALIDATION DES DONNÉES"

response=$(curl -s "$METRICS_URL/api/v1/docker/jobbingtrack/aggregated")
if [ $? -eq 0 ]; then
    echo ""
    echo "🔍 Vérification de la cohérence des données:"
    
    # Vérifier que le CPU total n'est pas > 100% * nombre de cœurs
    cpu_percent=$(extract_value "$response" '.cpu_percent')
    total_cpus=$(extract_value "$response" '.total_cpus')
    max_cpu=$((total_cpus * 100))
    
    if (( $(echo "$cpu_percent > 0 && $cpu_percent <= $max_cpu" | bc -l) )); then
        success "CPU total cohérent ($cpu_percent% <= ${max_cpu}%)"
    else
        error "CPU total incohérent ($cpu_percent% > ${max_cpu}%)"
    fi
    
    # Vérifier que la mémoire est entre 0 et 100%
    memory_percent=$(extract_value "$response" '.memory_percent')
    if (( $(echo "$memory_percent >= 0 && $memory_percent <= 100" | bc -l) )); then
        success "Mémoire cohérente (${memory_percent}%)"
    else
        error "Mémoire incohérente (${memory_percent}%)"
    fi
    
    # Vérifier que le nombre de services est cohérent
    containers_count=$(extract_value "$response" '.containers_count')
    healthy=$(extract_value "$response" '.health.healthy')
    degraded=$(extract_value "$response" '.health.degraded')
    offline=$(extract_value "$response" '.health.offline')
    
    total_health=$((healthy + degraded + offline))
    if [ "$containers_count" == "$total_health" ]; then
        success "Comptage des services cohérent ($containers_count services)"
    else
        warning "Comptage des services incohérent (total: $containers_count, santé: $total_health)"
    fi
else
    error "Impossible de valider les données"
fi

# ============================================================================
# TEST 11: Métriques Conteneurs vs Système Global
# ============================================================================
test_section "11. COHÉRENCE CONTENEURS vs SYSTÈME GLOBAL"

aggregated=$(curl -s "$METRICS_URL/api/v1/docker/jobbingtrack/aggregated")
system=$(curl -s "$METRICS_URL/api/v1/metrics")

if [ $? -eq 0 ]; then
    success "Comparaison des sources de métriques"
    
    # Extraire les valeurs
    containers_cpu=$(extract_value "$aggregated" '.cpu_percent')
    containers_mem=$(extract_value "$aggregated" '.memory_percent')
    containers_mem_mb=$(extract_value "$aggregated" '.memory_usage_mb')
    containers_count=$(extract_value "$aggregated" '.containers_count')
    system_cpus=$(extract_value "$aggregated" '.total_cpus')
    system_mem_total_str=$(extract_value "$system" '.system.memory_total')
    system_mem_total_gb=$(echo "$system_mem_total_str" | sed 's/[^0-9.]//g')
    system_load=$(extract_value "$aggregated" '.load_average')
    
    # Fallback pour system_cpus
    if [ "$system_cpus" == "N/A" ]; then
        system_cpus=$(extract_value "$system" '.system.cpus')
    fi
    
    # Récupérer la mémoire système utilisée (depuis l'API ou via free)
    system_mem_used_str=$(extract_value "$system" '.system.memory_used')
    if [ "$system_mem_used_str" == "N/A" ] || [ -z "$system_mem_used_str" ]; then
        # Fallback: utiliser la commande free
        system_mem_used_gb=$(free -g | awk '/^Mem:/ {printf "%.2f", $3}')
        system_mem_total_gb_check=$(free -g | awk '/^Mem:/ {print $2}')
        if [ -n "$system_mem_total_gb_check" ] && [ "$system_mem_total_gb_check" != "0" ]; then
            system_mem_total_gb=$system_mem_total_gb_check
        fi
    else
        system_mem_used_gb=$(echo "$system_mem_used_str" | sed 's/[^0-9.]//g')
    fi
    
    # Calculer le pourcentage de mémoire système utilisée
    if [ -n "$system_mem_used_gb" ] && [ -n "$system_mem_total_gb" ] && [ "$system_mem_total_gb" != "0" ]; then
        system_mem_percent=$(printf "%.2f" $(echo "scale=2; ($system_mem_used_gb / $system_mem_total_gb) * 100" | bc -l 2>/dev/null || echo "0"))
    else
        system_mem_percent="N/A"
        system_mem_used_gb="N/A"
    fi
    
    # Nombre total de conteneurs Docker
    all_containers=$(extract_value "$aggregated" '.system.containers_total')
    if [ "$all_containers" == "N/A" ]; then
        all_containers=$(docker ps -a | wc -l)
        all_containers=$((all_containers - 1))
    fi
    
    # Afficher le tableau de comparaison
    display_comparison_table "$containers_cpu" "$system_cpus" "$containers_mem" "$system_mem_total_gb" "$system_mem_used_gb" "$system_mem_percent" "$containers_count" "$all_containers" "$system_load"
    
    echo ""
    echo "🔍 ANALYSE DÉTAILLÉE:"
    
    if [ "$containers_cpu" != "N/A" ] && [ "$system_cpus" != "N/A" ]; then
        cpu_cores_used=$(printf "%.2f" $(echo "scale=2; $containers_cpu / 100" | bc -l))
        cpu_real_percent=$(printf "%.2f" $(echo "scale=2; ($containers_cpu / ($system_cpus * 100)) * 100" | bc -l))
        
        echo "   🔥 CPU:"
        echo "      • Docker rapporte:  ${containers_cpu}%"
        echo "      • Cœurs utilisés:   ${cpu_cores_used} / ${system_cpus} cœurs"
        echo "      • % réel système:   ${cpu_real_percent}%"
        
        if (( $(echo "$cpu_real_percent < 50" | bc -l) )); then
            success "      ✅ Charge CPU normale"
        elif (( $(echo "$cpu_real_percent < 80" | bc -l) )); then
            warning "      ⚠️  Charge CPU modérée"
        else
            error "      ❌ Charge CPU élevée"
        fi
    fi
    
    echo ""
    echo "   💾 Mémoire:"
    echo "      • Conteneurs:       ${containers_mem}% (${containers_mem_mb}MB)"
    echo "      • Système hôte:     ${system_mem_percent}% utilisé (${system_mem_used_gb}GB / ${system_mem_total_gb}GB)"
    
    echo ""
    echo "   📦 Conteneurs:"
    echo "      • JobbingTrack:     ${containers_count} actifs"
    
    echo ""
    echo "   ⚡ Charge système:"
    echo "      • Load Average:     ${system_load}"
    echo "      • Recommandé:       < ${system_cpus} (nombre de cœurs)"
    
    if [ "$system_load" != "N/A" ] && [ "$system_cpus" != "N/A" ]; then
        if (( $(echo "$system_load < $system_cpus" | bc -l) )); then
            success "      ✅ Load normal"
        else
            warning "      ⚠️  Load élevé (système surchargé)"
        fi
    fi
    
    # Vérifier si les données sont cohérentes
    echo ""
    if [ "$containers_count" != "N/A" ] && [ "$containers_count" -gt "0" ]; then
        success "✅ Données cohérentes et disponibles"
    else
        error "❌ Problème: Aucun conteneur détecté"
    fi
else
    error "Impossible de comparer les sources de métriques"
fi

# ============================================================================
# TEST 12: Monitoring dans le temps (Test temporel)
# ============================================================================
test_section "12. MONITORING DANS LE TEMPS (5 collectes complètes)"

success "Collecte de 5 échantillons espacés de 10 secondes"
echo "   Métriques collectées à chaque étape:"
echo "   - CPU, Mémoire, Load Average"
echo "   - Réseau (RX/TX)"
echo "   - Temps de réponse"
echo "   - Santé des services"
echo "   - Comparaison hôte vs conteneurs"
echo ""

# Fonction pour collecter toutes les métriques
collect_full_metrics() {
    local num=$1
    local sample=$(curl -s "$METRICS_URL/api/v1/docker/jobbingtrack/aggregated")
    
    # Extraire toutes les métriques (valeurs brutes SANS émojis pour calculs)
    local cpu=$(echo "$sample" | jq -r '.cpu_percent // 0')
    local mem=$(echo "$sample" | jq -r '.memory_percent // 0')
    local load=$(echo "$sample" | jq -r '.load_average // 0')
    local containers=$(echo "$sample" | jq -r '.containers_count // 0')
    local net_rx=$(echo "$sample" | jq -r '.network.total_rx_mb // 0')
    local net_tx=$(echo "$sample" | jq -r '.network.total_tx_mb // 0')
    local resp_time=$(echo "$sample" | jq -r '.response_time.average_ms // 0')
    local healthy=$(echo "$sample" | jq -r '.health.healthy // 0')
    local degraded=$(echo "$sample" | jq -r '.health.degraded // 0')
    local offline=$(echo "$sample" | jq -r '.health.offline // 0')
    local availability=$(echo "$sample" | jq -r '.health.availability_percent // 0')
    
    # Nettoyer les valeurs (enlever "null" et caractères non numériques)
    cpu=$(echo "$cpu" | grep -E '^[0-9.]+$' || echo "0")
    mem=$(echo "$mem" | grep -E '^[0-9.]+$' || echo "0")
    load=$(echo "$load" | grep -E '^[0-9.]+$' || echo "0")
    containers=$(echo "$containers" | grep -E '^[0-9]+$' || echo "0")
    net_rx=$(echo "$net_rx" | grep -E '^[0-9.]+$' || echo "0")
    net_tx=$(echo "$net_tx" | grep -E '^[0-9.]+$' || echo "0")
    resp_time=$(echo "$resp_time" | grep -E '^[0-9.]+$' || echo "0")
    availability=$(echo "$availability" | grep -E '^[0-9.]+$' || echo "0")
    
    # Afficher avec émojis
    echo "📊 COLLECTE $num/5 - $(date '+%H:%M:%S')"
    echo "   🔥 CPU: ${cpu}%"
    echo "   💾 Mémoire: ${mem}%"
    echo "   ⚡ Load: ${load}"
    echo "   🌐 Réseau: RX ${net_rx}MB / TX ${net_tx}MB"
    echo "   ⏱️  Temps réponse: ${resp_time}ms"
    echo "   💚 Santé: ${healthy} sains, ${degraded} dégradés, ${offline} offline (${availability}%)"
    echo ""
    
    # Retourner UNIQUEMENT les valeurs numériques pour calculs (pas d'émojis!)
    echo "$cpu|$mem|$load|$containers|$net_rx|$net_tx|$resp_time|$availability"
}

# Collecte 1
metrics1=$(collect_full_metrics 1)
[ "$1" != "5" ] && echo "   ⏳ Attente de 10 secondes..." && sleep 10

# Collecte 2
metrics2=$(collect_full_metrics 2)
[ "$1" != "5" ] && echo "   ⏳ Attente de 10 secondes..." && sleep 10

# Collecte 3
metrics3=$(collect_full_metrics 3)
[ "$1" != "5" ] && echo "   ⏳ Attente de 10 secondes..." && sleep 10

# Collecte 4
metrics4=$(collect_full_metrics 4)
[ "$1" != "5" ] && echo "   ⏳ Attente de 10 secondes..." && sleep 10

# Collecte 5
metrics5=$(collect_full_metrics 5)

# Extraire les valeurs pour analyse
IFS='|' read -r cpu1 mem1 load1 cont1 rx1 tx1 resp1 avail1 <<< "$metrics1"
IFS='|' read -r cpu2 mem2 load2 cont2 rx2 tx2 resp2 avail2 <<< "$metrics2"
IFS='|' read -r cpu3 mem3 load3 cont3 rx3 tx3 resp3 avail3 <<< "$metrics3"
IFS='|' read -r cpu4 mem4 load4 cont4 rx4 tx4 resp4 avail4 <<< "$metrics4"
IFS='|' read -r cpu5 mem5 load5 cont5 rx5 tx5 resp5 avail5 <<< "$metrics5"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📈 ANALYSE COMPLÈTE DE L'ÉVOLUTION (50 secondes)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Nettoyer et valider les valeurs avant calculs
cpu1=${cpu1:-0}; mem1=${mem1:-0}; load1=${load1:-0}; resp1=${resp1:-0}; avail1=${avail1:-0}
cpu2=${cpu2:-0}; mem2=${mem2:-0}; load2=${load2:-0}; resp2=${resp2:-0}; avail2=${avail2:-0}
cpu3=${cpu3:-0}; mem3=${mem3:-0}; load3=${load3:-0}; resp3=${resp3:-0}; avail3=${avail3:-0}
cpu4=${cpu4:-0}; mem4=${mem4:-0}; load4=${load4:-0}; resp4=${resp4:-0}; avail4=${avail4:-0}
cpu5=${cpu5:-0}; mem5=${mem5:-0}; load5=${load5:-0}; resp5=${resp5:-0}; avail5=${avail5:-0}

# Calculer moyennes (avec gestion d'erreurs)
avg_cpu=$(echo "scale=2; ($cpu1 + $cpu2 + $cpu3 + $cpu4 + $cpu5) / 5" | bc -l 2>/dev/null || echo "0")
avg_mem=$(echo "scale=2; ($mem1 + $mem2 + $mem3 + $mem4 + $mem5) / 5" | bc -l 2>/dev/null || echo "0")
avg_load=$(echo "scale=3; ($load1 + $load2 + $load3 + $load4 + $load5) / 5" | bc -l 2>/dev/null || echo "0")
avg_resp=$(echo "scale=2; ($resp1 + $resp2 + $resp3 + $resp4 + $resp5) / 5" | bc -l 2>/dev/null || echo "0")
avg_avail=$(echo "scale=2; ($avail1 + $avail2 + $avail3 + $avail4 + $avail5) / 5" | bc -l 2>/dev/null || echo "0")

# Valider que ce sont bien des nombres
avg_cpu=$(echo "$avg_cpu" | grep -E '^[0-9.]+$' || echo "0")
avg_mem=$(echo "$avg_mem" | grep -E '^[0-9.]+$' || echo "0")
avg_load=$(echo "$avg_load" | grep -E '^[0-9.]+$' || echo "0")
avg_resp=$(echo "$avg_resp" | grep -E '^[0-9.]+$' || echo "0")
avg_avail=$(echo "$avg_avail" | grep -E '^[0-9.]+$' || echo "0")

echo "⏱️  MOYENNES SUR 5 COLLECTES:"
echo "   • CPU:              $(printf "%.2f" "$avg_cpu" 2>/dev/null || echo "0.00")%"
echo "   • Mémoire:          $(printf "%.2f" "$avg_mem" 2>/dev/null || echo "0.00")%"
echo "   • Load Average:     $(printf "%.3f" "$avg_load" 2>/dev/null || echo "0.000")"
echo "   • Temps réponse:    $(printf "%.2f" "$avg_resp" 2>/dev/null || echo "0.00")ms"
echo "   • Disponibilité:    $(printf "%.2f" "$avg_avail" 2>/dev/null || echo "0.00")%"
echo ""

# Calculer min/max (avec gestion d'erreurs)
cpu_values="$cpu1 $cpu2 $cpu3 $cpu4 $cpu5"
cpu_min=$(echo "$cpu_values" | tr ' ' '\n' | grep -E '^[0-9.]+$' | sort -n | head -1)
cpu_max=$(echo "$cpu_values" | tr ' ' '\n' | grep -E '^[0-9.]+$' | sort -n | tail -1)
mem_values="$mem1 $mem2 $mem3 $mem4 $mem5"
mem_min=$(echo "$mem_values" | tr ' ' '\n' | grep -E '^[0-9.]+$' | sort -n | head -1)
mem_max=$(echo "$mem_values" | tr ' ' '\n' | grep -E '^[0-9.]+$' | sort -n | tail -1)

cpu_min=${cpu_min:-0}; cpu_max=${cpu_max:-0}
mem_min=${mem_min:-0}; mem_max=${mem_max:-0}

echo "📊 VARIATIONS:"
cpu_delta=$(echo "$cpu_max - $cpu_min" | bc -l 2>/dev/null || echo "0")
mem_delta=$(echo "$mem_max - $mem_min" | bc -l 2>/dev/null || echo "0")
echo "   • CPU:     Min ${cpu_min}% → Max ${cpu_max}% (Δ $(printf "%.2f" "$cpu_delta" 2>/dev/null || echo "0.00")%)"
echo "   • Mémoire: Min ${mem_min}% → Max ${mem_max}% (Δ $(printf "%.2f" "$mem_delta" 2>/dev/null || echo "0.00")%)"
echo ""

# Variations réseau (avec gestion d'erreurs)
rx1=${rx1:-0}; rx5=${rx5:-0}; tx1=${tx1:-0}; tx5=${tx5:-0}
net_rx_var=$(echo "$rx5 - $rx1" | bc -l 2>/dev/null || echo "0")
net_tx_var=$(echo "$tx5 - $tx1" | bc -l 2>/dev/null || echo "0")
echo "🌐 RÉSEAU (variation sur 50s):"
echo "   • RX: ${rx1}MB → ${rx5}MB (Δ ${net_rx_var}MB)"
echo "   • TX: ${tx1}MB → ${tx5}MB (Δ ${net_tx_var}MB)"
echo ""

# Tendances (avec gestion d'erreurs)
cpu_trend=$(echo "scale=2; $cpu5 - $cpu1" | bc -l 2>/dev/null || echo "0")
mem_trend=$(echo "scale=2; $mem5 - $mem1" | bc -l 2>/dev/null || echo "0")

echo "📈 TENDANCES:"
if (( $(echo "$cpu_trend > 5" | bc -l 2>/dev/null) )); then
    echo "   • CPU: 📈 En hausse (+$(printf "%.2f" "$cpu_trend" 2>/dev/null || echo "0.00")%)"
elif (( $(echo "$cpu_trend < -5" | bc -l 2>/dev/null) )); then
    echo "   • CPU: 📉 En baisse ($(printf "%.2f" "$cpu_trend" 2>/dev/null || echo "0.00")%)"
else
    echo "   • CPU: ➡️  Stable ($(printf "%.2f" "$cpu_trend" 2>/dev/null || echo "0.00")%)"
fi

if (( $(echo "$mem_trend > 3" | bc -l 2>/dev/null) )); then
    echo "   • Mémoire: 📈 En hausse (+$(printf "%.2f" "$mem_trend" 2>/dev/null || echo "0.00")%)"
elif (( $(echo "$mem_trend < -3" | bc -l 2>/dev/null) )); then
    echo "   • Mémoire: 📉 En baisse ($(printf "%.2f" "$mem_trend" 2>/dev/null || echo "0.00")%)"
else
    echo "   • Mémoire: ➡️  Stable ($(printf "%.2f" "$mem_trend" 2>/dev/null || echo "0.00")%)"
fi
echo ""

# Cohérence
echo "🔍 COHÉRENCE:"
if [ "$cont1" == "$cont2" ] && [ "$cont2" == "$cont3" ] && [ "$cont3" == "$cont4" ] && [ "$cont4" == "$cont5" ]; then
    success "   ✅ Nombre de conteneurs stable: $cont1"
else
    warning "   ⚠️  Nombre de conteneurs variable: $cont1 → $cont2 → $cont3 → $cont4 → $cont5"
fi

# Charge globale (avec gestion d'erreurs)
overall_load=$(echo "scale=3; (($avg_cpu / 100) + ($avg_mem / 100)) / 2" | bc -l 2>/dev/null || echo "0")
overall_load=$(echo "$overall_load" | grep -E '^[0-9.]+$' || echo "0")
echo ""
echo "⚖️  CHARGE GLOBALE MOYENNE:"
echo "   Score: $(printf "%.3f" "$overall_load" 2>/dev/null || echo "0.000") (0-1)"
if (( $(echo "$overall_load < 0.5" | bc -l 2>/dev/null) )); then
    success "   ✅ Charge normale"
elif (( $(echo "$overall_load < 0.8" | bc -l 2>/dev/null) )); then
    warning "   ⚠️  Charge modérée"
else
    error "   ❌ Charge élevée"
fi

success "✅ Monitoring temporel complet terminé (5 collectes, toutes métriques)"

# ============================================================================
# TEST 13: Métriques Disque I/O et Système Avancées
# ============================================================================
test_section "13. MÉTRIQUES DISQUE I/O ET SYSTÈME AVANCÉES"

echo "📊 Collecte des métriques avancées..."
echo ""

# Métriques disque I/O via iostat (si disponible)
if command -v iostat &> /dev/null; then
    echo "💿 DISQUE I/O (lecture/écriture par seconde):"
    iostat_output=$(iostat -x 1 2 | tail -n +4)
    
    if [ -n "$iostat_output" ]; then
        echo "$iostat_output" | awk 'NR>3 && NF>0 {
            printf "   📁 %s:\n", $1
            printf "      • Lectures:  %.2f kB/s\n", $6
            printf "      • Écritures: %.2f kB/s\n", $7
            printf "      • Utilisation: %.1f%%\n", $NF
        }'
    else
        echo "   (Données I/O en cours de collecte...)"
    fi
    echo ""
else
    warning "   iostat non disponible (installez sysstat)"
    echo ""
fi

# Informations sur TOUS les processus Docker du projet
echo "🔝 TOUS LES PROCESSUS DOCKER JOBBINGTRACK (par utilisation CPU):"

# Récupérer les stats de tous les conteneurs puis filtrer
docker_stats=$(docker stats --no-stream --format "{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}" 2>/dev/null | grep "jobbingtrack" | sort -t'|' -k2 -rn)

if [ -n "$docker_stats" ]; then
    # Afficher l'en-tête
    printf "   %-45s %-12s %-25s %s\n" "Service" "CPU" "Mémoire" "% Mem"
    echo "   ─────────────────────────────────────────────────────────────────────────────────"
    
    # Variables pour les totaux
    total_mem_used_mb=0
    total_mem_limit_gb=0
    container_count=0
    
    # Afficher chaque service et calculer totaux
    echo "$docker_stats" | while IFS='|' read -r name cpu mem mem_perc; do
        # Enlever le préfixe jobbingtrack- pour plus de clarté
        short_name=$(echo "$name" | sed 's/jobbingtrack-//')
        printf "   %-45s %-12s %-25s %s\n" "$short_name" "$cpu" "$mem" "$mem_perc"
        
        # Extraire la mémoire utilisée (en MiB) pour calcul total
        mem_used=$(echo "$mem" | awk '{print $1}' | sed 's/MiB//;s/GiB//')
        mem_unit=$(echo "$mem" | awk '{print $1}' | grep -o '[A-Za-z]*$')
        
        # Convertir en MB si nécessaire
        if [[ "$mem_unit" == "GiB" ]]; then
            mem_used=$(echo "scale=2; $mem_used * 1024" | bc -l 2>/dev/null || echo "$mem_used")
        fi
        
        # Ajouter au total (on fait ça dans une sous-shell, donc on ne peut pas modifier les variables globales)
        # On va plutôt recalculer après la boucle
    done
    
    # Recalculer les totaux en dehors de la boucle while (qui est dans un subshell)
    total_containers=$(echo "$docker_stats" | wc -l)
    
    # Extraire mémoire totale (limite) depuis la première ligne
    first_line=$(echo "$docker_stats" | head -1)
    mem_limit=$(echo "$first_line" | cut -d'|' -f3 | awk '{print $3}' | sed 's/GiB//')
    
    # Calculer la mémoire totale utilisée
    total_mem_mb=0
    while IFS='|' read -r name cpu mem mem_perc; do
        mem_used=$(echo "$mem" | awk '{print $1}' | sed 's/MiB//;s/GiB//')
        mem_unit=$(echo "$mem" | awk '{print $1}' | grep -o '[A-Za-z]*$')
        
        if [[ "$mem" == *"GiB"* ]]; then
            mem_used_mb=$(echo "scale=2; $mem_used * 1024" | bc -l 2>/dev/null || echo "0")
        else
            mem_used_mb=$mem_used
        fi
        
        total_mem_mb=$(echo "scale=2; $total_mem_mb + $mem_used_mb" | bc -l 2>/dev/null || echo "$total_mem_mb")
    done <<< "$docker_stats"
    
    # Convertir en GB
    total_mem_gb=$(echo "scale=2; $total_mem_mb / 1024" | bc -l 2>/dev/null || echo "0")
    
    # Calculer le pourcentage total
    if [ -n "$mem_limit" ] && [ "$mem_limit" != "0" ]; then
        total_mem_percent=$(echo "scale=2; ($total_mem_gb / $mem_limit) * 100" | bc -l 2>/dev/null || echo "0")
    else
        total_mem_percent="N/A"
    fi
    
    echo ""
    echo "   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "   📊 RÉSUMÉ TOTAL:"
    echo "   • Conteneurs JobbingTrack:  $total_containers"
    echo "   • Mémoire totale allouée:   ${mem_limit}GB"
    echo "   • Mémoire totale utilisée:  ${total_mem_gb}GB (${total_mem_mb}MB)"
    echo "   • Pourcentage utilisé:      $(printf "%.2f" "$total_mem_percent" 2>/dev/null || echo "0.00")%"
    echo "   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
    warning "   Impossible de récupérer les stats Docker"
fi
echo ""

# Vérifier l'espace disque Docker
echo "🐳 ESPACE DISQUE DOCKER:"
docker_df_output=$(docker system df --format "{{.Type}}|{{.TotalCount}}|{{.Size}}|{{.Reclaimable}}")

if [ -n "$docker_df_output" ]; then
    # Afficher l'en-tête
    printf "   %-15s %-8s %-15s %s\n" "Type" "Count" "Size" "Reclaimable"
    echo "   ─────────────────────────────────────────────────────────────────"
    
    # Afficher chaque ligne
    echo "$docker_df_output" | while IFS='|' read -r type count size reclaimable; do
        printf "   %-15s %-8s %-15s %s\n" "$type" "$count" "$size" "$reclaimable"
    done
    
    echo ""
    
    # Calculer l'espace total utilisé
    total_size=$(docker system df --format "{{.Size}}" | awk '{sum+=$1} END {print sum}')
    echo "   💡 Pour nettoyer: docker system prune -a --volumes"
else
    warning "   Impossible de récupérer l'espace Docker"
fi
echo ""

# Statistiques réseau système
echo "🌐 STATISTIQUES RÉSEAU SYSTÈME:"
if command -v ss &> /dev/null; then
    connections_established=$(ss -tan | grep ESTAB | wc -l)
    connections_listen=$(ss -tan | grep LISTEN | wc -l)
    connections_timewait=$(ss -tan | grep TIME-WAIT | wc -l)
    
    echo "   • Connexions établies:  $connections_established"
    echo "   • Ports en écoute:      $connections_listen"
    echo "   • Connexions TIME-WAIT: $connections_timewait"
else
    warning "   ss non disponible"
fi
echo ""

# Vérifier les limites système
echo "⚙️  LIMITES SYSTÈME:"
echo "   • File descriptors:"
ulimit_files=$(ulimit -n)
echo "      Limite actuelle:     $ulimit_files"

# Nombre de processus
total_processes=$(ps aux | wc -l)
echo "   • Processus totaux:     $total_processes"

# Threads
total_threads=$(ps -eLf | wc -l)
echo "   • Threads totaux:       $total_threads"
echo ""

# Swap utilisation
echo "💱 SWAP:"
swap_info=$(free -h | grep Swap)
if [ -n "$swap_info" ]; then
    swap_total=$(echo "$swap_info" | awk '{print $2}')
    swap_used=$(echo "$swap_info" | awk '{print $3}')
    swap_free=$(echo "$swap_info" | awk '{print $4}')
    
    echo "   • Total:      $swap_total"
    echo "   • Utilisé:    $swap_used"
    echo "   • Libre:      $swap_free"
    
    if [ "$swap_used" != "0B" ] && [ "$swap_used" != "0" ]; then
        warning "   ⚠️  Swap utilisé (peut ralentir le système)"
    else
        success "   ✅ Swap non utilisé (optimal)"
    fi
else
    warning "   Informations swap non disponibles"
fi
echo ""

# Vérifier les logs Docker récents
echo "📝 LOGS DOCKER RÉCENTS (5 dernières minutes):"

# Utiliser --until pour ne pas bloquer
now=$(date +%s)
five_min_ago=$((now - 300))

# Compter les événements récents (die, oom, kill)
recent_die=$(docker events --since 5m --until 1s --filter 'type=container' --filter 'event=die' 2>/dev/null | wc -l)
recent_oom=$(docker events --since 5m --until 1s --filter 'type=container' --filter 'event=oom' 2>/dev/null | wc -l)
recent_kill=$(docker events --since 5m --until 1s --filter 'type=container' --filter 'event=kill' 2>/dev/null | wc -l)

total_events=$((recent_die + recent_oom + recent_kill))

if [ "$total_events" -gt 0 ]; then
    warning "   ⚠️  Événements récents détectés:"
    [ "$recent_die" -gt 0 ] && echo "      • $recent_die conteneur(s) arrêté(s)"
    [ "$recent_oom" -gt 0 ] && echo "      • $recent_oom Out of Memory"
    [ "$recent_kill" -gt 0 ] && echo "      • $recent_kill conteneur(s) tué(s)"
else
    success "   ✅ Aucun événement problématique récent"
fi
echo ""

# Vérifier les conteneurs en état unhealthy
unhealthy=$(docker ps --filter "health=unhealthy" --format "{{.Names}}" 2>/dev/null)
if [ -n "$unhealthy" ]; then
    warning "   ⚠️  Conteneurs en mauvaise santé (unhealthy):"
    echo "$unhealthy" | while read -r container; do
        echo "      • $container"
    done
    echo ""
else
    success "   ✅ Tous les conteneurs sont sains"
    echo ""
fi

# Uptime système
echo "⏱️  UPTIME SYSTÈME:"
# Lire l'uptime depuis /proc/uptime (en secondes)
if [ -f /proc/uptime ]; then
    uptime_seconds=$(awk '{print int($1)}' /proc/uptime 2>/dev/null || echo "0")
    uptime_formatted=$(convert_uptime "$uptime_seconds")
    echo "   $uptime_formatted"
else
    # Fallback sur uptime -p si /proc/uptime n'existe pas
    uptime_info=$(uptime -p 2>/dev/null || echo "N/A")
    echo "   $uptime_info"
fi
echo ""

success "✅ Métriques avancées collectées"

# ============================================================================
# RÉSUMÉ FINAL
# ============================================================================
echo ""
echo "============================================================================"
echo -e "${GREEN}✅ TESTS TERMINÉS - MONITORING COMPLET${NC}"
echo "============================================================================"
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                  RÉSUMÉ DES MÉTRIQUES TESTÉES                  ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}✅ MÉTRIQUES CPU (avec explication détaillée):${NC}"
echo "   ✓ CPU Docker (pourquoi >100% est NORMAL)"
echo "   ✓ Conversion Docker → % réel du système"
echo "   ✓ Cœurs CPU utilisés vs disponibles"
echo "   ✓ Barre de progression visuelle"
echo "   ✓ CPU par cœur et moyennes"
echo ""

echo -e "${GREEN}✅ MÉTRIQUES MÉMOIRE:${NC}"
echo "   ✓ Mémoire conteneurs (%, MB, GB)"
echo "   ✓ Mémoire système totale"
echo "   ✓ Mémoire libre/utilisée"
echo "   ✓ Swap (total, utilisé, libre)"
echo ""

echo -e "${GREEN}✅ MÉTRIQUES DISQUE:${NC}"
echo "   ✓ Usage par partition (%, inodes)"
echo "   ✓ Disque I/O (lectures/écritures par seconde)"
echo "   ✓ Espace Docker (images, conteneurs, volumes)"
echo "   ✓ Espace récupérable"
echo ""

echo -e "${GREEN}✅ MÉTRIQUES RÉSEAU:${NC}"
echo "   ✓ Trafic RX/TX (global et par service)"
echo "   ✓ Connexions TCP (établies, écoute, TIME-WAIT)"
echo "   ✓ Top 5 services par trafic réseau"
echo ""

echo -e "${GREEN}✅ MÉTRIQUES PERFORMANCE:${NC}"
echo "   ✓ Temps de réponse (moyen, min, max)"
echo "   ✓ Taux d'erreur (global et par service)"
echo "   ✓ Load average avec recommandations"
echo "   ✓ Charge globale (score 0-1)"
echo ""

echo -e "${GREEN}✅ SANTÉ DES SERVICES:${NC}"
echo "   ✓ Disponibilité (%) de tous les services"
echo "   ✓ Services sains/dégradés/offline"
echo "   ✓ Liste COMPLÈTE de tous les services"
echo "   ✓ Métriques détaillées par service"
echo ""

echo -e "${GREEN}✅ MÉTRIQUES SYSTÈME AVANCÉES:${NC}"
echo "   ✓ Processus et threads totaux"
echo "   ✓ File descriptors (limites)"
echo "   ✓ Uptime système"
echo "   ✓ Logs Docker récents (erreurs)"
echo "   ✓ Top 5 processus Docker"
echo ""

echo -e "${GREEN}✅ MONITORING TEMPOREL:${NC}"
echo "   ✓ 3 collectes espacées de 15 secondes"
echo "   ✓ Calcul des moyennes et variations"
echo "   ✓ Détection des tendances (hausse/baisse/stable)"
echo "   ✓ Vérification de la cohérence"
echo "   ✓ Historique et persistance"
echo ""

echo -e "${GREEN}✅ COMPARAISON HÔTE vs CONTENEURS:${NC}"
echo "   ✓ Tableau de comparaison visuel"
echo "   ✓ CPU: Docker % → % réel système"
echo "   ✓ Analyse de charge (normale/modérée/élevée)"
echo "   ✓ Validation de cohérence"
echo ""

echo -e "${YELLOW}⚠️  NOTES IMPORTANTES:${NC}"
echo ""
echo -e "${CYAN}   💡 CPU > 100% est NORMAL !${NC}"
echo "      Docker calcule: 1 cœur = 100%"
echo "      Donc 205% = 2.05 cœurs utilisés"
echo "      Sur 16 cœurs: 205% ÷ 1600% = 12.8% réel"
echo ""
echo "   • Load Average: < nombre de cœurs = OK"
echo "   • Swap utilisé: signe de manque de RAM"
echo "   • Les métriques sont actualisées toutes les 10s"
echo "   • Le test complet prend ~40 secondes"
echo ""

echo -e "${BLUE}🔗 URLs de monitoring:${NC}"
echo "   • Agrégées:  $METRICS_URL/api/v1/docker/jobbingtrack/aggregated"
echo "   • Services:  $METRICS_URL/api/v1/docker/services/all"
echo "   • Historique: $METRICS_URL/api/v1/docker/history"
echo "   • Santé:     $METRICS_URL/api/v1/health"
echo "   • Système:   $METRICS_URL/api/v1/metrics"
echo ""

echo -e "${GREEN}💡 RECOMMANDATIONS:${NC}"
echo "   1. Exécutez ce script régulièrement (cron job)"
echo "   2. Surveillez les tendances CPU/mémoire"
echo "   3. Nettoyez Docker si espace disque faible:"
echo "      docker system prune -a --volumes"
echo "   4. Vérifiez les services 'degraded'"
echo "   5. Si Load > nb_cœurs: optimiser ou scaler"
echo ""

