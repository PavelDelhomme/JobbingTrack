#!/bin/bash
# Script pour créer TOUTES les tables dans le bon ordre
# Ce script évite que dashboard-service supprime les tables des autres services

set -e

echo "🔄 Création de TOUTES les tables..."
echo ""

# 1. Créer les tables principales (SANS dashboard-service)
echo "📦 Étape 1 : Tables principales..."
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

for service in "${SERVICES_MAIN[@]}"; do
  CONTAINER="jobbingtrack-${service}"
  if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    if docker exec "${CONTAINER}" test -f /app/prisma/schema.prisma 2>/dev/null; then
      echo "  📦 ${service}..."
      if docker exec -w /app "${CONTAINER}" npx prisma db push --accept-data-loss --skip-generate > /dev/null 2>&1; then
        echo "    ✅ ${service}"
      else
        echo "    ❌ ${service} - Erreur"
      fi
    fi
  fi
done

echo ""
echo "📊 Vérification des tables principales..."
docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('Company', 'Application', 'User', 'Contact', 'Interview') ORDER BY table_name;"

echo ""
echo "📦 Étape 2 : Tables analytics (création manuelle)..."
./scripts/db/setup-analytics-tables.sh > /dev/null 2>&1

echo ""
echo "📊 Vérification finale..."
TOTAL=$(docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo "  Total de tables : ${TOTAL}"

echo ""
echo "✅ Toutes les tables créées !"

