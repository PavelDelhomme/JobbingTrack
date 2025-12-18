#!/bin/bash

# Script pour comparer les résultats complets des benchmarks backoffice
# Usage: ./scripts/compare-all-backoffice.sh

set -e

RESULTS_DIR="tests/performance-benchmark"

echo "╔════════════════════════════════════════════════════════╗"
echo "║  📊 COMPARAISON COMPLÈTE BACKOFFICE - JobbingTrack   ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Trouver les fichiers consolidés les plus récents
BEFORE_FILE=$(ls -t "$RESULTS_DIR"/before_all_backoffice_*.json 2>/dev/null | head -1)
AFTER_FILE=$(ls -t "$RESULTS_DIR"/after_all_backoffice_*.json 2>/dev/null | head -1)

if [ -z "$BEFORE_FILE" ] || [ -z "$AFTER_FILE" ]; then
    echo "❌ Fichiers de benchmark non trouvés !"
    echo "   Avant: ${BEFORE_FILE:-NON TROUVÉ}"
    echo "   Après: ${AFTER_FILE:-NON TROUVÉ}"
    echo ""
    echo "💡 Lancez d'abord:"
    echo "   ./scripts/benchmark-all-backoffice.sh before"
    echo "   ./scripts/benchmark-all-backoffice.sh after"
    exit 1
fi

echo "📁 Fichiers analysés:"
echo "   Avant: $(basename $BEFORE_FILE)"
echo "   Après: $(basename $AFTER_FILE)"
echo ""

# Utiliser Python pour l'analyse détaillée
python3 << 'PYTHON_SCRIPT'
import json
import sys
import os

results_dir = "tests/performance-benchmark"

# Trouver les fichiers
before_files = sorted([f for f in os.listdir(results_dir) if f.startswith("before_all_backoffice_")], reverse=True)
after_files = sorted([f for f in os.listdir(results_dir) if f.startswith("after_all_backoffice_")], reverse=True)

if not before_files or not after_files:
    print("❌ Fichiers non trouvés")
    sys.exit(1)

before_path = os.path.join(results_dir, before_files[0])
after_path = os.path.join(results_dir, after_files[0])

with open(before_path) as f:
    before_data = json.load(f)

with open(after_path) as f:
    after_data = json.load(f)

# Créer des dictionnaires
before_dict = {}
for item in before_data.get("pages", []):
    key = item.get("page") or item.get("endpoint")
    before_dict[key] = item

after_dict = {}
for item in after_data.get("pages", []):
    key = item.get("page") or item.get("endpoint")
    after_dict[key] = item

print("╔════════════════════════════════════════════════════════╗")
print("║        📊 RÉSULTATS DE COMPARAISON COMPLETS          ║")
print("╚════════════════════════════════════════════════════════╝")
print("")

# Séparer pages et endpoints
pages = []
endpoints = []

for key in set(before_dict.keys()) | set(after_dict.keys()):
    if key.startswith("api_") or "API" in str(before_dict.get(key, {}).get("url", "")):
        endpoints.append(key)
    else:
        pages.append(key)

# Analyser les pages frontend
print("🌐 PAGES FRONTEND:")
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print(f"{'Page':<40} {'Avant':<12} {'Après':<12} {'Diff':<12} {'Amélioration':<20}")
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

page_improvements = []
for page in sorted(pages):
    before_item = before_dict.get(page)
    after_item = after_dict.get(page)
    
    if not before_item or not after_item:
        continue
    
    # ✅ OPTIMISATION : Utiliser la moyenne si disponible, sinon time_total
    before_time = before_item.get("time_total", 0)
    after_time = after_item.get("time_total", 0)
    
    # Si on a plusieurs mesures, utiliser la médiane pour plus de précision
    if "time_median" in before_item and before_item["time_median"]:
        before_time = before_item["time_median"]
    if "time_median" in after_item and after_item["time_median"]:
        after_time = after_item["time_median"]
    
    if before_time == 0:
        continue
    
    diff = after_time - before_time
    percent = (diff / before_time) * 100 if before_time > 0 else 0
    
    improvement = ""
    if percent < -5:
        improvement = f"✅ {abs(percent):.1f}% plus rapide"
        page_improvements.append((page, percent, before_time, after_time))
    elif percent > 5:
        improvement = f"❌ {percent:.1f}% plus lent"
    else:
        improvement = "➡️  Similaire"
    
    # Tronquer le nom si trop long
    display_name = page[:37] + "..." if len(page) > 40 else page
    print(f"{display_name:<40} {before_time:<12.6f} {after_time:<12.6f} {diff:+.6f}     {improvement}")

print("")
print("📡 ENDPOINTS API:")
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print(f"{'Endpoint':<40} {'Avant':<12} {'Après':<12} {'Diff':<12} {'Amélioration':<20}")
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

