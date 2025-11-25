#!/bin/bash
# Script pour vérifier si les tables Prisma essentielles existent dans la base de données

# Couleurs pour l'affichage
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Tables essentielles à vérifier
ESSENTIAL_TABLES=(
  "User"
  "Company"
  "Application"
  "Contact"
  "FollowUp"
  "Call"
  "Interview"
  "Event"
  "Notification"
  "SecurityLog"
  "Deployment"
  "WorkflowExecution"
  "EmailLog"
  "EmailTemplate"
  "UserCustomization"
  "AggregatedLog"
  "SystemMetricsSnapshot"
  "ContainerLog"
)

# Vérifier si PostgreSQL est accessible
if ! docker exec jobbingtrack-postgres pg_isready -U postgres > /dev/null 2>&1; then
  echo -e "${RED}❌ PostgreSQL n'est pas accessible${NC}"
  exit 1
fi

# Récupérer la liste des tables existantes
EXISTING_TABLES=$(docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';" 2>/dev/null | tr -d ' ' | tr '\n' ' ')

if [ -z "$EXISTING_TABLES" ]; then
  echo -e "${RED}❌ Impossible de récupérer la liste des tables${NC}"
  exit 1
fi

# Vérifier chaque table essentielle
MISSING_TABLES=()
for table in "${ESSENTIAL_TABLES[@]}"; do
  # Convertir en minuscules pour la comparaison (PostgreSQL est case-insensitive pour les noms non quotés)
  table_lower=$(echo "$table" | tr '[:upper:]' '[:lower:]')
  if ! echo "$EXISTING_TABLES" | grep -qi "$table_lower"; then
    MISSING_TABLES+=("$table")
  fi
done

# Afficher le résultat
if [ ${#MISSING_TABLES[@]} -eq 0 ]; then
  echo -e "${GREEN}✅ Toutes les tables essentielles sont présentes${NC}"
  exit 0
else
  echo -e "${YELLOW}⚠️  Tables manquantes détectées :${NC}"
  for table in "${MISSING_TABLES[@]}"; do
    echo -e "   ${YELLOW}❌ $table${NC}"
  done
  echo ""
  echo -e "${YELLOW}💡 Solution : Exécutez 'make db-push-all' pour créer toutes les tables${NC}"
  exit 1
fi

