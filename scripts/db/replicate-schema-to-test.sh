#!/usr/bin/env bash
# Réplique le schéma (sans données) de la base principale vers la base de test.
# Utilisé par: make db-replicate-schema-to-test
# Prérequis: make up-full (postgres principal) et make up-test (postgres-test) ou postgres-test déjà démarré.
#
# Ce script permet d'avoir une base de test avec la même structure que la principale,
# sans y copier les données. Les tests peuvent ensuite cibler cette base pour ne pas
# polluer la base principale.

set -e
ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$ROOT_DIR"

MAIN_CONTAINER="${MAIN_POSTGRES_CONTAINER:-jobbingtrack-postgres}"
TEST_CONTAINER="${TEST_POSTGRES_CONTAINER:-jobbingtrack-postgres-test}"
DB_USER="${POSTGRES_USER:-jobbingtrack}"
DB_NAME="${POSTGRES_DB:-jobbingtrack}"
SCHEMA_DUMP="/tmp/jobbingtrack_schema_replicate_$$.sql"

echo "[db-replicate-schema] Réplication schéma principal → base de test"
echo ""

# Vérifier que le conteneur principal est démarré
if ! docker ps --format '{{.Names}}' | grep -q "^${MAIN_CONTAINER}$"; then
  echo "❌ Conteneur principal ${MAIN_CONTAINER} non démarré."
  echo "   Lancez: make up-full"
  exit 1
fi

# Vérifier que le conteneur de test est démarré
if ! docker ps --format '{{.Names}}' | grep -q "^${TEST_CONTAINER}$"; then
  echo "❌ Conteneur de test ${TEST_CONTAINER} non démarré."
  echo "   Lancez: make up-test"
  exit 1
fi

echo "1️⃣  Dump du schéma (sans données) depuis ${MAIN_CONTAINER}..."
docker exec "${MAIN_CONTAINER}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" \
  --schema-only \
  --no-owner \
  --no-privileges \
  > "${SCHEMA_DUMP}" 2>/dev/null || {
  echo "❌ Échec du dump depuis ${MAIN_CONTAINER}"
  rm -f "${SCHEMA_DUMP}"
  exit 1
}

echo "2️⃣  Vidage du schéma public sur la base de test..."
docker exec -i "${TEST_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "
  DROP SCHEMA IF EXISTS public CASCADE;
  CREATE SCHEMA public;
  GRANT ALL ON SCHEMA public TO ${DB_USER};
  GRANT ALL ON SCHEMA public TO public;
" 2>/dev/null || true

echo "3️⃣  Restauration du schéma dans ${TEST_CONTAINER}..."
if ! docker exec -i "${TEST_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" < "${SCHEMA_DUMP}" 2>/dev/null; then
  echo "⚠️  Restauration avec avertissements (enums/types déjà présents possibles)"
fi

rm -f "${SCHEMA_DUMP}"
echo ""
echo "✅ Schéma répliqué vers la base de test."
echo "   Pour utiliser cette base dans les tests, pointez DATABASE_URL vers:"
echo "   postgresql://${DB_USER}:jobbingtrack123@localhost:5434/${DB_NAME}?schema=public"
echo "   (ou postgres-test:5432 depuis un conteneur du même réseau)"
echo ""
