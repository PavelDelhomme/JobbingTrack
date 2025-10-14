#!/bin/bash

# Script pour attendre que PostgreSQL soit prêt
# Usage: ./scripts/wait-for-postgres.sh

set -e

echo "🔍 Vérification de PostgreSQL..."

MAX_ATTEMPTS=60
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    # Vérifier si PostgreSQL répond
    if docker-compose exec postgres psql -U jobbingtrack -d jobbingtrack -c "SELECT 1" > /dev/null 2>&1; then
        echo "✅ PostgreSQL est accessible"
        exit 0
    fi

    echo "⏳ PostgreSQL n'est pas encore prêt, tentative $((ATTEMPT + 1))/$MAX_ATTEMPTS..."
    sleep 2
    ATTEMPT=$((ATTEMPT + 1))
done

echo "❌ PostgreSQL n'est pas accessible après $MAX_ATTEMPTS tentatives"
exit 1