api_improvements = []
for endpoint in sorted(endpoints):
    before_item = before_dict.get(endpoint)
    after_item = after_dict.get(endpoint)
    
    if not before_item or not after_item:
        continue
    
    # ✅ OPTIMISATION : Utiliser la moyenne si disponible, sinon time_total
    before_time = before_item.get("time_total", 0)
    after_time = after_item.get("time_total", 0)
    
    # Si on a plusieurs mesures, utiliser la médiane pour plus de précision
    if "time_median" in before_item and before_item["time_median"]:
        before_time = before_item["time_median"]
    if "time_median" in after_item and after_item["time_median"]:
        after_time = after_item["time_median"]
    
    if before_time == 0:
        continue
    
    diff = after_time - before_time
    percent = (diff / before_time) * 100 if before_time > 0 else 0
    
    improvement = ""
    if percent < -5:
        improvement = f"✅ {abs(percent):.1f}% plus rapide"
        api_improvements.append((endpoint, percent, before_time, after_time))
    elif percent > 5:
        improvement = f"❌ {percent:.1f}% plus lent"
    else:
        improvement = "➡️  Similaire"
    
    display_name = endpoint[:37] + "..." if len(endpoint) > 40 else endpoint
    print(f"{display_name:<40} {before_time:<12.6f} {after_time:<12.6f} {diff:+.6f}     {improvement}")

print("")
print("📊 STATISTIQUES GLOBALES:")
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

# Calculer les moyennes
page_times_before = [before_dict.get(p).get("time_total", 0) for p in pages if before_dict.get(p) and before_dict.get(p).get("time_total", 0) > 0]
page_times_after = [after_dict.get(p).get("time_total", 0) for p in pages if after_dict.get(p) and after_dict.get(p).get("time_total", 0) > 0]

api_times_before = [before_dict.get(e).get("time_total", 0) for e in endpoints if before_dict.get(e) and before_dict.get(e).get("time_total", 0) > 0]
api_times_after = [after_dict.get(e).get("time_total", 0) for e in endpoints if after_dict.get(e) and after_dict.get(e).get("time_total", 0) > 0]

if page_times_before and page_times_after:
    # ✅ OPTIMISATION : Utiliser la médiane pour chaque page
    page_times_before_median = [before_dict.get(p).get("time_median") or before_dict.get(p).get("time_total", 0) for p in pages if before_dict.get(p) and (before_dict.get(p).get("time_median") or before_dict.get(p).get("time_total", 0)) > 0]
    page_times_after_median = [after_dict.get(p).get("time_median") or after_dict.get(p).get("time_total", 0) for p in pages if after_dict.get(p) and (after_dict.get(p).get("time_median") or after_dict.get(p).get("time_total", 0)) > 0]
    
    page_avg_before = sum(page_times_before_median) / len(page_times_before_median) if page_times_before_median else 0
    page_avg_after = sum(page_times_after_median) / len(page_times_after_median) if page_times_after_median else 0
    page_improvement = ((page_avg_before - page_avg_after) / page_avg_before) * 100 if page_avg_before > 0 else 0
    
    print(f"Moyenne pages frontend:")
    print(f"  Avant: {page_avg_before:.6f}s")
    print(f"  Après: {page_avg_after:.6f}s")
    print(f"  Amélioration: {page_improvement:+.2f}%")
    if page_improvement > 5:
        print("  ✅ Amélioration significative !")
    elif page_improvement < -5:
        print("  ⚠️  Dégradation détectée")
    else:
        print("  ➡️  Performance similaire")

if api_times_before and api_times_after:
    # ✅ OPTIMISATION : Utiliser la médiane pour chaque endpoint
    api_times_before_median = [before_dict.get(e).get("time_median") or before_dict.get(e).get("time_total", 0) for e in endpoints if before_dict.get(e) and (before_dict.get(e).get("time_median") or before_dict.get(e).get("time_total", 0)) > 0]
    api_times_after_median = [after_dict.get(e).get("time_median") or after_dict.get(e).get("time_total", 0) for e in endpoints if after_dict.get(e) and (after_dict.get(e).get("time_median") or after_dict.get(e).get("time_total", 0)) > 0]
    
    api_avg_before = sum(api_times_before_median) / len(api_times_before_median) if api_times_before_median else 0
    api_avg_after = sum(api_times_after_median) / len(api_times_after_median) if api_times_after_median else 0
    api_improvement = ((api_avg_before - api_avg_after) / api_avg_before) * 100 if api_avg_before > 0 else 0
    
    print(f"\nMoyenne endpoints API:")
    print(f"  Avant: {api_avg_before:.6f}s")
    print(f"  Après: {api_avg_after:.6f}s")
    print(f"  Amélioration: {api_improvement:+.2f}%")
    if api_improvement > 5:
        print("  ✅ Amélioration significative !")
    elif api_improvement < -5:
        print("  ⚠️  Dégradation détectée")
    else:
        print("  ➡️  Performance similaire")

print("")
print("🏆 TOP 10 DES AMÉLIORATIONS:")
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

all_improvements = page_improvements + api_improvements
all_improvements.sort(key=lambda x: x[1])  # Trier par amélioration (plus négatif = meilleur)

for i, (name, improvement, before_time, after_time) in enumerate(all_improvements[:10], 1):
    display_name = name[:35] + "..." if len(name) > 38 else name
    print(f"{i:2}. {display_name:<38} {abs(improvement):>6.1f}% plus rapide ({before_time:.6f}s → {after_time:.6f}s)")

print("")
print("✅ Comparaison terminée !")

PYTHON_SCRIPT

