#!/bin/bash

# Script pour comparer deux rapports de performance
# Usage: ./compare-performance.sh <rapport1.json> <rapport2.json>

REPORT1="$1"
REPORT2="$2"

if [ -z "$REPORT1" ] || [ -z "$REPORT2" ]; then
  echo "Usage: $0 <rapport1.json> <rapport2.json>"
  echo ""
  echo "Exemple:"
  echo "  $0 performance_20251218_180740.json performance_20251218_182117.json"
  exit 1
fi

if [ ! -f "$REPORT1" ] || [ ! -f "$REPORT2" ]; then
  echo "❌ Erreur: Un ou plusieurs fichiers n'existent pas"
  exit 1
fi

echo "📊 Comparaison des rapports de performance"
echo "=========================================="
echo ""
echo "📄 Rapport 1: $REPORT1"
echo "📄 Rapport 2: $REPORT2"
echo ""

# Extraire les valeurs avec Python si disponible, sinon avec awk/sed
if command -v python3 &> /dev/null; then
  python3 << EOF
import json
import sys

with open("$REPORT1", "r") as f:
    before = json.load(f)

with open("$REPORT2", "r") as f:
    after = json.load(f)

print("🔍 COMPARAISON DÉTAILLÉE")
print("=" * 50)
print()

# Bundles
print("📦 BUNDLES:")
print(f"  JS:     {before['bundles']['js_mb']:.2f} MB → {after['bundles']['js_mb']:.2f} MB (diff: {after['bundles']['js_mb'] - before['bundles']['js_mb']:+.2f} MB)")
print(f"  CSS:    {before['bundles']['css_mb']:.2f} MB → {after['bundles']['css_mb']:.2f} MB (diff: {after['bundles']['css_mb'] - before['bundles']['css_mb']:+.2f} MB)")
print(f"  Images: {before['bundles']['images_mb']:.2f} MB → {after['bundles']['images_mb']:.2f} MB (diff: {after['bundles']['images_mb'] - before['bundles']['images_mb']:+.2f} MB)")
print(f"  Total:  {before['bundles']['total_mb']:.2f} MB → {after['bundles']['total_mb']:.2f} MB (diff: {after['bundles']['total_mb'] - before['bundles']['total_mb']:+.2f} MB)")
print()

# Imports
print("📥 IMPORTS:")
print(f"  Recharts: {before['imports']['recharts']} → {after['imports']['recharts']} (diff: {after['imports']['recharts'] - before['imports']['recharts']:+d})")
print(f"  Lucide:   {before['imports']['lucide']} → {after['imports']['lucide']} (diff: {after['imports']['lucide'] - before['imports']['lucide']:+d})")
print(f"  Axios:    {before['imports']['axios']} → {after['imports']['axios']} (diff: {after['imports']['axios'] - before['imports']['axios']:+d})")
print()

# Runtime
print("💾 RUNTIME:")
print(f"  Initial:    {before['runtime']['initial_mb']:.2f} MB → {after['runtime']['initial_mb']:.2f} MB (diff: {after['runtime']['initial_mb'] - before['runtime']['initial_mb']:+.2f} MB)")
print(f"  Après 30s:  {before['runtime']['after_30s_mb']:.2f} MB → {after['runtime']['after_30s_mb']:.2f} MB (diff: {after['runtime']['after_30s_mb'] - before['runtime']['after_30s_mb']:+.2f} MB)")
print(f"  Croissance: {before['runtime']['growth_mb']:.2f} MB → {after['runtime']['growth_mb']:.2f} MB (diff: {after['runtime']['growth_mb'] - before['runtime']['growth_mb']:+.2f} MB)")
print()

# Dependencies
print("📚 DÉPENDANCES:")
print(f"  Nombre: {before['dependencies']['deps_count']} → {after['dependencies']['deps_count']} (diff: {after['dependencies']['deps_count'] - before['dependencies']['deps_count']:+d})")
print(f"  Taille: {before['dependencies']['node_modules_mb']:.2f} MB → {after['dependencies']['node_modules_mb']:.2f} MB (diff: {after['dependencies']['node_modules_mb'] - before['dependencies']['node_modules_mb']:+.2f} MB)")
print()

# Résumé
total_before = before['bundles']['total_mb'] + before['runtime']['initial_mb']
total_after = after['bundles']['total_mb'] + after['runtime']['initial_mb']
diff = total_after - total_before
percent = (diff / total_before * 100) if total_before > 0 else 0

print("📊 RÉSUMÉ:")
print(f"  Total avant: {total_before:.2f} MB")
print(f"  Total après: {total_after:.2f} MB")
print(f"  Différence: {diff:+.2f} MB ({percent:+.1f}%)")
print()

if diff < 0:
    print("✅ AMÉLIORATION: Réduction de la consommation mémoire")
elif diff > 0:
    print("⚠️  DÉGRADATION: Augmentation de la consommation mémoire")
else:
    print("➡️  STABLE: Aucun changement significatif")
EOF
else
  echo "⚠️  Python3 n'est pas disponible. Installation recommandée pour une comparaison détaillée."
  echo ""
  echo "Comparaison basique avec grep:"
  echo ""
  echo "Bundles JS:"
  grep -o '"js_mb":[0-9.]*' "$REPORT1" "$REPORT2" | head -2
  echo ""
  echo "Imports Lucide:"
  grep -o '"lucide":[0-9]*' "$REPORT1" "$REPORT2" | head -2
fi

