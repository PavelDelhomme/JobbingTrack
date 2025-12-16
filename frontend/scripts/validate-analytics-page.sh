#!/bin/bash

# Script de validation automatique de la page Analytics
# Détecte les problèmes courants avant qu'ils n'apparaissent en production
# S'exécute dans le conteneur Docker

set -e

# Vérifier si on est dans un conteneur Docker ou sur la machine hôte
if [ -f /.dockerenv ] || [ -n "$DOCKER_CONTAINER" ]; then
  # On est dans le conteneur, exécuter directement
  FRONTEND_DIR="/app"
  cd "$FRONTEND_DIR"
else
  # On est sur la machine hôte, exécuter dans le conteneur
  CONTAINER_NAME="jobbingtrack-frontend"
  if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "❌ Le conteneur ${CONTAINER_NAME} n'est pas démarré."
    echo "💡 Lancez 'make up-full' ou 'make start' d'abord."
    exit 1
  fi
  echo "🔍 Exécution dans le conteneur ${CONTAINER_NAME}..."
  docker exec -w /app "$CONTAINER_NAME" bash scripts/validate-analytics-page.sh
  exit $?
fi

echo "🔍 Validation de la page Analytics..."
echo ""

ERRORS=0
WARNINGS=0

# Définir le chemin du fichier page.tsx
PAGE_FILE="${FRONTEND_DIR}/src/app/(admin)/backoffice/analytics/page.tsx"
if [ ! -f "$PAGE_FILE" ]; then
  # Essayer avec le chemin relatif
  PAGE_FILE="src/app/(admin)/backoffice/analytics/page.tsx"
fi

# 1. Vérifier que timeRange est passé à tous les composants Tab
echo "📋 Vérification des props timeRange..."
if grep -r "OverviewTab\|SystemTab\|PerformanceTab\|NetworkTab" "$PAGE_FILE" 2>/dev/null | grep -v "timeRange" | grep -q "Tab"; then
  echo "  ❌ ERREUR: timeRange manquant dans certains composants Tab"
  ERRORS=$((ERRORS + 1))
else
  echo "  ✅ timeRange présent dans tous les composants Tab"
fi

# 2. Vérifier que useCallback est utilisé pour handleTimeRangeChange
echo "📋 Vérification de useCallback..."
if ! grep -q "useCallback.*handleTimeRangeChange" "$PAGE_FILE" 2>/dev/null; then
  echo "  ⚠️  WARNING: handleTimeRangeChange n'utilise pas useCallback"
  WARNINGS=$((WARNINGS + 1))
else
  echo "  ✅ useCallback utilisé pour handleTimeRangeChange"
fi

# 3. Vérifier que useMemo est utilisé pour timeRangeMs
echo "📋 Vérification de useMemo..."
if ! grep -q "useMemo.*timeRangeMs" "$PAGE_FILE" 2>/dev/null; then
  echo "  ⚠️  WARNING: timeRangeMs n'utilise pas useMemo"
  WARNINGS=$((WARNINGS + 1))
else
  echo "  ✅ useMemo utilisé pour timeRangeMs"
fi

# 4. Vérifier qu'il n'y a pas de références directes à timeRange dans tickFormatter
echo "📋 Vérification des références timeRange..."
if grep -q "tickFormatter.*timeRange" "$PAGE_FILE" 2>/dev/null && ! grep -q "timeRange.*=" "$PAGE_FILE" 2>/dev/null | head -1; then
  echo "  ⚠️  WARNING: Vérifiez que timeRange est bien passé en prop"
  WARNINGS=$((WARNINGS + 1))
else
  echo "  ✅ Références timeRange correctes"
fi

# 5. Vérifier que les composants Tab sont mémorisés
echo "📋 Vérification de la mémorisation..."
if ! grep -q "memo.*OverviewTab\|memo.*SystemTab\|memo.*PerformanceTab\|memo.*NetworkTab" "$PAGE_FILE" 2>/dev/null; then
  echo "  ⚠️  WARNING: Les composants Tab ne sont pas mémorisés"
  WARNINGS=$((WARNINGS + 1))
else
  echo "  ✅ Composants Tab mémorisés"
fi

# 6. Vérifier qu'il n'y a pas d'erreurs TypeScript
echo "📋 Vérification TypeScript..."
if npm run type-check 2>&1 | grep -q "error TS"; then
  echo "  ❌ ERREUR: Erreurs TypeScript détectées"
  npm run type-check 2>&1 | grep "error TS" | head -5
  ERRORS=$((ERRORS + 1))
else
  echo "  ✅ Aucune erreur TypeScript"
fi

# 7. Vérifier qu'il n'y a pas d'erreurs de lint
echo "📋 Vérification ESLint..."
if npm run lint 2>&1 | grep -q "error\|Error"; then
  echo "  ⚠️  WARNING: Erreurs ESLint détectées"
  npm run lint 2>&1 | grep "error\|Error" | head -5
  WARNINGS=$((WARNINGS + 1))
else
  echo "  ✅ Aucune erreur ESLint"
fi

echo ""
echo "=========================================="
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo "✅ Validation réussie ! Aucun problème détecté."
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo "⚠️  Validation réussie avec $WARNINGS avertissement(s)"
  exit 0
else
  echo "❌ Validation échouée : $ERRORS erreur(s), $WARNINGS avertissement(s)"
  exit 1
fi

