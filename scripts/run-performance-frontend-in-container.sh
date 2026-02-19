#!/bin/sh
# Test de performance frontend depuis le conteneur (sans make).
# Analyse la taille des bundles et répertoires depuis /app (frontend root).

FRONTEND_DIR="${PROJECT_ROOT:-/app}"
cd "$FRONTEND_DIR" 2>/dev/null || true

echo "================================================================"
echo "🔍 TEST DE PERFORMANCE FRONTEND (mode conteneur)"
echo "================================================================"
echo ""
echo "Répertoire: $FRONTEND_DIR"
echo ""

total=0
passed=0
failed=0

# Taille .next
if [ -d ".next" ]; then
  total=$((total + 1))
  passed=$((passed + 1))
  size=$(du -sk .next 2>/dev/null | awk '{print $1}')
  echo "  ✅ .next: $((size / 1024)) MB"
else
  total=$((total + 1))
  failed=$((failed + 1))
  echo "  ❌ .next: absent (build non effectué)"
fi

# Taille node_modules
if [ -d "node_modules" ]; then
  total=$((total + 1))
  passed=$((passed + 1))
  size=$(du -sk node_modules 2>/dev/null | awk '{print $1}')
  echo "  ✅ node_modules: $((size / 1024)) MB"
else
  total=$((total + 1))
  failed=$((failed + 1))
  echo "  ❌ node_modules: absent"
fi

# Health du serveur (si disponible)
if wget -q -O /dev/null http://localhost:3000/health 2>/dev/null || [ -n "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/health 2>/dev/null)" ]; then
  code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 http://localhost:3000/health 2>/dev/null || echo "000")
  total=$((total + 1))
  if [ "$code" = "200" ]; then
    passed=$((passed + 1))
    echo "  ✅ Frontend /health: HTTP $code"
  else
    failed=$((failed + 1))
    echo "  ❌ Frontend /health: HTTP $code"
  fi
fi

echo ""
echo "Total: $total tests"
echo "Tests réussis: $passed"
echo "Tests échoués: $failed"
echo ""
echo "Rapport généré depuis le conteneur."
echo "Pour une analyse complète (mémoire, bundles), exécutez depuis l'hôte: make test-performance-frontend"
