#!/bin/bash
# Script complet pour initialiser TOUTES les tables de la base de données
# Ce script évite les problèmes de tables manquantes

set -e

echo "🚀 Initialisation complète de la base de données"
echo "================================================"
echo ""

# 1. Créer les tables principales (SANS dashboard-service pour éviter les suppressions)
echo "📦 Étape 1 : Création des tables principales..."
SERVICES_MAIN=(
  "auth-service"
  "application-service"
  "company-service"
  "contact-service"
  "interview-service"
  "call-service"
  "followup-service"
  "event-service"
  "metrics-aggregator"
  "security-service"
)

PUSHED=0
FAILED=0

for service in "${SERVICES_MAIN[@]}"; do
  CONTAINER="jobbingtrack-${service}"
  if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    if docker exec "${CONTAINER}" test -f /app/prisma/schema.prisma 2>/dev/null; then
      echo "  📦 ${service}..."
      if docker exec -w /app "${CONTAINER}" npx prisma db push --accept-data-loss --skip-generate > /dev/null 2>&1; then
        echo "    ✅ ${service} - Tables créées"
        PUSHED=$((PUSHED + 1))
      else
        echo "    ❌ ${service} - Erreur"
        FAILED=$((FAILED + 1))
      fi
    else
      echo "    ⏭️  ${service} - Pas de Prisma"
    fi
  else
    echo "    ⚠️  ${service} - Conteneur non démarré"
  fi
done

echo ""
echo "📊 Vérification des tables principales..."
MAIN_TABLES=$(docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('Company', 'Application', 'User', 'Contact', 'Interview', 'Call', 'FollowUp', 'Event');")
echo "  Tables principales créées : ${MAIN_TABLES}"

# 2. Créer les tables analytics (manuellement pour éviter les conflits)
echo ""
echo "📦 Étape 2 : Création des tables analytics..."
if [ -f "./scripts/db/setup-analytics-tables.sh" ]; then
  ./scripts/db/setup-analytics-tables.sh > /dev/null 2>&1
  echo "  ✅ Tables analytics créées"
else
  echo "  ⚠️  Script setup-analytics-tables.sh non trouvé"
fi

# 3. Vérification finale
echo ""
echo "📊 Vérification finale..."
TOTAL=$(docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
ANALYTICS=$(docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND (table_name LIKE 'user_%' OR table_name LIKE 'device_%');")

echo "  Total de tables : ${TOTAL}"
echo "  Tables analytics : ${ANALYTICS}"

# 4. Génération des Prisma Clients
echo ""
echo "🔄 Génération des Prisma Clients..."
for service in "${SERVICES_MAIN[@]}"; do
  CONTAINER="jobbingtrack-${service}"
  if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    if docker exec "${CONTAINER}" test -f /app/prisma/schema.prisma 2>/dev/null; then
      docker exec -w /app "${CONTAINER}" npx prisma generate > /dev/null 2>&1 && echo "  ✅ ${service} - Prisma Client généré" || echo "  ⚠️  ${service} - Erreur génération"
    fi
  fi
done

# Dashboard service séparément
if docker ps --format '{{.Names}}' | grep -q "^jobbingtrack-dashboard-service$"; then
  if docker exec jobbingtrack-dashboard-service test -f /app/prisma/schema.prisma 2>/dev/null; then
    docker exec -w /app jobbingtrack-dashboard-service npx prisma generate > /dev/null 2>&1 && echo "  ✅ dashboard-service - Prisma Client généré" || echo "  ⚠️  dashboard-service - Erreur génération"
  fi
fi

echo ""
echo "✅ Initialisation terminée !"
echo "   📦 Services synchronisés : ${PUSHED}"
echo "   ❌ Erreurs : ${FAILED}"
echo "   📊 Total de tables : ${TOTAL}"
echo ""
echo "💡 Pour redémarrer les services :"
echo "   docker-compose restart"

