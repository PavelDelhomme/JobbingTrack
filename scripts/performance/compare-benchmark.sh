#!/bin/bash

# Script pour comparer les résultats des benchmarks before/after
# Usage: ./scripts/performance/compare-benchmark.sh

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

RESULTS_DIR="tests/performance-benchmark"

echo "╔════════════════════════════════════════════════════════╗"
echo "║     📊 COMPARAISON BENCHMARK - JobbingTrack          ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Trouver les fichiers consolidés les plus récents
BEFORE_FILE=$(ls -t "$RESULTS_DIR"/before_consolidated_*.json 2>/dev/null | head -1)
AFTER_FILE=$(ls -t "$RESULTS_DIR"/after_consolidated_*.json 2>/dev/null | head -1)

if [ -z "$BEFORE_FILE" ] || [ -z "$AFTER_FILE" ]; then
    echo "❌ Fichiers de benchmark non trouvés !"
    echo "   Avant: ${BEFORE_FILE:-NON TROUVÉ}"
    echo "   Après: ${AFTER_FILE:-NON TROUVÉ}"
    echo ""
    echo "💡 Lancez d'abord:"
    echo "   ./scripts/performance/performance-benchmark.sh before"
    echo "   ./scripts/performance/performance-benchmark.sh after"
    exit 1
fi

echo "📁 Fichiers analysés:"
echo "   Avant: $(basename $BEFORE_FILE)"
echo "   Après: $(basename $AFTER_FILE)"
echo ""

# Utiliser Python ou jq pour parser JSON, sinon utiliser grep/awk
if command -v python3 &> /dev/null; then
    python3 << 'PYTHON_SCRIPT'
import json
import sys
import os

results_dir = "tests/performance-benchmark"

# Trouver les fichiers
before_files = sorted([f for f in os.listdir(results_dir) if f.startswith("before_consolidated_")], reverse=True)
after_files = sorted([f for f in os.listdir(results_dir) if f.startswith("after_consolidated_")], reverse=True)

if not before_files or not after_files:
    print("❌ Fichiers non trouvés")
    sys.exit(1)

before_path = os.path.join(results_dir, before_files[0])
after_path = os.path.join(results_dir, after_files[0])

with open(before_path) as f:
    before_data = json.load(f)

with open(after_path) as f:
    after_data = json.load(f)

# Créer un dictionnaire pour faciliter la comparaison
before_dict = {}
for item in before_data.get("pages", []):
    key = item.get("page") or item.get("endpoint")
    before_dict[key] = item

after_dict = {}
for item in after_data.get("pages", []):
    key = item.get("page") or item.get("endpoint")
    after_dict[key] = item

print("╔════════════════════════════════════════════════════════╗")
print("║           📊 RÉSULTATS DE COMPARAISON                 ║")
print("╚════════════════════════════════════════════════════════╝")
print("")

# Comparer les temps de réponse
print("⏱️  TEMPS DE RÉPONSE (secondes):")
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print(f"{'Page/Endpoint':<30} {'Avant':<12} {'Après':<12} {'Diff':<12} {'Amélioration':<15}")
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

all_keys = set(before_dict.keys()) | set(after_dict.keys())
for key in sorted(all_keys):
    before_item = before_dict.get(key)
    after_item = after_dict.get(key)
    
    if not before_item or not after_item:
        continue
    
    before_time = before_item.get("time_total", 0)
    after_time = after_item.get("time_total", 0)
    
    if before_time == 0:
        continue
    
    diff = after_time - before_time
    percent = (diff / before_time) * 100 if before_time > 0 else 0
    
    improvement = ""
    if percent < -5:
        improvement = f"✅ {abs(percent):.1f}% plus rapide"
    elif percent > 5:
        improvement = f"❌ {percent:.1f}% plus lent"
    else:
        improvement = "➡️  Similaire"
    
    print(f"{key:<30} {before_time:<12.6f} {after_time:<12.6f} {diff:+.6f}     {improvement}")

print("")
print("📊 STATISTIQUES GLOBALES:")
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

# Calculer les moyennes
before_times = [item.get("time_total", 0) for item in before_dict.values() if item.get("time_total", 0) > 0]
after_times = [item.get("time_total", 0) for item in after_dict.values() if item.get("time_total", 0) > 0]

if before_times and after_times:
    before_avg = sum(before_times) / len(before_times)
    after_avg = sum(after_times) / len(after_times)
    avg_improvement = ((before_avg - after_avg) / before_avg) * 100 if before_avg > 0 else 0
    
    print(f"Moyenne avant:     {before_avg:.6f}s")
    print(f"Moyenne après:     {after_avg:.6f}s")
    print(f"Amélioration:      {avg_improvement:+.2f}%")
    
    if avg_improvement > 5:
        print("✅ Amélioration significative !")
    elif avg_improvement < -5:
        print("⚠️  Dégradation détectée")
    else:
        print("➡️  Performance similaire")

print("")
print("📈 ENDPOINTS API (amélioration):")
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

api_improvements = []
for key in sorted(all_keys):
    if "api_" in key.lower() or key in ["applications", "companies", "users", "contacts", "interviews", "statistics"]:
        before_item = before_dict.get(key)
        after_item = after_dict.get(key)
        
        if not before_item or not after_item:
            continue
        
        before_time = before_item.get("time_total", 0)
        after_time = after_item.get("time_total", 0)
        
        if before_time == 0:
            continue
        
        improvement = ((before_time - after_time) / before_time) * 100 if before_time > 0 else 0
        api_improvements.append((key, improvement, before_time, after_time))

api_improvements.sort(key=lambda x: x[1], reverse=True)

for key, improvement, before_time, after_time in api_improvements:
    if improvement > 0:
        print(f"✅ {key:<30} {improvement:>6.1f}% plus rapide ({before_time:.6f}s → {after_time:.6f}s)")
    elif improvement < 0:
        print(f"❌ {key:<30} {abs(improvement):>6.1f}% plus lent ({before_time:.6f}s → {after_time:.6f}s)")
    else:
        print(f"➡️  {key:<30} Similaire ({before_time:.6f}s → {after_time:.6f}s)")

PYTHON_SCRIPT

elif command -v jq &> /dev/null; then
    echo "📊 Analyse avec jq..."
    # Version simplifiée avec jq
    echo "Temps de réponse (avant → après):"
    echo ""
    jq -r '.pages[] | "\(.page // .endpoint): \(.time_total)s"' "$BEFORE_FILE" | while read line; do
        echo "  $line"
    done
else
    echo "⚠️  Python3 ou jq requis pour l'analyse détaillée"
    echo "   Installation: sudo apt install python3 jq"
    echo ""
    echo "📊 Comparaison basique:"
    echo ""
    echo "Avant:"
    grep -o '"time_total": [0-9.]*' "$BEFORE_FILE" | head -5
    echo ""
    echo "Après:"
    grep -o '"time_total": [0-9.]*' "$AFTER_FILE" | head -5
fi

echo ""
echo "✅ Comparaison terminée !"

