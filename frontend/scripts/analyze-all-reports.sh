#!/bin/bash

# Script pour analyser tous les rapports de performance et générer un résumé complet
# Usage: ./analyze-all-reports.sh

REPORT_DIR="frontend/performance-reports"
REPORTS=$(find "$REPORT_DIR" -name "performance_*.json" -type f | sort)

if [ -z "$REPORTS" ]; then
  echo "❌ Aucun rapport trouvé dans $REPORT_DIR"
  exit 1
fi

echo "📊 ANALYSE COMPLÈTE DE TOUS LES RAPPORTS DE PERFORMANCE"
echo "========================================================"
echo ""

FIRST_REPORT=""
LAST_REPORT=""
TOTAL_REPORTS=0

for REPORT in $REPORTS; do
  TOTAL_REPORTS=$((TOTAL_REPORTS + 1))
  if [ -z "$FIRST_REPORT" ]; then
    FIRST_REPORT="$REPORT"
  fi
  LAST_REPORT="$REPORT"
done

echo "📈 ÉVOLUTION DES IMPORTS"
echo "------------------------"
echo ""

if command -v python3 &> /dev/null; then
  python3 << EOF
import json
import os
import glob

report_dir = "$REPORT_DIR"
reports = sorted(glob.glob(os.path.join(report_dir, "performance_*.json")))

if not reports:
    print("❌ Aucun rapport trouvé")
    exit(1)

print(f"{'Rapport':<50} {'Lucide':<10} {'Recharts':<10} {'Axios':<10} {'Évolution':<15}")
print("=" * 95)

first_lucide = None
prev_lucide = None

for report in reports:
    try:
        with open(report, 'r') as f:
            data = json.load(f)
        
        timestamp = os.path.basename(report).replace('performance_', '').replace('.json', '')
        lucide = data.get('imports', {}).get('lucide', 0)
        recharts = data.get('imports', {}).get('recharts', 0)
        axios = data.get('imports', {}).get('axios', 0)
        
        if first_lucide is None:
            first_lucide = lucide
            evolution = "🔵 Baseline"
        elif prev_lucide is not None:
            diff = lucide - prev_lucide
            if diff < 0:
                evolution = f"✅ -{abs(diff)} ({diff/first_lucide*100:.1f}%)"
            elif diff > 0:
                evolution = f"⚠️  +{diff} (+{diff/first_lucide*100:.1f}%)"
            else:
                evolution = "➡️  Stable"
        else:
            evolution = ""
        
        print(f"{timestamp:<50} {lucide:<10} {recharts:<10} {axios:<10} {evolution:<15}")
        
        prev_lucide = lucide
    except Exception as e:
        print(f"❌ Erreur lecture {report}: {e}")

print("")
print("=" * 95)

# Comparaison premier vs dernier
if len(reports) > 1:
    with open(reports[0], 'r') as f:
        first_data = json.load(f)
    with open(reports[-1], 'r') as f:
        last_data = json.load(f)
    
    first_lucide = first_data.get('imports', {}).get('lucide', 0)
    last_lucide = last_data.get('imports', {}).get('lucide', 0)
    
    reduction = first_lucide - last_lucide
    percent = (reduction / first_lucide * 100) if first_lucide > 0 else 0
    
    print(f"\n📊 RÉSUMÉ GLOBAL")
    print(f"   Premier rapport: {first_lucide} imports Lucide")
    print(f"   Dernier rapport:  {last_lucide} imports Lucide")
    print(f"   Réduction totale: -{reduction} imports ({percent:.1f}%)")
    
    if percent > 10:
        print(f"   ✅ Excellent gain de performance !")
    elif percent > 5:
        print(f"   ✅ Bon gain de performance")
    elif percent > 0:
        print(f"   ✅ Gain de performance modeste")
    else:
        print(f"   ⚠️  Aucun gain mesuré")

EOF
else
  echo "⚠️  Python3 n'est pas disponible. Installation recommandée pour une analyse détaillée."
fi

echo ""
echo "📊 ANALYSE DES RAPPORTS RUNTIME"
echo "-------------------------------"
echo ""

RUNTIME_REPORTS=$(find "$REPORT_DIR" -name "runtime_*.json" -type f | sort)

if [ -n "$RUNTIME_REPORTS" ]; then
  echo "Rapports de mémoire runtime disponibles:"
  for RUNTIME in $RUNTIME_REPORTS; do
    echo "  • $(basename $RUNTIME)"
    if command -v python3 &> /dev/null; then
      python3 -c "import json; d=json.load(open('$RUNTIME')); print(f\"    Initial: {d.get('initial_mb', 0)} MB, Après 30s: {d.get('after_30s_mb', 0)} MB, Croissance: {d.get('growth_mb', 0)} MB\")" 2>/dev/null || echo "    (Données non disponibles)"
    else
      cat "$RUNTIME"
    fi
  done
else
  echo "  ⚠️  Aucun rapport runtime disponible"
  echo "  💡 Pour générer des rapports runtime, exécutez: make test-performance-frontend"
  echo "     et répondez 'o' à la question sur le test de mémoire runtime"
fi

echo ""
echo "✅ Analyse terminée !"

