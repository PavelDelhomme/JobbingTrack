#!/bin/bash
# Script de débogage pour voir quelles tables existent réellement

echo "=== Tables existantes dans la base de données ==="
docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" 2>&1

echo ""
echo "=== Test de la requête du script ==="
TABLES_TO_CHECK="'user','company','application','contact','followup','call','interview','event'"
RESULT=$(docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -t -A -c "SELECT LOWER(table_name) FROM information_schema.tables WHERE table_schema = 'public' AND LOWER(table_name) IN (${TABLES_TO_CHECK});" 2>&1)
echo "Résultat de la requête:"
echo "$RESULT"
echo ""
echo "Nombre de lignes: $(echo "$RESULT" | grep -v '^$' | wc -l)"

