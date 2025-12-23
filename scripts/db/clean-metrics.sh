#!/bin/bash

# Script pour nettoyer toutes les métriques enregistrées dans PostgreSQL

set -e

echo "🧹 Nettoyage de toutes les métriques enregistrées..."
echo ""

# Vérifier si le conteneur postgres est en cours d'exécution
if ! docker ps | grep -q "jobbingtrack-postgres\|postgres.*jobbingtrack"; then
    echo "❌ Le conteneur PostgreSQL n'est pas en cours d'exécution"
    exit 1
fi

# Trouver le nom du conteneur postgres
POSTGRES_CONTAINER=$(docker ps --format "{{.Names}}" | grep -E "jobbingtrack-postgres|postgres.*jobbingtrack" | head -n1)

if [ -z "$POSTGRES_CONTAINER" ]; then
    echo "❌ Impossible de trouver le conteneur PostgreSQL"
    exit 1
fi

echo "📦 Conteneur PostgreSQL trouvé: $POSTGRES_CONTAINER"
echo ""

# Exécuter les commandes SQL de nettoyage
echo "🗑️  Suppression des métriques..."
docker exec -i "$POSTGRES_CONTAINER" psql -U jobbingtrack -d jobbingtrack << 'SQL'
-- Nettoyer les tables de monitoring-c (ordre important à cause des foreign keys)
DELETE FROM container_metrics;
DELETE FROM system_metrics;

-- Nettoyer les tables de log-collector-c
DELETE FROM container_logs;

-- Afficher le résultat
SELECT 
    'system_metrics' as table_name, 
    COUNT(*) as remaining_count 
FROM system_metrics
UNION ALL
SELECT 
    'container_metrics' as table_name, 
    COUNT(*) as remaining_count 
FROM container_metrics
UNION ALL
SELECT 
    'container_logs' as table_name, 
    COUNT(*) as remaining_count 
FROM container_logs;
SQL

echo ""
echo "✅ Nettoyage terminé ! Toutes les métriques ont été supprimées."
echo ""

