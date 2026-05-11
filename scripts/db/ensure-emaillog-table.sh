#!/usr/bin/env bash
# Crée ou synchronise les tables du schéma auth (dont EmailLog) pour que le test
# npm run test:inscription-gmail et l'Email Monitor voient les logs.
# À lancer depuis la racine du projet.
set -e
ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$ROOT_DIR"

echo "=== Vérification / création table EmailLog (auth-service) ==="
echo ""

if docker ps --format '{{.Names}}' | grep -q '^jobbingtrack-auth-service$'; then
  echo "Conteneur auth-service détecté. Prisma db push dans le conteneur..."
  echo "--- Sortie complète (sans troncature) ---"
  docker exec -w /app jobbingtrack-auth-service npx prisma db push --accept-data-loss 2>&1 || true
  echo "--- Fin ---"
  echo ""
  echo "Si aucune erreur ci-dessus, la table EmailLog existe. Relancez: cd tests && npm run test:inscription-gmail"
else
  echo "Conteneur auth-service non démarré. Prisma db push en local (backend/auth-service)..."
  echo "Assurez-vous que backend/auth-service/.env ou .env racine a le bon DATABASE_URL (même base que le service qui répond sur :5002)."
  echo "--- Sortie complète ---"
  if [ -f "$ROOT_DIR/.env" ]; then set -a && . "$ROOT_DIR/.env" && set +a; fi
  (cd "$ROOT_DIR/backend/auth-service" && npx prisma db push --accept-data-loss 2>&1) || true
  echo "--- Fin ---"
  echo ""
  echo "Si aucune erreur ci-dessus, relancez: cd tests && npm run test:inscription-gmail"
fi
