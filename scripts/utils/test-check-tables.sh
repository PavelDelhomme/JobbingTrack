#!/bin/bash
# Script de test pour déboguer check-prisma-tables.sh

echo "=== Test de détection des tables ==="
echo ""

# Récupérer la liste des tables
EXISTING_TABLES=$(docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -t -A -c "SELECT LOWER(tablename) FROM pg_tables WHERE schemaname = 'public';" 2>/dev/null)

echo "Tables trouvées dans la base de données:"
echo "$EXISTING_TABLES" | head -20
echo ""

# Tester quelques tables spécifiques
echo "=== Test de détection de tables spécifiques ==="
for table in "user" "company" "application" "contact" "followup" "call" "interview" "event"; do
  if echo "$EXISTING_TABLES" | grep -q "^${table}$"; then
    echo "✅ $table - TROUVÉE"
  else
    echo "❌ $table - MANQUANTE"
  fi
done

