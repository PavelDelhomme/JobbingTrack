#!/bin/bash
# Script pour créer toutes les tables dans le bon ordre
# Ce script évite que dashboard-service supprime les tables des autres services

set -e

echo "🔄 Création de toutes les tables dans le bon ordre..."
echo ""

SERVICES=(
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
  "dashboard-service"
)

for service in "${SERVICES[@]}"; do
  CONTAINER="jobbingtrack-${service}"
  if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    if docker exec "${CONTAINER}" test -f /app/prisma/schema.prisma 2>/dev/null; then
      echo "📦 ${service}..."
      docker exec -w /app "${CONTAINER}" npx prisma db push --accept-data-loss --skip-generate > /dev/null 2>&1
      echo "  ✅ ${service} - Tables créées"
    fi
  fi
done

echo ""
echo "✅ Toutes les tables créées !"
echo ""
echo "📊 Vérification..."
docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c "SELECT COUNT(*) as total FROM information_schema.tables WHERE table_schema = 'public';"

