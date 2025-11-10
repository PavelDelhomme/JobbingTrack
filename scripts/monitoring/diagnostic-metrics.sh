#!/usr/bin/env bash

# ============================================================================
# Diagnostic métriques Docker vs système hôte
# ============================================================================

set -euo pipefail

export LC_ALL=C
export LANG=C

METRICS_URL="${METRICS_AGGREGATOR_URL:-http://localhost:8014}"

print_section() {
    local title="$1"
    printf '\n================================================================\n'
    printf '🔎 %s\n' "$title"
    printf '================================================================\n\n'
}

print_subtitle() {
    local subtitle="$1"
    printf '\n-- %s --\n' "$subtitle"
}

command_available() {
    command -v "$1" >/dev/null 2>&1
}

print_section "Contexte"
echo "📍 Racine projet : $(pwd)"
echo "🕒 Date actuelle  : $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "🐧 Système        : $(uname -srmo 2>/dev/null || uname -srm)"

print_section "Docker - état des conteneurs"
if command_available docker; then
    print_subtitle "docker ps --all --format"
    if ! docker ps --all --format 'table {{.Names}}\t{{.Status}}\t{{.RunningFor}}\t{{.Image}}' 2>/dev/null; then
        echo "⚠️  Impossible d'afficher docker ps --all."
    fi

    print_subtitle "docker ps (conteneurs actifs uniquement)"
    if ! docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}'; then
        echo "⚠️  Impossible d'afficher docker ps."
    fi
else
    echo "❌ Docker n'est pas disponible dans le PATH."
fi

print_section "Docker - ressources en temps réel"
if command_available docker; then
    print_subtitle "docker stats --no-stream"
    if ! docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.PIDs}}'; then
        echo "⚠️  Impossible d'afficher docker stats (aucun conteneur actif ?)."
    fi

    print_subtitle "docker system df"
    if ! docker system df; then
        echo "⚠️  Impossible d'afficher docker system df."
    fi

    print_subtitle "docker info (résumé CPU/Mémoire)"
    if ! docker info --format $'Version: {{.ServerVersion}}\nCœurs CPU: {{.NCPU}}\nMémoire: {{.MemTotal}}'; then
        echo "⚠️  Impossible d'afficher docker info."
    fi
fi

print_section "Système hôte"
if command_available top; then
    print_subtitle "top -b -n 1 | head -n 15"
    if ! top -b -n 1 | head -n 15; then
        echo "⚠️  Impossible d'afficher top."
    fi
else
    echo "⚠️  top n'est pas disponible. Essayez d'installer util-linux."
fi

if command_available uptime; then
    print_subtitle "uptime"
    uptime
fi

if command_available free; then
    print_subtitle "free -h"
    free -h
fi

if [ -f /proc/loadavg ]; then
    print_subtitle "/proc/loadavg"
    cat /proc/loadavg
fi

print_section "Agrégateur de métriques JobbingTrack"
if ! command_available curl; then
    echo "❌ curl est requis pour interroger l'API de métriques."
else
    if ! curl --silent --fail --max-time 5 "$METRICS_URL/api/v1/health" >/tmp/jt_metrics_health.json 2>/tmp/jt_metrics_health.err; then
        echo "⚠️  Service de métriques inaccessible sur $METRICS_URL"
        if [ -s /tmp/jt_metrics_health.err ]; then
            echo "Détails :"
            cat /tmp/jt_metrics_health.err
        fi
    else
        print_subtitle "Health"
        if command_available jq; then
            jq '.' /tmp/jt_metrics_health.json
        else
            cat /tmp/jt_metrics_health.json
        fi
    fi

    if curl --silent --fail --max-time 5 "$METRICS_URL/api/v1/docker/jobbingtrack/aggregated" >/tmp/jt_metrics_aggregated.json 2>/tmp/jt_metrics_aggregated.err; then
        print_subtitle "Aggregated metrics"
        if command_available jq; then
            jq '{cpu_percent, total_cpus, memory_percent, memory_usage_mb, containers_count, load_average, network: {rx_mb: .network.total_rx_mb, tx_mb: .network.total_tx_mb}}' /tmp/jt_metrics_aggregated.json
        else
            cat /tmp/jt_metrics_aggregated.json
        fi
    else
        echo "⚠️  Impossible de récupérer /docker/jobbingtrack/aggregated."
        if [ -s /tmp/jt_metrics_aggregated.err ]; then
            echo "Détails :"
            cat /tmp/jt_metrics_aggregated.err
        fi
    fi
fi

print_section "Résumé rapide"
if command_available docker && command_available curl && command_available jq && [ -f /tmp/jt_metrics_aggregated.json ]; then
    docker_cpu=$(jq -r '.cpu_percent // empty' /tmp/jt_metrics_aggregated.json)
    docker_cpus=$(jq -r '.total_cpus // empty' /tmp/jt_metrics_aggregated.json)
    host_cpu_real=""
    if [ -n "${docker_cpu:-}" ] && [ -n "${docker_cpus:-}" ]; then
        host_cpu_real=$(python3 - <<EOF 2>/dev/null || true
cpu=${docker_cpu}
cpus=${docker_cpus}
try:
    cpu=float(cpu)
    cpus=float(cpus)
    print(f"CPU réel estimé : {cpu/(cpus*100)*100:.2f}% ({cpu/100:.2f} cœur(s) sur {cpus})")
except Exception:
    pass
EOF
)
    fi

    docker_mem=$(jq -r '.memory_percent // empty' /tmp/jt_metrics_aggregated.json)
    docker_mem_mb=$(jq -r '.memory_usage_mb // empty' /tmp/jt_metrics_aggregated.json)
    containers_count=$(jq -r '.containers_count // empty' /tmp/jt_metrics_aggregated.json)

    echo "• CPU Docker agrégé  : ${docker_cpu:-N/A}"
    [ -n "$host_cpu_real" ] && echo "  → $host_cpu_real"
    echo "• Mémoire conteneurs : ${docker_mem:-N/A}% (${docker_mem_mb:-N/A} MB)"
    echo "• Conteneurs suivis   : ${containers_count:-N/A}"

    if command_available docker; then
        active=$(docker ps --format '{{.Names}}' | wc -l | tr -d ' ')
        total=$(docker ps -a --format '{{.Names}}' | wc -l | tr -d ' ')
        echo "• Conteneurs actifs   : $active / $total"
        if docker ps --filter "name=dashboard-service" --format '{{.Names}}' | grep -q .; then
            state=$(docker ps --filter "name=dashboard-service" --format '{{.Status}}')
            echo "• dashboard-service   : $state"
        else
            if docker ps -a --filter "name=dashboard-service" --format '{{.Status}}' | grep -q .; then
                state=$(docker ps -a --filter "name=dashboard-service" --format '{{.Status}}')
                echo "• dashboard-service   : inactif ($state)"
            else
                echo "• dashboard-service   : conteneur introuvable"
            fi
        fi
    fi
else
    echo "ℹ️  Résumé non disponible (prérequis: docker, curl, jq)."
fi

print_section "Nettoyage"
rm -f /tmp/jt_metrics_health.json /tmp/jt_metrics_health.err /tmp/jt_metrics_aggregated.json /tmp/jt_metrics_aggregated.err
echo "✅ Diagnostic terminé."

