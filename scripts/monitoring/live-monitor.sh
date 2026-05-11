#!/usr/bin/env bash

set -euo pipefail

PROJECT_FILTER="${PROJECT_FILTER:-jobbingtrack}"
INTERVAL="${INTERVAL:-2}"
ONCE="${ONCE:-0}"
CLEAR_SCREEN="${CLEAR_SCREEN:-0}"
CACHE_FILE="${CACHE_FILE:-/tmp/jobbingtrack-monitor-stats.cache}"
PREV_LINES=0

if ! command -v docker >/dev/null 2>&1; then
  echo "❌ docker introuvable"
  exit 1
fi

if ! command -v python >/dev/null 2>&1 && ! command -v python3 >/dev/null 2>&1; then
  echo "❌ python/python3 introuvable"
  exit 1
fi

PYTHON_BIN="$(command -v python || command -v python3)"

while true; do
  if [ "${ONCE}" != "1" ] && [ "${CLEAR_SCREEN}" = "1" ]; then
    clear
  fi

  JSON_LINES="$(
    docker ps -a \
      --filter "name=${PROJECT_FILTER}" \
      --format '{{json .}}'
  )"

  if [ -z "${JSON_LINES}" ]; then
    echo "Aucun conteneur trouvé avec le filtre '${PROJECT_FILTER}'."
    exit 0
  fi

  RUNNING_NAMES="$(
    docker ps \
      --filter "name=${PROJECT_FILTER}" \
      --format '{{.Names}}'
  )"

  STATS_JSON=""
  if [ -n "${RUNNING_NAMES}" ]; then
    # shellcheck disable=SC2086
    STATS_JSON="$(docker stats --no-stream --format '{{json .}}' $(echo "${RUNNING_NAMES}" | tr '\n' ' ') 2>/dev/null || true)"
  fi

  # Évite les "trous" d'affichage: on réutilise le dernier snapshot valide.
  if [ -n "${STATS_JSON}" ]; then
    printf "%s\n" "${STATS_JSON}" > "${CACHE_FILE}"
  elif [ -f "${CACHE_FILE}" ]; then
    STATS_JSON="$(cat "${CACHE_FILE}")"
  fi

  export JSON_LINES RUNNING_NAMES STATS_JSON

  NOW="$(date '+%Y-%m-%d %H:%M:%S')"
  HOST_CPU_CORES="$(nproc 2>/dev/null || getconf _NPROCESSORS_ONLN 2>/dev/null || echo 1)"
  LOAD_AVG_1="$(awk '{print $1}' /proc/loadavg 2>/dev/null || echo 0)"
  export NOW PROJECT_FILTER INTERVAL HOST_CPU_CORES LOAD_AVG_1
  OUTPUT="$(
    "${PYTHON_BIN}" - <<'PY'
import json
import os
import re
from collections import defaultdict

UNIT_FACTORS = {
    "b": 1,
    "kb": 1000,
    "kib": 1024,
    "mb": 1000 ** 2,
    "mib": 1024 ** 2,
    "gb": 1000 ** 3,
    "gib": 1024 ** 3,
    "tb": 1000 ** 4,
    "tib": 1024 ** 4,
}

def parse_human_size_to_bytes(text):
    if not text or text == "-":
        return 0
    t = text.strip().lower()
    m = re.match(r"^\s*([0-9]*\.?[0-9]+)\s*([kmgt]?i?b)\s*$", t)
    if not m:
        return 0
    val = float(m.group(1))
    unit = m.group(2)
    factor = UNIT_FACTORS.get(unit, 1)
    return int(val * factor)

def fmt_bytes_binary(value):
    v = float(max(0, value))
    units = ["B", "KiB", "MiB", "GiB", "TiB"]
    for u in units:
        if v < 1024 or u == units[-1]:
            if u == "B":
                return f"{int(v)}{u}"
            return f"{v:.1f}{u}"
        v /= 1024.0
    return f"{v:.1f}TiB"

def color_for_percent(pct):
    try:
        v = float(pct)
    except Exception:
        return ""
    if v >= 90:
        return "\033[1;31m"   # rouge
    if v >= 75:
        return "\033[1;33m"   # jaune
    return "\033[0;32m"       # vert

