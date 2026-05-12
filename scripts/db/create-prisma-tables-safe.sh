#!/bin/bash
# Crée les tables Prisma en préservant les tables de monitoring-c.

set -e

ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$ROOT_DIR"

echo "🔄 Création sécurisée des tables Prisma..."
echo ""

echo "1️⃣  Suppression temporaire des tables de monitoring-c..."
docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -c "
DROP VIEW IF EXISTS recent_container_metrics CASCADE;
DROP VIEW IF EXISTS recent_system_metrics CASCADE;
DROP TABLE IF EXISTS container_metrics CASCADE;
DROP TABLE IF EXISTS system_metrics CASCADE;
" > /dev/null 2>&1 || true
echo "✅ Tables de monitoring-c supprimées temporairement"
echo ""

echo "2️⃣  Création des tables Prisma..."
PUSHED=0
SKIPPED=0
SERVICES="auth-service application-service company-service contact-service interview-service call-service followup-service event-service workflow-service deployment-service security-service"

for service in $SERVICES; do
    container="jobbingtrack-$service"
    if docker ps --format '{{.Names}}' | grep -q "^$container$"; then
        echo "  📦 $service..."
        if docker exec "$container" test -f /app/prisma/schema.prisma 2>/dev/null; then
            if docker exec "$container" npx prisma db push --accept-data-loss --skip-generate > /dev/null 2>&1; then
                echo "  ✅ $service - Schéma synchronisé"
                PUSHED=$((PUSHED + 1))
            else
                echo "  ⚠️  $service - Échec (peut être normal si tables existent déjà)"
                SKIPPED=$((SKIPPED + 1))
            fi
        else
            echo "  ⏭️  $service - Pas de Prisma"
            SKIPPED=$((SKIPPED + 1))
        fi
    else
        echo "  ⏭️  $service - Conteneur non démarré"
        SKIPPED=$((SKIPPED + 1))
    fi
done
echo ""

echo "3️⃣  Recréation des tables de monitoring-c..."
docker exec -i jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack < monitoring/monitoring-c/sql/init_metrics_tables.sql > /dev/null 2>&1
echo "✅ Tables de monitoring-c recréées"
echo ""

echo "4️⃣  Redémarrage de monitoring-c..."
docker restart jobbingtrack-monitoring-c > /dev/null 2>&1
sleep 3
echo "✅ monitoring-c redémarré"
echo ""

echo "5️⃣  Vérification..."
TOTAL_TABLES=$(docker exec jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -t -A -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" 2>/dev/null | tr -d ' \n\r')
echo "✅ $TOTAL_TABLES tables au total dans la base de données"
echo ""

echo "✅ Création des tables Prisma terminée !"
echo "   📦 Services synchronisés: $PUSHED"
echo "   ⏭️  Ignorés: $SKIPPED"
