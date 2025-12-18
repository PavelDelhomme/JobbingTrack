#!/bin/bash

# Script pour comparer tous les rapports de performance
# Usage: ./compare-all-performance.sh

REPORT_DIR="frontend/performance-reports"
REPORTS=$(find "$REPORT_DIR" -name "performance_*.json" -type f | sort)

if [ -z "$REPORTS" ]; then
  echo "❌ Aucun rapport trouvé dans $REPORT_DIR"
  exit 1
fi

echo "📊 COMPARAISON DE TOUS LES RAPPORTS DE PERFORMANCE"
echo "=================================================="
echo ""

FIRST_REPORT=""
LAST_REPORT=""
PREVIOUS_REPORT=""

for REPORT in $REPORTS; do
  if [ -z "$FIRST_REPORT" ]; then
    FIRST_REPORT="$REPORT"
  fi
  LAST_REPORT="$REPORT"
  
  TIMESTAMP=$(basename "$REPORT" | sed 's/performance_//; s/.json//')
  DATE=$(cat "$REPORT" | grep -o '"date":"[^"]*"' | cut -d'"' -f4 | head -1)
  
  if command -v python3 &> /dev/null; then
    LUCIDE=$(python3 -c "import json; print(json.load(open('$REPORT'))['imports']['lucide'])" 2>/dev/null || echo "N/A")
    RECHARTS=$(python3 -c "import json; print(json.load(open('$REPORT'))['imports']['recharts'])" 2>/dev/null || echo "N/A")
    AXIOS=$(python3 -c "import json; print(json.load(open('$REPORT'))['imports']['axios'])" 2>/dev/null || echo "N/A")
  else
    LUCIDE=$(grep -o '"lucide":[0-9]*' "$REPORT" | cut -d':' -f2 || echo "N/A")
    RECHARTS=$(grep -o '"recharts":[0-9]*' "$REPORT" | cut -d':' -f2 || echo "N/A")
    AXIOS=$(grep -o '"axios":[0-9]*' "$REPORT" | cut -d':' -f2 || echo "N/A")
  fi
  
  echo "📄 $(basename $REPORT)"
  echo "   Date: $DATE"
  echo "   Lucide: $LUCIDE | Recharts: $RECHARTS | Axios: $AXIOS"
  
  if [ -n "$PREVIOUS_REPORT" ]; then
    if command -v python3 &> /dev/null; then
      PREV_LUCIDE=$(python3 -c "import json; print(json.load(open('$PREVIOUS_REPORT'))['imports']['lucide'])" 2>/dev/null || echo "0")
      LUCIDE_DIFF=$((LUCIDE - PREV_LUCIDE))
      if [ "$LUCIDE_DIFF" -lt 0 ]; then
        echo "   ✅ Amélioration Lucide: -$((LUCIDE_DIFF * -1))"
      elif [ "$LUCIDE_DIFF" -gt 0 ]; then
        echo "   ⚠️  Dégradation Lucide: +$LUCIDE_DIFF"
      else
        echo "   ➡️  Stable"
      fi
    fi
  fi
  echo ""
  
  PREVIOUS_REPORT="$REPORT"
done

echo "=================================================="
echo "📊 COMPARAISON PREMIER vs DERNIER"
echo "=================================================="
echo ""

if [ -n "$FIRST_REPORT" ] && [ -n "$LAST_REPORT" ] && [ "$FIRST_REPORT" != "$LAST_REPORT" ]; then
  ./frontend/scripts/compare-performance.sh "$FIRST_REPORT" "$LAST_REPORT"
fi