def colorize_percent_text(text, pct):
    color = color_for_percent(pct)
    reset = "\033[0m"
    if not color:
        return text
    return f"{color}{text}{reset}"

def parse_ports(port_text):
    if not port_text:
        return "-"
    parts = [p.strip() for p in port_text.split(",")]
    mapped = []
    for p in parts:
        m = re.search(r"(?:(?P<host>[\d\.\:]+)->)?(?P<container>\d+/(?:tcp|udp))", p)
        if m:
            host = m.group("host") or "-"
            container = m.group("container")
            mapped.append(f"{host} -> {container}")
        else:
            mapped.append(p)
    return "\n".join(mapped) if mapped else "-"

def status_flag(status):
    s = status.lower()
    if s.startswith("up"):
        return "ACTIF"
    return "INACTIF"

containers = []
for line in os.environ.get("JSON_LINES", "").splitlines():
    line = line.strip()
    if not line:
        continue
    try:
        containers.append(json.loads(line))
    except json.JSONDecodeError:
        continue

stats = defaultdict(lambda: {"cpu": "-", "mem_usage": "-", "mem_pct": "-", "net_io": "-", "block_io": "-"})
for line in os.environ.get("STATS_JSON", "").splitlines():
    line = line.strip()
    if not line:
        continue
    try:
        item = json.loads(line)
    except json.JSONDecodeError:
        continue
    name = item.get("Name", "")
    if not name:
        continue
    stats[name] = {
        "cpu": item.get("CPUPerc", "-"),
        "mem_usage": item.get("MemUsage", "-"),
        "mem_pct": item.get("MemPerc", "-"),
        "net_io": item.get("NetIO", "-"),
        "block_io": item.get("BlockIO", "-"),
    }

headers = [
    "CONTAINER",
    "ETAT",
    "STATUS DOCKER",
    "PORTS",
    "CPU%",
    "MEM USAGE",
    "MEM%",
    "NET I/O CUMULÉ",
]

rows = []
total_cpu = 0.0
total_mem_used_b = 0
total_mem_limit_b = 0
total_rx_b = 0
total_tx_b = 0
for c in sorted(containers, key=lambda x: x.get("Names", "")):
    name = c.get("Names", "-")
    docker_status = c.get("Status", "-")
    cpu_txt = stats[name]["cpu"]
    mem_usage_txt = stats[name]["mem_usage"]
    net_io_txt = stats[name]["net_io"]

    cpu_num = 0.0
    m_cpu = re.match(r"^\s*([0-9]*\.?[0-9]+)%\s*$", str(cpu_txt))
    if m_cpu:
        cpu_num = float(m_cpu.group(1))
    total_cpu += cpu_num

    # MemUsage format: "used / limit"
    mem_used_b = 0
    mem_limit_b = 0
    if "/" in str(mem_usage_txt):
        left, right = [x.strip() for x in str(mem_usage_txt).split("/", 1)]
        mem_used_b = parse_human_size_to_bytes(left)
        mem_limit_b = parse_human_size_to_bytes(right)
    total_mem_used_b += mem_used_b
    total_mem_limit_b += mem_limit_b

    # Net I/O format: "rx / tx"
    rx_b = 0
    tx_b = 0
    if "/" in str(net_io_txt):
        left, right = [x.strip() for x in str(net_io_txt).split("/", 1)]
        rx_b = parse_human_size_to_bytes(left)
        tx_b = parse_human_size_to_bytes(right)
    total_rx_b += rx_b
    total_tx_b += tx_b

    row = [
        name,
        status_flag(docker_status),
        docker_status,
        parse_ports(c.get("Ports", "")),
        cpu_txt,
        mem_usage_txt,
        stats[name]["mem_pct"],
        net_io_txt,
    ]
    rows.append(row)

total_mem_pct = 0.0
# Les limites mémoire Docker sont souvent répétées (une limite par conteneur = RAM hôte),
# donc on prend la limite max (proche de la RAM machine), pas la somme.
host_mem_limit_b = max(
    [parse_human_size_to_bytes(stats[c.get("Names", "-")]["mem_usage"].split("/", 1)[1].strip())
     for c in containers
     if c.get("Names", "-") in stats and "/" in str(stats[c.get("Names", "-")]["mem_usage"])]
    or [0]
)
if host_mem_limit_b > 0:
    total_mem_pct = (total_mem_used_b / host_mem_limit_b) * 100.0

