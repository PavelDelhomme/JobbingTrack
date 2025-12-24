#!/bin/bash

# ============================================================================
# Script de Génération de Données de Test sur 24h
# ============================================================================
# Génère 1440 points de données (1 par minute) sur les 24 dernières heures
# pour tester l'affichage du graphique CPU système avec compression
# ============================================================================

set -e

echo "🧪 Génération de données de test sur 48h pour le CPU système..."
echo ""

# Trouver le conteneur PostgreSQL
POSTGRES_CONTAINER=$(docker ps -q --filter "name=jobbingtrack-postgres")

if [ -z "$POSTGRES_CONTAINER" ]; then
    echo "❌ Conteneur PostgreSQL 'jobbingtrack-postgres' non trouvé. Assurez-vous qu'il est démarré."
    exit 1
fi

echo "📦 Conteneur PostgreSQL trouvé: jobbingtrack-postgres"
echo ""

# Exécuter le script SQL
echo "🔧 Génération des données..."
docker exec -i $POSTGRES_CONTAINER psql -U jobbingtrack -d jobbingtrack < "$(dirname "$0")/generate-24h-test-data.sql"

echo ""
echo "✅ Génération terminée ! Les données sont maintenant disponibles dans la base."
echo "💡 Vous pouvez maintenant tester le graphique CPU système avec ces données (48h disponibles)."
echo ""

