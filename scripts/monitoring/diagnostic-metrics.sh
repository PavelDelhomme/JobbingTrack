#!/usr/bin/env bash

# ============================================================================
# Diagnostic métriques Docker vs système hôte
# ============================================================================

set -euo pipefail

export LC_ALL=C
export LANG=C

METRICS_URL="${METRICS_AGGREGATOR_URL:-http://localhost:8014}"
SAMPLES="${SAMPLE:-${SAMPLES:-36}}"
SAMPLE_INTERVAL="${SAMPLE_INTERVAL:-${SAMPLE_INTERNAL:-5}}"
OUTPUT_DIR="${OUTPUT_DIR:-tmp/diagnostic-metrics}"

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

# Monitoring temporel optionnel
if command_available curl && command_available jq && command_available python3 && [ "$SAMPLES" -gt 1 ]; then
    print_section "Monitoring temporel - ${SAMPLES} échantillons (intervalle ${SAMPLE_INTERVAL}s)"
    tmp_samples="$(mktemp)"
    mkdir -p "$OUTPUT_DIR"
    trace_timestamp="$(date +%Y%m%d-%H%M%S)"
    output_trace_file="${OUTPUT_DIR}/diagnostic-metrics_${trace_timestamp}.json"

    for index in $(seq 1 "$SAMPLES"); do
        timestamp="$(date '+%H:%M:%S')"
        raw_sample="$(curl -s --max-time 5 "$METRICS_URL/api/v1/docker/jobbingtrack/aggregated" 2>/dev/null || true)"
        metrics_compact=""
        if [ -n "$raw_sample" ]; then
            metrics_compact="$(echo "$raw_sample" | jq -c '.' 2>/dev/null || true)"
        fi
        if [ -z "$metrics_compact" ] || [ "$metrics_compact" = "null" ]; then
            echo "⚠️  Échantillon $index/$SAMPLES (${timestamp}) : impossible de récupérer les données."
        else
            printf '{"collected_at":"%s","metrics":%s}\n' "$timestamp" "$metrics_compact" >> "$tmp_samples"
            cpu_sample="$(echo "$metrics_compact" | jq -r '.cpu_percent // 0')"
            mem_sample="$(echo "$metrics_compact" | jq -r '.memory_percent // 0')"
            load_sample="$(echo "$metrics_compact" | jq -r '.load_average // 0')"
            containers_sample="$(echo "$metrics_compact" | jq -r '.containers_count // 0')"
            printf "   📊 %02d/%02d %s → CPU %s%% | Mémoire %s%% | Load %s | Conteneurs %s\n" \
                "$index" "$SAMPLES" "$timestamp" "$cpu_sample" "$mem_sample" "$load_sample" "$containers_sample"
        fi

        if [ "$index" -lt "$SAMPLES" ]; then
            sleep "$SAMPLE_INTERVAL"
        fi
    done

    if [ -s "$tmp_samples" ]; then
        TMP_SAMPLES_PATH="$tmp_samples" OUTPUT_JSON_PATH="$output_trace_file" METRICS_URL_ENV="$METRICS_URL" python3 <<'PYTHON_SUMMARY'
import json, os, statistics
from datetime import datetime, timezone

tmp_path = os.environ.get("TMP_SAMPLES_PATH")
with open(tmp_path, "r", encoding="utf-8") as fh:
    raw = fh.readlines()
records = [json.loads(line) for line in raw if line.strip()]
if not records:
    raise SystemExit(0)

def collect(path, default=0.0):
    values = []
    for record in records:
        value = record.get("metrics", {})
        for key in path:
            if isinstance(value, dict):
                value = value.get(key)
            else:
                value = None
                break
        if value is None:
            values.append(default)
        else:
            try:
                values.append(float(value))
            except (TypeError, ValueError):
                values.append(default)
    return values

cpu_values = collect(["cpu_percent"])
mem_values = collect(["memory_percent"])
load_values = collect(["load_average"])
container_values = [record.get("metrics", {}).get("containers_count", 0) for record in records]
response_values = collect(["response_time", "average_ms"], default=0)

def describe(name, values, unit=""):
    if not values:
        return
    try:
        avg = statistics.fmean(values)
    except statistics.StatisticsError:
        avg = values[0]
    minimum = min(values)
    maximum = max(values)
    print(f"   • {name:<20}: moy {avg:.2f}{unit} | min {minimum:.2f}{unit} | max {maximum:.2f}{unit}")

print("\n📈 Synthèse temporelle:")
describe("CPU (%)", cpu_values, "%")
describe("Mémoire (%)", mem_values, "%")
describe("Load", load_values, "")
if container_values:
    try:
        avg_cont = statistics.fmean(container_values)
    except statistics.StatisticsError:
        avg_cont = container_values[0]
    print(f"   • Conteneurs suivis   : moy {avg_cont:.0f} / échantillon")
if any(response_values):
    describe("Temps réponse (ms)", response_values, " ms")

print("\n   Évolution CPU ↗↘:")
cpu_trend = (cpu_values[-1] - cpu_values[0]) if cpu_values else 0
if abs(cpu_trend) < 5:
    print(f"   • CPU stable (Δ {cpu_trend:.2f}%)")
else:
    direction = "hausse" if cpu_trend > 0 else "baisse"
    print(f"   • CPU en {direction} (Δ {cpu_trend:.2f}%)")

mem_trend = (mem_values[-1] - mem_values[0]) if mem_values else 0
if abs(mem_trend) < 5:
    print(f"   • Mémoire stable (Δ {mem_trend:.2f}%)")
else:
    direction = "hausse" if mem_trend > 0 else "baisse"
    print(f"   • Mémoire en {direction} (Δ {mem_trend:.2f}%)")

def calc_stats(values):
    if not values:
        return None
    try:
        average = statistics.fmean(values)
    except statistics.StatisticsError:
        average = values[0]
    return {
        "average": average,
        "min": min(values),
        "max": max(values)
    }

output_path = os.environ.get("OUTPUT_JSON_PATH")
if output_path:
    summary = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "metricsUrl": os.environ.get("METRICS_URL_ENV"),
        "sampleCount": len(records),
        "startTimestamp": records[0].get("collected_at"),
        "endTimestamp": records[-1].get("collected_at"),
        "stats": {
            "cpu_percent": calc_stats(cpu_values),
            "memory_percent": calc_stats(mem_values),
            "load_average": calc_stats(load_values),
            "containers_count": calc_stats(container_values),
            "response_time_ms": calc_stats(response_values),
            "cpu_trend": cpu_trend,
            "memory_trend": mem_trend
        },
        "samples": records
    }
    with open(output_path, "w", encoding="utf-8") as fh:
        json.dump(summary, fh, indent=2)
    print(f"\n🗂️  Traces enregistrées: {output_path}")
PYTHON_SUMMARY
    else
        echo "⚠️  Impossible de calculer la synthèse temporelle (aucun échantillon valide)."
    fi

    rm -f "$tmp_samples"
else
    if [ "$SAMPLES" -gt 1 ]; then
        echo "⚠️  Monitoring temporel indisponible (prérequis: curl, jq, python3)."
    fi
fi

print_section "Nettoyage"
rm -f /tmp/jt_metrics_health.json /tmp/jt_metrics_health.err /tmp/jt_metrics_aggregated.json /tmp/jt_metrics_aggregated.err
echo "✅ Diagnostic terminé."