host_cpu_cores = float(os.environ.get("HOST_CPU_CORES", "1") or "1")
if host_cpu_cores <= 0:
    host_cpu_cores = 1.0
cpu_host_pct = total_cpu / host_cpu_cores
active = sum(1 for r in rows if r[1] == "ACTIF")
inactive = max(0, len(containers) - active)
load_avg_1 = float(os.environ.get("LOAD_AVG_1", "0") or "0")

# Estimation CPU système depuis la charge: load / cores (approx)
cpu_system_pct = min(100.0, max(0.0, (load_avg_1 / host_cpu_cores) * 100.0))
mem_system_pct = total_mem_pct
mem_project_pct = total_mem_pct

total_row = [
    "TOTAL",
    f"{active}/{len(containers)} ACTIF",
    f"{active} up | {inactive} down",
    "-",
    f"{colorize_percent_text(f'{total_cpu:.2f}% (projet)', total_cpu)}\n{colorize_percent_text(f'{cpu_host_pct:.2f}% (système)', cpu_host_pct)}",
    f"{fmt_bytes_binary(total_mem_used_b)} (projet)\n{fmt_bytes_binary(host_mem_limit_b)} (système)",
    f"{colorize_percent_text(f'{mem_project_pct:.2f}% (projet)', mem_project_pct)}\n{colorize_percent_text(f'{mem_system_pct:.2f}% (système)', mem_system_pct)}",
    f"{fmt_bytes_binary(total_rx_b)} / {fmt_bytes_binary(total_tx_b)}",
]
rows.append(total_row)

widths = [len(h) for h in headers]
for r in rows:
    for i, col in enumerate(r):
        parts = str(col).splitlines() or [""]
        widths[i] = max(widths[i], max(len(p) for p in parts))

def fmt_row(cols):
    cell_lines = [str(c).splitlines() or [""] for c in cols]
    row_h = max(len(lines) for lines in cell_lines)
    out_lines = []
    for li in range(row_h):
        rendered = []
        for i, lines in enumerate(cell_lines):
            txt = lines[li] if li < len(lines) else ""
            rendered.append(txt.ljust(widths[i]))
        out_lines.append(" | ".join(rendered))
    return "\n".join(out_lines)

now = os.environ.get("NOW", "")
project_filter = os.environ.get("PROJECT_FILTER", "jobbingtrack")
interval = os.environ.get("INTERVAL", "2")

print(f"📊 JobbingTrack Monitor - {now}")
print(f"   Filtre: {project_filter} | Refresh: {interval}s | Ctrl+C pour quitter")
print("")
print("ÉTAT SYSTÈME")
line1 = (
    f"  Charge système: {load_avg_1:.2f}  |  "
    f"CPU système: {colorize_percent_text(f'{cpu_host_pct:.2f}%', cpu_host_pct)}  |  "
    f"Mémoire système: {colorize_percent_text(f'{mem_system_pct:.2f}%', mem_system_pct)}  |  "
    f"Conteneurs actifs: {active}/{len(containers)}"
)
line2 = (
    f"  CPU projet: {colorize_percent_text(f'{total_cpu:.2f}%', total_cpu)}  |  "
    f"Mémoire projet: {colorize_percent_text(f'{mem_project_pct:.2f}%', mem_project_pct)}  |  "
    f"Mémoire projet utilisée: {fmt_bytes_binary(total_mem_used_b)}"
)
print(line1)
print(line2)
print("")
print(fmt_row(headers))
print("-+-".join("-" * w for w in widths))
for r in rows:
    print(fmt_row(r))
print("")
print(f"Résumé: total={len(containers)} | actifs={active} | inactifs={inactive}")
PY
  )"

  if [ "${CLEAR_SCREEN}" != "1" ] && [ "${ONCE}" != "1" ] && [ "${PREV_LINES}" -gt 0 ]; then
    printf "\033[%sA" "${PREV_LINES}"
    printf "\033[J"
  fi

  printf "%s\n" "${OUTPUT}"
  PREV_LINES="$(printf "%s\n" "${OUTPUT}" | wc -l | tr -d ' ')"

  if [ "${ONCE}" = "1" ]; then
    exit 0
  fi

  sleep "${INTERVAL}"
done
