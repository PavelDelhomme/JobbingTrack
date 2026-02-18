#!/bin/bash
# Test simple pour voir ce qui se passe

echo "Test 1: Vérification connexion PostgreSQL"
docker exec jobbingtrack-postgres pg_isready -U jobbingtrack 2>&1
echo ""

echo "Test 2: Liste des tables"
docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename LIMIT 10;" 2>&1
echo ""

echo "Test 3: Vérification table 'user'"
RESULT=$(docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -t -A -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND LOWER(tablename) = 'user';" 2>&1 | tr -d ' \n\r')
echo "Résultat brut: '$RESULT'"
echo "Longueur: ${#RESULT}"
if [ "$RESULT" = "1" ]; then
  echo "✅ Table 'user' trouvée"
else
  echo "❌ Table 'user' non trouvée (count=$RESULT)"
fi

