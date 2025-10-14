#!/bin/bash

# ============================================================================
# Script de Surveillance des Ressources - JobbingTrack
# ============================================================================
# Surveille l'utilisation des ressources système et Docker

set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
INTERVAL=${1:-30}
LOG_FILE="/tmp/jobbingtrack-resource-monitor.log"

# Fonction de logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Obtenir l'utilisation mémoire
get_memory_usage() {
    free | awk 'NR==2{printf "%.1f", $3*100/$2 }'
}

# Obtenir l'utilisation CPU
get_cpu_usage() {
    top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}'
}

# Obtenir l'utilisation disque
get_disk_usage() {
    df . | awk 'NR==2 {print $5}' | sed 's/%//'
}

# Obtenir les statistiques Docker
get_docker_stats() {
    if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
        echo "Conteneurs actifs: $(docker ps -q | wc -l)"
        echo "Images: $(docker images -q | wc -l)"
        echo "Volumes: $(docker volume ls -q | wc -l)"
        echo "Réseaux: $(docker network ls -q | wc -l)"
    else
        echo "Docker: Non disponible"
    fi
}

# Analyser les tendances
analyze_trends() {
    local cpu_threshold=80
    local mem_threshold=85
    local disk_threshold=90

    local cpu_usage=$(get_cpu_usage)
    local mem_usage=$(get_memory_usage)
    local disk_usage=$(get_disk_usage)

    local alerts=()

    if (( $(echo "$cpu_usage > $cpu_threshold" | bc -l) )); then
        alerts+=("CPU élevé: ${cpu_usage}% (> ${cpu_threshold}%)")
    fi

    if (( $(echo "$mem_usage > $mem_threshold" | bc -l) )); then
        alerts+=("Mémoire élevée: ${mem_usage}% (> ${mem_threshold}%)")
    fi

    if [ "$disk_usage" -gt "$disk_threshold" ]; then
        alerts+=("Disque critique: ${disk_usage}% (> ${disk_threshold}%)")
    fi

    if [ ${#alerts[@]} -gt 0 ]; then
        echo "🚨 ALERTES:"
        printf '   %s\n' "${alerts[@]}"
        return 1
    else
        echo "✅ Tous les indicateurs OK"
        return 0
    fi
}

# Afficher un rapport détaillé
show_detailed_report() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    echo ""
    echo "📊 RAPPORT DÉTAILLÉ DES RESSOURCES"
    echo "=================================="
    echo "Timestamp: $timestamp"
    echo ""

    # Ressources système
    echo "🖥️ RESSOURCES SYSTÈME:"
    echo "  CPU: $(get_cpu_usage)%"
    echo "  Mémoire: $(get_memory_usage)% ($(free -h | awk 'NR==2{print $3 "/" $2}'))"
    echo "  Disque: $(get_disk_usage)% ($(df -h . | awk 'NR==2{print $3 "/" $2}'))"
    echo ""

    # Ressources Docker
    echo "🐳 RESSOURCES DOCKER:"
    get_docker_stats | sed 's/^/  /'
    echo ""

    # Top processus
    echo "🔥 TOP PROCESSUS:"
    ps aux --sort=-%cpu | head -6 | awk 'NR>1{print "  " $1 ": " $3 "% CPU, " $4 "% mémoire"}'
    echo ""

    # Top conteneurs Docker
    if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
        echo "📦 TOP CONTENEURS DOCKER:"
        docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | head -6 | awk 'NR>1{print "  " $1 ": " $2 " CPU, " $3 " mémoire"}'
        echo ""
    fi

    # Analyse des tendances
    echo "📈 ANALYSE:"
    analyze_trends | sed 's/^/  /'
}

# Fonction de surveillance continue
monitor() {
    log "🚀 Démarrage de la surveillance des ressources"
    log "Intervalle: $INTERVAL secondes"

    while true; do
        show_detailed_report >> "$LOG_FILE"

        # Vérifier si des seuils sont dépassés
        if ! analyze_trends >/dev/null 2>&1; then
            log "🚨 Seuils dépassés détectés"
        fi

        sleep $INTERVAL
    done
}

# Fonction d'aide
show_help() {
    echo -e "${BLUE}📊 Surveillance des Ressources - JobbingTrack${NC}"
    echo "==========================================="
    echo ""
    echo "Usage: $0 [INTERVAL_SECONDS] [COMMAND]"
    echo ""
    echo "Modes:"
    echo "  $0 [INTERVAL]         # Surveillance continue"
    echo "  $0 --status           # État actuel rapide"
    echo "  $0 --report           # Rapport détaillé unique"
    echo "  $0 --help             # Afficher cette aide"
    echo ""
    echo "Arguments:"
    echo "  INTERVAL_SECONDS      Intervalle de surveillance (défaut: 30s)"
    echo ""
    echo "Exemples:"
    echo "  $0                    # Surveillance continue 30s"
    echo "  $0 60                 # Surveillance continue 60s"
    echo "  $0 --status           # État rapide"
    echo "  $0 --report           # Rapport détaillé"
    echo ""
    echo "Seuils d'alerte:"
    echo "  CPU: > 80%"
    echo "  Mémoire: > 85%"
    echo "  Disque: > 90%"
    echo ""
    echo "Log: $LOG_FILE"
}

# Gestion des arguments
case "${1:-}" in
    "--help"|"-h")
        show_help
        exit 0
        ;;
    "--status")
        echo "🔍 État rapide des ressources:"
        echo "  CPU: $(get_cpu_usage)%"
        echo "  Mémoire: $(get_memory_usage)%"
        echo "  Disque: $(get_disk_usage)%"
        echo "  Conteneurs: $(docker ps -q 2>/dev/null | wc -l || echo 'N/A')"
        analyze_trends >/dev/null && echo "✅ Tous les indicateurs OK" || echo "⚠️ Alertes détectées"
        exit 0
        ;;
    "--report")
        show_detailed_report
        exit 0
        ;;
    "")
        # Vérifier les prérequis
        if ! command -v bc >/dev/null 2>&1; then
            echo "❌ bc (basic calculator) est requis"
            exit 1
        fi
        monitor
        ;;
    *)
        # Vérifier si c'est un nombre
        if [[ "$1" =~ ^[0-9]+$ ]] && [ "$1" -gt 0 ]; then
            monitor
        else
            echo "❌ Intervalle invalide: $1"
            echo "Utilisez un nombre de secondes positif"
            exit 1
        fi
        ;;
esac
